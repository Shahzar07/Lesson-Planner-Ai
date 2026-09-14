import { resolveChain } from "@/lib/models";

/** Overridable so a fake gateway can be pointed at in tests, or a proxy in prod. */
const BASE = (process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
const ENDPOINT = `${BASE}/chat/completions`;

export interface ChatOptions {
  system: string;
  user: string;
  language: "en" | "ur";
  preferredModel?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  /** ms to wait for the FIRST token before giving up on a model */
  ttftMs?: number;
  /** ms a single model may take in total */
  timeoutMs?: number;
  /** absolute epoch ms the whole request must finish by, across all models */
  deadline?: number;
  /** how many models to try before giving up */
  maxModels?: number;
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
    max_tokens: o.maxTokens ?? 5000,
    // Dropped on the retry: several free models 400 on this, and the tolerant
    // parser in lib/partial-json.ts copes without it.
    ...(forceJson ? { response_format: { type: "json_object" } } : {}),
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
  });
}

/**
 * Two clocks, because they catch different failures.
 *
 * A model that is cold or queued sends nothing at all — that is the common
 * free-tier failure, and waiting 90s for it burns the whole request budget.
 * So the first-token clock is short and aggressive. Once tokens are flowing
 * the model is alive and earns the longer overall clock.
 */
function guard(ttftMs: number, totalMs: number, external?: AbortSignal) {
  const ctl = new AbortController();
  let ttft: ReturnType<typeof setTimeout> | null = setTimeout(
    () => ctl.abort(new Error("ttft")), ttftMs,
  );
  const total = setTimeout(() => ctl.abort(new Error("timeout")), totalMs);
  const onAbort = () => ctl.abort(external?.reason);
  if (external) {
    if (external.aborted) onAbort();
    else external.addEventListener("abort", onAbort, { once: true });
  }
  return {
    signal: ctl.signal,
    /** call on the first delta: the model is alive, stop the short clock */
    alive: () => { if (ttft) { clearTimeout(ttft); ttft = null; } },
    done: () => {
      if (ttft) clearTimeout(ttft);
      clearTimeout(total);
      external?.removeEventListener("abort", onAbort);
    },
  };
}

/** Per-model slice of the remaining budget, so one slow model cannot eat it all. */
function budget(o: ChatOptions, modelsLeft: number) {
  const now = Date.now();
  const remaining = o.deadline ? Math.max(0, o.deadline - now) : Number.POSITIVE_INFINITY;
  const cap = o.timeoutMs ?? 45_000;
  const share = remaining === Number.POSITIVE_INFINITY
    ? cap
    : Math.max(6_000, Math.min(cap, Math.floor(remaining / Math.max(1, Math.min(modelsLeft, 2)))));
  return {
    totalMs: share,
    ttftMs: Math.max(6_000, Math.min(o.ttftMs ?? 20_000, share)),
    expired: remaining <= 1_500,
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
  const shortlist = chain.slice(0, o.maxModels ?? 4);

  for (let i = 0; i < shortlist.length; i++) {
    const model = shortlist[i];
    const b = budget(o, shortlist.length - i);
    if (b.expired) {
      attempts.push({ model, ok: false, reason: "ran out of time before trying", ms: 0 });
      break;
    }

    // Try with forced JSON, then once more without it if that is what broke.
    for (const forceJson of [true, false]) {
      const g = guard(b.ttftMs, b.totalMs, o.signal);
      const t0 = Date.now();
      let emitted = 0;
      let thought = 0;
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
          if (fatal) { g.done(); throw new OpenRouterError(reason, res.status, attempts, true, hint); }
          // A plain retry costs little and clears a whole class of provider
          // quirks: unsupported response_format, rejected extra params, a
          // transient 5xx. Only record the failure once both shapes have failed.
          if (forceJson) continue;
          attempts.push({ model, ok: false, status: res.status, reason, ms: Date.now() - t0 });
          break;
        }

        yield { type: "model", model };

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

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

              // OpenRouter can report a provider failure inside the stream.
              if (json?.error) {
                throw new OpenRouterError(
                  String(json.error?.message ?? "provider error mid-stream"),
                  Number(json.error?.code) || undefined,
                );
              }

              const d = json?.choices?.[0]?.delta;

              // Reasoning models (Nemotron, R1, QwQ and friends) think first and
              // emit those tokens on a DIFFERENT field. Reading only `content`
              // made a model that was working perfectly look like it had sent
              // nothing, and the first-token timer then killed it.
              const thinking: string | undefined = d?.reasoning ?? d?.reasoning_content;
              if (thinking) {
                thought += thinking.length;
                g.alive();
              }

              const delta: string | undefined = d?.content;
              if (delta) {
                if (emitted === 0) g.alive();
                emitted += delta.length;
                yield { type: "delta", text: delta };
              }
            } catch (e) {
              if (e instanceof OpenRouterError) throw e;
              /* keep-alive comments and partial frames */
            }
          }
        }

        g.done();
        if (emitted > 0) return;
        if (forceJson) continue;   // try the same model without forced JSON
        attempts.push({
          model, ok: false, ms: Date.now() - t0,
          reason: thought > 0
            ? "spent the whole budget thinking without writing an answer"
            : "returned an empty response",
        });
        break;
      } catch (err) {
        g.done();
        if (o.signal?.aborted) throw err;
        if (err instanceof OpenRouterError && err.fatal) throw err;

        // Tokens already reached the caller. A cut stream is worth salvaging —
        // a mostly-written plan beats an error message, and the route repairs
        // the truncated JSON.
        if (emitted > 0) return;
        if (forceJson) continue;   // try the same model without forced JSON

        const why = err instanceof Error && err.message === "ttft"
          ? `sent nothing within ${Math.round(b.ttftMs / 1000)}s`
          : err instanceof Error && err.message === "timeout"
            ? thought > 0 ? "still thinking when the time ran out" : "timed out"
            : err instanceof OpenRouterError ? err.message
            : "could not be reached";
        attempts.push({ model, ok: false, ms: Date.now() - t0, reason: why });
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
  const shortlist = chain.slice(0, o.maxModels ?? 3);

  for (let i = 0; i < shortlist.length; i++) {
    const model = shortlist[i];
    const b = budget(o, shortlist.length - i);
    if (b.expired) break;
    for (const forceJson of [true, false]) {
      const g = guard(b.ttftMs, b.totalMs, o.signal);
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
          if (fatal) throw new OpenRouterError(reason, res.status, attempts, true, hint);
          if (forceJson) continue;
          attempts.push({ model, ok: false, status: res.status, reason, ms: Date.now() - t0 });
          break;
        }

        const msg = JSON.parse(raw)?.choices?.[0]?.message;
        const text = msg?.content ?? "";
        if (text.trim()) return { text, model };
        if (forceJson) continue;
        attempts.push({
          model, ok: false, ms: Date.now() - t0,
          reason: msg?.reasoning || msg?.reasoning_content
            ? "answered with reasoning only, no content"
            : "returned an empty message",
        });
        break;
      } catch (err) {
        g.done();
        if (o.signal?.aborted) throw err;
        if (err instanceof OpenRouterError && err.fatal) throw err;
        attempts.push({
          model, ok: false, ms: Date.now() - t0,
          reason: err instanceof Error && err.message === "ttft"
            ? `sent nothing within ${Math.round(b.ttftMs / 1000)}s`
            : err instanceof Error && err.message === "timeout" ? "timed out" : "could not be reached",
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
