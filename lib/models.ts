/* ------------------------------------------------------------------ *
 * Model routing.
 *
 * OpenRouter's free tier churns: IDs are added, renamed and withdrawn
 * constantly, and a hardcoded list rots within weeks. It rots silently, too
 * — a withdrawn model answers 404 "No endpoints found", which looks exactly
 * like a broken key to the teacher staring at the screen.
 *
 * So nothing here names a model as gospel. The app asks OpenRouter what is
 * actually free right now, then ranks whatever came back by FAMILY — "glm",
 * "qwen", "deepseek" — so a version bump from qwen3 to qwen4 needs no code
 * change. The static list at the bottom is only a seed for when the catalogue
 * itself cannot be reached.
 * ------------------------------------------------------------------ */

export interface FreeModel {
  id: string;
  name: string;
  context: number;
}

interface CatalogueEntry {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string; request?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
}

/* ---------------------- family preference order ---------------------- */

/**
 * Matched as substrings against the model id, best first. Families, not
 * versions: "qwen3-235b" and a future "qwen4-400b" both match "qwen".
 */
const PREFER_EN = [
  "glm-4", "glm", "deepseek-chat", "deepseek-v3", "qwen3", "qwen",
  "nemotron", "llama-3.3", "llama-4", "mistral-small", "gpt-oss", "kimi",
  "deepseek-r1", "gemma", "mistral",
];

/** Qwen and GLM handle Urdu script noticeably better than the Llama family. */
const PREFER_UR = [
  "qwen3", "qwen", "glm-4", "glm", "deepseek-chat", "deepseek-v3",
  "gemini", "nemotron", "llama-3.3", "llama-4", "deepseek-r1", "gemma", "mistral",
];

/** Free models that exist but cannot write a lesson plan. */
const EXCLUDE = [
  "guard", "embed", "rerank", "whisper", "tts", "moderation",
  "vision-only", "ocr", "sd3", "flux", "coder", "math",
];

/* ------------------------- catalogue fetching ------------------------ */

let cache: { at: number; models: FreeModel[] } | null = null;
const TTL_MS = 30 * 60 * 1000;

const isFree = (m: CatalogueEntry) => {
  const p = m.pricing;
  if (!p) return m.id.endsWith(":free");
  const zero = (v?: string) => v === "0" || v === "0.0" || Number(v) === 0;
  return (zero(p.prompt) && zero(p.completion)) || m.id.endsWith(":free");
};

const usable = (m: CatalogueEntry) => {
  const id = m.id.toLowerCase();
  if (EXCLUDE.some((x) => id.includes(x))) return false;
  const out = m.architecture?.output_modalities;
  if (out && !out.includes("text")) return false;
  // A lesson plan plus the skill context does not fit in a tiny window.
  return (m.context_length ?? 0) >= 16000 || !m.context_length;
};

/** Ask OpenRouter what is free right now. Cached per server instance. */
export async function fetchFreeModels(signal?: AbortSignal): Promise<FreeModel[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.models;

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`model catalogue returned ${res.status}`);

  const data: CatalogueEntry[] = (await res.json())?.data ?? [];
  const models = data
    .filter((m) => m?.id && isFree(m) && usable(m))
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      context: m.context_length ?? 0,
    }));

  if (models.length) cache = { at: Date.now(), models };
  return models;
}

/** Order a set of model ids by family preference, then by context size. */
export function rankModels(models: FreeModel[], preference: string[]): string[] {
  const score = (id: string) => {
    const lower = id.toLowerCase();
    const i = preference.findIndex((f) => lower.includes(f));
    return i === -1 ? preference.length : i;
  };
  return [...models]
    .sort((a, b) => score(a.id) - score(b.id) || b.context - a.context)
    .map((m) => m.id);
}

/* ----------------------------- the chain ----------------------------- */

const parseEnv = (raw: string | undefined) =>
  (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * The ordered list of models to try for this request.
 *
 * An explicit SABAQ_MODELS_* override always wins, so anyone can pin exact
 * ids. Otherwise the live catalogue decides, and the seed list is the last
 * resort when the catalogue is unreachable.
 */
export async function resolveChain(
  language: "en" | "ur",
  preferred?: string,
  signal?: AbortSignal,
): Promise<{ chain: string[]; source: "env" | "live" | "seed"; note?: string }> {
  const pinned = parseEnv(
    language === "ur" ? process.env.SABAQ_MODELS_UR : process.env.SABAQ_MODELS_EN,
  );
  const head = preferred && preferred !== "auto" ? [preferred] : [];

  if (pinned.length) {
    return { chain: [...new Set([...head, ...pinned])], source: "env" };
  }

  try {
    const models = await fetchFreeModels(signal);
    if (models.length) {
      const ranked = rankModels(models, language === "ur" ? PREFER_UR : PREFER_EN);
      return {
        chain: [...new Set([...head, ...ranked])].slice(0, 8),
        source: "live",
        note: `${models.length} free models available right now`,
      };
    }
  } catch (err) {
    return {
      chain: seedChain(language, head),
      source: "seed",
      note: `could not read the live catalogue (${err instanceof Error ? err.message : "unknown"})`,
    };
  }

  return { chain: seedChain(language, head), source: "seed" };
}

/** The seed still respects the language preference: Urdu wants Qwen first. */
function seedChain(language: "en" | "ur", head: string[]): string[] {
  const ranked = rankModels(
    SEED.map((id) => ({ id, name: id, context: 0 })),
    language === "ur" ? PREFER_UR : PREFER_EN,
  );
  return [...new Set([...head, ...ranked])];
}

/**
 * Last-resort seed. These are only tried when openrouter.ai/api/v1/models
 * cannot be reached at all, so treat a 404 from one of them as expected
 * rather than as a bug — the live catalogue is the source of truth.
 */
export const SEED = [
  "z-ai/glm-4.5-air:free",
  "qwen/qwen3-235b-a22b:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "openai/gpt-oss-20b:free",
  "qwen/qwen3-14b:free",
  "google/gemma-3-27b-it:free",
];
