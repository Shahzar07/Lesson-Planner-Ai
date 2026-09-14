import { NextRequest } from "next/server";
import { LessonPlanSchema, type LessonBrief, type LessonPlan } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/skill";
import { chat, OpenRouterError } from "@/lib/openrouter";
import { parseLoose } from "@/lib/partial-json";
import { validate, autoBalance } from "@/lib/validator";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

/** Rewrite one section of an existing plan without disturbing the rest. */
export async function POST(req: NextRequest) {
  try {
    const { plan, brief, section, instruction } = (await req.json()) as {
      plan: LessonPlan;
      brief: LessonBrief;
      section: string;
      instruction: string;
    };

    if (!plan || !brief || !section) {
      return Response.json({ error: "plan, brief and section are required." }, { status: 400 });
    }

    const system = buildSystemPrompt(brief);
    const user = `Rewrite ONLY the "${section}" section of the lesson plan below.

${instruction?.trim() ? `Teacher's instruction for this rewrite: ${instruction.trim()}` : "Make it stronger, more specific and more classroom-ready."}

Rules:
- Change nothing outside "${section}". Every other key must come back byte-identical.
- Keep the output language ${brief.language === "ur" ? "Urdu" : "English"}.
- Stage minutes must still total exactly ${brief.duration}.
- Return the COMPLETE JSON object. No fence, no commentary.

${JSON.stringify(plan)}`;

    const { text, model } = await chat({
      system,
      user,
      language: brief.language,
      signal: req.signal,
      maxTokens: 9000,
      temperature: 0.5,
    });

    const parsed = LessonPlanSchema.safeParse(parseLoose(text));
    if (!parsed.success) {
      return Response.json({ error: "The rewrite came back malformed. Try again." }, { status: 502 });
    }

    const next = autoBalance(parsed.data);
    return Response.json({ plan: next, quality: validate(next, brief), model });
  } catch (err) {
    const message = err instanceof OpenRouterError || err instanceof Error ? err.message : "Refine failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
