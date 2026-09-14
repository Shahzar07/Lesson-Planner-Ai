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
  status?: number;
  reason?: string;
}

async function probe(model: string, key: string, signal?: AbortSignal): Promise<Probe> {
  const t0 = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
        "X-Title": "Sabaq AI doctor",
      },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0,
        messages: [{ role: "user", content: 'Reply with only this JSON: {"ok":true}' }],
      }),
    });
    const ms = Date.now() - t0;
    const raw = await res.text();

    if (!res.ok) {
      const low = raw.toLowerCase();
      const reason =
        res.status === 401 ? "key rejected"
          : res.status === 402 ? "out of credits"
          : low.includes("data policy") ? "blocked by privacy settings"
          : res.status === 404 ? "model no longer exists"
          : res.status === 429 ? "rate limited"
          : `HTTP ${res.status}`;
      return { model, ok: false, ms, status: res.status, reason };
    }

    const content = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "";
    return content.trim()
      ? { model, ok: true, ms }
      : { model, ok: false, ms, reason: "empty response" };
  } catch (err) {
    return {
      model, ok: false, ms: Date.now() - t0,
      reason: err instanceof Error ? err.message.slice(0, 80) : "unreachable",
    };
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
  const toProbe = [...new Set([...en.chain.slice(0, 4), ...ur.chain.slice(0, 2)])].slice(0, 6);
  const probes = await Promise.all(toProbe.map((m) => probe(m, key, req.signal)));
  const working = probes.filter((p) => p.ok).sort((a, b) => a.ms - b.ms);

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
    working: working.map((w) => ({ model: w.model, ms: w.ms })),
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
    seedUsed: en.source === "seed" ? SEED : undefined,
  });
}
