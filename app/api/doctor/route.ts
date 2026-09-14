import { NextRequest } from "next/server";
import { fetchFreeModels, resolveChain, SEED } from "@/lib/models";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ *
 * Server-side diagnosis.
 *
 * This runs where the app actually runs. On a deployed app, `npm run doctor`
 * on a laptop proves nothing about the server's key, its network, or the
 * account's privacy settings — this endpoint tests the real thing.
 * ------------------------------------------------------------------ */

interface Probe {
  model: string;
  ok: boolean;
  ms: number;
  /** ms to the first token of ACTUAL answer content */
  ttfc?: number;
  status?: number;
  reason?: string;
  /** the model thought but never wrote an answer */
  reasoningOnly?: boolean;
}

/**
 * Probe the way the app actually generates: streaming, with forced JSON, and a
 * real (if small) writing task.
 *
 * The previous probe sent max_tokens 40 with no streaming and no response_format,
 * so it reported reasoning models as healthy in 300ms — and then generation died
 * on the same models with "sent nothing within 14s". A diagnostic that disagrees
 * with production is worse than no diagnostic.
 */
async function probe(model: string, key: string, signal?: AbortSignal): Promise<Probe> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const kill = setTimeout(() => ctl.abort(new Error("timeout")), 25_000);
  const onAbort = () => ctl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
        "X-Title": "Sabaq AI doctor",
      },
      body: JSON.stringify({
        model,
        stream: true,
        max_tokens: 200,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: 'Return only this JSON and nothing else: {"ok":true,"subject":"maths","minutes":40}',
        }],
      }),
    });

    if (!res.ok || !res.body) {
      const raw = await res.text().catch(() => "");
      const low = raw.toLowerCase();
      const reason =
        res.status === 401 ? "key rejected"
          : res.status === 402 ? "out of credits"
          : low.includes("data policy") ? "blocked by privacy settings"
          : res.status === 404 ? "model no longer exists"
          : res.status === 429 ? "rate limited"
          : `HTTP ${res.status}`;
      return { model, ok: false, ms: Date.now() - t0, status: res.status, reason };
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let content = "";
    let thought = 0;
    let ttfc: number | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) !== -1) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const d = j?.choices?.[0]?.delta;
          if (d?.reasoning || d?.reasoning_content) thought++;
          if (d?.content) {
            if (ttfc === undefined) ttfc = Date.now() - t0;
            content += d.content;
          }
        } catch { /* keep-alive */ }
      }
    }

    const ms = Date.now() - t0;
    if (content.trim()) return { model, ok: true, ms, ttfc };
    return {
      model, ok: false, ms,
      reasoningOnly: thought > 0,
      reason: thought > 0
        ? "thinks but never writes an answer"
        : "streamed nothing",
    };
  } catch (err) {
    return {
      model, ok: false, ms: Date.now() - t0,
      reason: err instanceof Error && err.message === "timeout"
        ? "no answer within 25s"
        : err instanceof Error ? err.message.slice(0, 70) : "unreachable",
    };
  } finally {
    clearTimeout(kill);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function GET(req: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  const deep = req.nextUrl.searchParams.get("probe") !== "0";

  if (!key) {
    return Response.json({
      ok: false,
      keyConfigured: false,
      problem: "OPENROUTER_API_KEY is not set on the server.",
      fix: "Add it in your host's environment variables (Vercel: Project → Settings → Environment Variables) and redeploy. A key set only in .env.local on your laptop does not reach a deployed app.",
    }, { status: 200 });
  }

  /* 1 — can the server read the catalogue at all? */
  let catalogue: { count: number; error?: string } = { count: 0 };
  let free: { id: string; name: string; context: number }[] = [];
  try {
    free = await fetchFreeModels(req.signal);
    catalogue = { count: free.length };
  } catch (err) {
    catalogue = { count: 0, error: err instanceof Error ? err.message : "unreachable" };
  }

  const en = await resolveChain("en", undefined, req.signal);
  const ur = await resolveChain("ur", undefined, req.signal);

  if (!deep) {
    return Response.json({
      ok: catalogue.count > 0,
      keyConfigured: true,
      keyPreview: `${key.slice(0, 12)}…${key.slice(-4)}`,
      catalogue,
      chains: { en: en.chain, ur: ur.chain, source: en.source, note: en.note },
      freeModels: free.slice(0, 40),
    });
  }

  /* 2 — actually call the top few, because "listed" is not "working". */
  const toProbe = [...new Set([...en.chain.slice(0, 5), ...ur.chain.slice(0, 3)])].slice(0, 8);
  const probes = await Promise.all(toProbe.map((m) => probe(m, key, req.signal)));
  const working = probes.filter((p) => p.ok).sort((a, b) => (a.ttfc ?? a.ms) - (b.ttfc ?? b.ms));

  const keyBad = probes.some((p) => p.status === 401);
  const policyBlocked = probes.some((p) => p.reason === "blocked by privacy settings");

  let problem: string | undefined;
  let fix: string | undefined;
  if (keyBad) {
    problem = "OpenRouter rejected the API key.";
    fix = "Generate a fresh key at https://openrouter.ai/keys, update OPENROUTER_API_KEY in your host's environment variables, and redeploy.";
  } else if (policyBlocked) {
    problem = "Your OpenRouter privacy settings are blocking free models.";
    fix = "Open https://openrouter.ai/settings/privacy and enable the free-model training/publication option. This is the most common cause of 404 \"No endpoints found\".";
  } else if (!working.length && catalogue.error) {
    problem = "The server cannot reach openrouter.ai.";
    fix = "Check outbound network access or egress rules for your deployment.";
  } else if (!working.length && probes.every((p) => p.reasoningOnly)) {
    problem = "Every model tried is a reasoning model that thinks but never writes an answer.";
    fix = "These need a bigger token budget than a probe allows. Pin a non-reasoning model with SABAQ_MODELS_EN, or raise SABAQ_BUDGET_MS.";
  } else if (!working.length) {
    problem = "Every model tried refused the request.";
    fix = "Free models are shared and go busy. Wait a minute and retry, or pin a known-good id with SABAQ_MODELS_EN.";
  }

  return Response.json({
    ok: working.length > 0,
    keyConfigured: true,
    keyPreview: `${key.slice(0, 12)}…${key.slice(-4)}`,
    catalogue,
    chains: { en: en.chain, ur: ur.chain, source: en.source, note: en.note },
    probes,
    working: working.map((w) => ({ model: w.model, ms: w.ms, ttfc: w.ttfc })),
    fastest: working[0]?.model ?? null,
    problem,
    fix,
    suggestedEnv: working.length
      ? {
          SABAQ_MODELS_EN: working.map((w) => w.model).join(","),
          SABAQ_MODELS_UR: [...working].sort(
            (a, b) => (b.model.includes("qwen") ? 1 : 0) - (a.model.includes("qwen") ? 1 : 0),
          ).map((w) => w.model).join(","),
        }
      : null,
    /** everything free this key can currently see, so a human can pick */
    allFree: free.map((f) => f.id),
    seedUsed: en.source === "seed" ? SEED : undefined,
  });
}
