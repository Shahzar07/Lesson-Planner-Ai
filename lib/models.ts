/* ------------------------------------------------------------------ *
 * Free-model routing.
 *
 * Two chains, because the best free model for English is not the best free
 * model for Urdu. Qwen3 is markedly stronger in Urdu script; DeepSeek V3 is
 * faster and tighter on structured JSON in English. Each chain fails over
 * left to right when a model is rate-limited, cold, or returns junk.
 *
 * Override either chain with SABAQ_MODELS_EN / SABAQ_MODELS_UR (comma separated).
 * Run `npm run doctor` to probe which of these your key can actually reach.
 * ------------------------------------------------------------------ */

export interface ModelDef {
  id: string;
  label: string;
  note: string;
}

export const CATALOGUE: ModelDef[] = [
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3", note: "Fast, excellent structured JSON. Default for English." },
  { id: "qwen/qwen3-235b-a22b:free", label: "Qwen3 235B", note: "Strongest free multilingual. Default for Urdu." },
  { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", note: "Reliable, fast fallback." },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air", note: "Good reasoning at low latency." },
  { id: "mistralai/mistral-small-3.2-24b-instruct:free", label: "Mistral Small 3.2", note: "Very fast, lighter reasoning." },
  { id: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash", note: "Long context, very fast." },
  { id: "moonshotai/kimi-k2:free", label: "Kimi K2", note: "Strong long-form planning." },
  { id: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1", note: "Deep reasoning, slower. Good for repair passes." },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B", note: "Small, quick last resort." },
];

const DEFAULT_EN = [
  "deepseek/deepseek-chat-v3-0324:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

const DEFAULT_UR = [
  "qwen/qwen3-235b-a22b:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const parse = (raw: string | undefined, fallback: string[]) => {
  const list = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length ? list : fallback;
};

export function chainFor(language: "en" | "ur", preferred?: string): string[] {
  const base =
    language === "ur"
      ? parse(process.env.SABAQ_MODELS_UR, DEFAULT_UR)
      : parse(process.env.SABAQ_MODELS_EN, DEFAULT_EN);
  if (preferred && preferred !== "auto") {
    return [preferred, ...base.filter((m) => m !== preferred)];
  }
  return base;
}
