import { resolveChain } from "@/lib/models";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export interface ChatOptions {
  system: string;
  user: string;
  language: "en" | "ur";
  preferredModel?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  /** ms before a model is abandoned and the next in the chain is tried */
  timeoutMs?: number;
}

export interface Attempt {
  model: string;
  ok: boolean;
  status?: number;
  reason?: string;
  ms: number;
}

export class OpenRouterError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly attempts: Attempt[] = [],
    /** true when retrying other models cannot possibly help */
    readonly fatal = false,
    readonly hint?: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function headers() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set on the server.",
      undefined, [], true,
      "Add OPENROUTER_API_KEY in your host's environment variables (Vercel: Project → Settings → Environment Variables) and redeploy.",
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.SITE_NAME ?? "Sabaq AI",
  };
}

/**
 * Turn an OpenRouter failure into something a teacher can act on, and decide
 * whether trying the next model could possibly help.
 */
function classify(status: number, raw: string): { reason: string; fatal: boolean; hint?: string } {
  const body = raw.toLowerCase();

  if (status === 401) {
    return {
      reason: "the API key was rejected",
      fatal: true,
      hint: "Generate a fresh key at https://openrouter.ai/keys, then update OPENROUTER_API_KEY in your host's environment variables and redeploy.",
    };
  }
  if (status === 402) {
    return {
      reason: "the account is out of credits",
      fatal: true,
      hint: "Free models still need a funded-or-zero balance in good standing. Check https://openrouter.ai/credits.",
    };
  }
  // The single most common free-tier failure, and it looks like a dead model.
  if (body.includes("data policy") || body.includes("data_policy")) {
    return {
      reason: "blocked by your OpenRouter privacy settings",
      fatal: true,
      hint: "Free models require prompt logging to be allowed. Open https://openrouter.ai/settings/privacy and enable the free-model training/publication option, then try again.",
    };
  }
  if (status === 404) {
    return { reason: "this model no longer exists on OpenRouter", fatal: false };
  }
  if (status === 429) {
    return { reason: "rate limited right now", fatal: false };
  }
  if (status === 400 && (body.includes("response_format") || body.includes("json"))) {
    return { reason: "does not support forced JSON output", fatal: false };
  }
  if (status >= 500) {
    return { reason: `provider error (${status})`, fatal: false };
  }
  return { reason: `HTTP ${status}`, fatal: false };
}

function buildBody(o: ChatOptions, model: string, stream: boolean, forceJson: boolean) {
  return JSON.stringify({
    model,
    stream,
    temperature: o.temperature ?? 0.4,
    max_tokens: o.maxTokens ?? 8000,
    // Dropped on the retry: several free models 400 on this, and the tolerant
    // parser in lib/partial-json.ts copes without it.
    ...(forceJson ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
  });
}

function guard(timeoutMs: number, external?: AbortSignal) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(new Error("timeout")), timeoutMs);
  const onAbort = () => ctl.abort(external?.reason);
  if (external) {
    if (external.aborted) onAbort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: ctl.signal,
    done: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onAbort);
    },
  };
}

const summarise = (attempts: Attempt[]) =>
  attempts.map((a) => `${a.model.split("/").pop()}: ${a.reason ?? "failed"}`).join("; ");

/**
 * Stream a completion, failing over through the live model chain.
 * Yields `{ type: "model" }` first so the UI can name the model it got.
 */
export async function* streamChat(
  o: ChatOptions,
): AsyncGenerator<
  | { type: "model"; model: string }
  | { type: "delta"; text: string }
  | { type: "chain"; chain: string[]; source: string; note?: string }
> {
  const h = headers();
  const { chain, source, note } = await resolveChain(o.language, o.preferredModel, o.signal);
  yield { type: "chain", chain, source, note };

  const attempts: Attempt[] = [];

  for (const model of chain) {
    // Try with forced JSON, then once more without it if that is what broke.
    for (const forceJson of [true, false]) {
      const g = guard(o.timeoutMs ?? 90_000, o.signal);
      const t0 = Date.now();
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: h,
          body: buildBody(o, model, true, forceJson),
          signal: g.signal,
        });

        if (!res.ok || !res.body) {
          const raw = await res.text().catch(() => "");
          const { reason, fatal, hint } = classify(res.status, raw);
          g.done();
          const retryable = !forceJson || !reason.includes("forced JSON");
          if (retryable) attempts.push({ model, ok: false, status: res.status, reason, ms: Date.now() - t0 });
          if (fatal) throw new OpenRouterError(reason, res.status, attempts, true, hint);
          if (forceJson && reason.includes("forced JSON")) continue; // retry without it
          break; // next model
        }

        yield { type: "model", model };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let emitted = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              if (delta) {
                emitted += delta.length;
                yield { type: "delta", text: delta };
              }
            } catch {
              /* keep-alive comments and partial frames */
            }
          }
        }

        g.done();
        if (emitted > 0) return;
        attempts.push({ model, ok: false, reason: "returned an empty response", ms: Date.now() - t0 });
        break;
      } catch (err) {
        g.done();
        if (o.signal?.aborted) throw err;
        if (err instanceof OpenRouterError && err.fatal) throw err;
        attempts.push({
          model, ok: false, ms: Date.now() - t0,
          reason: err instanceof Error && err.message === "timeout" ? "timed out" : "could not be reached",
        });
        break;
      }
    }
  }

  throw new OpenRouterError(
    `No free model could complete the request. Tried ${attempts.length}: ${summarise(attempts)}`,
    undefined,
    attempts,
    false,
    source === "seed"
      ? "The live model list could not be read, so a fallback list was used. Check your server's outbound network access to openrouter.ai."
      : "Free models are shared and go busy. Wait a minute and try again, or pin a model with SABAQ_MODELS_EN in your environment.",
  );
}

/** Non-streaming completion, same failover. Used by the repair and edit passes. */
export async function chat(o: ChatOptions): Promise<{ text: string; model: string }> {
  const h = headers();
  const { chain, source } = await resolveChain(o.language, o.preferredModel, o.signal);
  const attempts: Attempt[] = [];

  for (const model of chain) {
    for (const forceJson of [true, false]) {
      const g = guard(o.timeoutMs ?? 90_000, o.signal);
      const t0 = Date.now();
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: h,
          body: buildBody(o, model, false, forceJson),
          signal: g.signal,
        });
        const raw = await res.text();
        g.done();

        if (!res.ok) {
          const { reason, fatal, hint } = classify(res.status, raw);
          attempts.push({ model, ok: false, status: res.status, reason, ms: Date.now() - t0 });
          if (fatal) throw new OpenRouterError(reason, res.status, attempts, true, hint);
          if (forceJson && reason.includes("forced JSON")) continue;
          break;
        }

        const text = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "";
        if (text.trim()) return { text, model };
        attempts.push({ model, ok: false, reason: "returned an empty message", ms: Date.now() - t0 });
        break;
      } catch (err) {
        g.done();
        if (o.signal?.aborted) throw err;
        if (err instanceof OpenRouterError && err.fatal) throw err;
        attempts.push({
          model, ok: false, ms: Date.now() - t0,
          reason: err instanceof Error && err.message === "timeout" ? "timed out" : "could not be reached",
        });
        break;
      }
    }
  }

  throw new OpenRouterError(
    `No free model could complete the request. Tried ${attempts.length}: ${summarise(attempts)}`,
    undefined, attempts, false,
    source === "seed" ? "The live model list could not be read; check outbound access to openrouter.ai." : undefined,
  );
}
