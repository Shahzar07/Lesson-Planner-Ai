import { chainFor } from "@/lib/models";

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

export class OpenRouterError extends Error {
  constructor(message: string, readonly status?: number, readonly attempts: string[] = []) {
    super(message);
    this.name = "OpenRouterError";
  }
}

function headers() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not set. Copy .env.example to .env.local and add your key from https://openrouter.ai/keys",
    );
  }
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
    "X-Title": process.env.SITE_NAME ?? "Sabaq AI",
  };
}

function body(o: ChatOptions, model: string, stream: boolean) {
  return JSON.stringify({
    model,
    stream,
    temperature: o.temperature ?? 0.4,
    max_tokens: o.maxTokens ?? 8000,
    // Nudges models that support it; the rest are handled by the tolerant parser.
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: o.system },
      { role: "user", content: o.user },
    ],
  });
}

/** Merge an external abort signal with a per-model timeout. */
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

/**
 * Stream a completion, failing over through the model chain.
 * Yields `{ type: "model" }` first so the UI can name the model it got,
 * then a run of `{ type: "delta" }`.
 */
export async function* streamChat(
  o: ChatOptions,
): AsyncGenerator<{ type: "model"; model: string } | { type: "delta"; text: string }> {
  const chain = chainFor(o.language, o.preferredModel);
  const attempts: string[] = [];
  let lastError: unknown;

  for (const model of chain) {
    attempts.push(model);
    const g = guard(o.timeoutMs ?? 90_000, o.signal);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: headers(),
        body: body(o, model, true),
        signal: g.signal,
      });

      if (!res.ok || !res.body) {
        lastError = new OpenRouterError(
          `${model} returned ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`,
          res.status,
        );
        g.done();
        // 401/403 are key problems, not model problems. Stop immediately.
        if (res.status === 401 || res.status === 403) throw lastError;
        continue;
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

        // SSE frames are separated by a blank line.
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
            /* OpenRouter sends keep-alive comments; ignore unparseable frames. */
          }
        }
      }

      g.done();
      if (emitted > 0) return;
      lastError = new OpenRouterError(`${model} streamed an empty response`);
    } catch (err) {
      g.done();
      if (o.signal?.aborted) throw err;
      if (err instanceof OpenRouterError && (err.status === 401 || err.status === 403)) throw err;
      lastError = err;
    }
  }

  throw new OpenRouterError(
    `All models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    undefined,
    attempts,
  );
}

/** Non-streaming completion, same failover. Used by the repair pass. */
export async function chat(o: ChatOptions): Promise<{ text: string; model: string }> {
  const chain = chainFor(o.language, o.preferredModel);
  let lastError: unknown;

  for (const model of chain) {
    const g = guard(o.timeoutMs ?? 90_000, o.signal);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: headers(),
        body: body(o, model, false),
        signal: g.signal,
      });
      const raw = await res.text();
      g.done();

      if (!res.ok) {
        lastError = new OpenRouterError(`${model} returned ${res.status}: ${raw.slice(0, 300)}`, res.status);
        if (res.status === 401 || res.status === 403) throw lastError;
        continue;
      }

      const text = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "";
      if (text.trim()) return { text, model };
      lastError = new OpenRouterError(`${model} returned an empty message`);
    } catch (err) {
      g.done();
      if (o.signal?.aborted) throw err;
      if (err instanceof OpenRouterError && (err.status === 401 || err.status === 403)) throw err;
      lastError = err;
    }
  }

  throw new OpenRouterError(
    `All models failed. Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}
