import { NextRequest } from "next/server";
import { LessonPlanSchema, type LessonBrief, type LessonPlan } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/skill";
import { chat, OpenRouterError } from "@/lib/openrouter";
import { parseLoose } from "@/lib/partial-json";
import { validate, autoBalance } from "@/lib/validator";
import { applyEdits, buildIndex, sectionOf, type Edit } from "@/lib/patch";
import { FORMAT_BY_ID } from "@/lib/formats";

export const runtime = "nodejs";
export const maxDuration = 180;
export const dynamic = "force-dynamic";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface Body {
  plan: LessonPlan;
  brief: LessonBrief;
  message: string;
  history?: ChatTurn[];
  scope?: string;
  precise?: boolean;
}

/** Sections a chat edit may never touch. */
const LOCKED = new Set(["meta"]);

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { plan, brief, message, history = [], scope, precise = true } = body;
  if (!plan || !brief || !message?.trim()) {
    return Response.json({ error: "plan, brief and message are required." }, { status: 400 });
  }

  const fmt = FORMAT_BY_ID[brief.format];
  const index = buildIndex(plan).join("\n");
  const transcript = history
    .slice(-6)
    .map((t) => `${t.role === "user" ? "Teacher" : "You"}: ${t.content}`)
    .join("\n");

  const system = buildSystemPrompt(brief);

  const user = `The teacher has a finished lesson plan open and wants to change part of it by
talking to you. Work out exactly which fields they mean and return the edits.

${transcript ? `## Earlier in this conversation\n${transcript}\n` : ""}
## What the teacher just said
${message.trim()}
${scope ? `\nThey have scoped this to the "${scope}" section. Do not edit outside it.` : ""}

## Every editable location in the current plan
Each line is a JSON Pointer and its current value. Long values are truncated with …
but the real value is complete; when you replace one, write the full new text.

${index}

## How to answer
Return ONE JSON object:

{
  "summary": string,        // one short sentence to the teacher, in their language,
                            // saying what you changed. No preamble.
  "edits": [
    { "op": "replace", "path": "/objectives/1/text", "value": "..." },
    { "op": "add",     "path": "/differentiation/support/-", "value": "..." },
    { "op": "remove",  "path": "/procedure/3" }
  ]
}

Rules:
- Only use paths that appear in the index above. Never invent a path, and never
  create a field that does not already exist. A wrong path is dropped.
- "op" defaults to "replace". Use "add" with a trailing "/-" to append to an array,
  or "/2" to insert at a position. Use "remove" to delete an array item.
- ${precise
    ? "Change the fewest fields that satisfy the request. Do not tidy neighbouring fields the teacher did not mention."
    : "You may restructure more broadly where the request implies it, but still address every change by path."}
- If you change a stage's minutes, adjust another stage so the total stays exactly
  ${brief.duration}, and include that second edit too.
- If you rewrite an objective's text, update its verb, bloomLevel, condition and
  degree to match in the same set of edits.
- Every rule from your instructions still applies: measurable verbs, no invented page
  or chapter numbers, concrete differentiation, script-level procedure.
- Output language stays ${brief.language === "ur" ? "Urdu" : "English"} for plan content,
  but write "summary" in whatever language the teacher used.
- If the request is unclear or you cannot do it, return an empty "edits" array and put
  the question or reason in "summary".
- No prose outside the JSON. No markdown fence.`;

  try {
    const { text, model } = await chat({
      system,
      user,
      language: brief.language,
      signal: req.signal,
      maxTokens: 6000,
      temperature: precise ? 0.25 : 0.6,
    });

    const parsed = parseLoose<{ summary?: string; edits?: Edit[] }>(text);
    if (!parsed) {
      return Response.json({ error: "The model did not return usable JSON. Try rephrasing." }, { status: 502 });
    }

    const requested = Array.isArray(parsed.edits) ? parsed.edits : [];
    const blocked = requested.filter((e) => LOCKED.has(sectionOf(e.path)));
    const allowed = requested.filter((e) => !LOCKED.has(sectionOf(e.path)));

    if (!allowed.length) {
      return Response.json({
        summary: parsed.summary?.trim() ||
          "I could not work out which part to change. Try naming the section, for example \"the starter\" or \"objective 2\".",
        edits: [],
        changedSections: [],
        rejected: blocked.map((e) => ({ path: e.path, reason: "header fields are edited in the form, not here" })),
        model,
      });
    }

    const { doc, applied, rejected } = applyEdits(plan, allowed);

    // The edit has to survive the same schema the generator does.
    const reparsed = LessonPlanSchema.safeParse(doc);
    if (!reparsed.success) {
      return Response.json(
        { error: "That change would have broken the plan structure, so nothing was applied." },
        { status: 422 },
      );
    }

    const nextPlan = autoBalance(reparsed.data);
    const quality = validate(nextPlan, brief);

    return Response.json({
      summary: parsed.summary?.trim() || `Applied ${applied.length} change${applied.length === 1 ? "" : "s"}.`,
      plan: nextPlan,
      quality,
      edits: applied,
      changedSections: [...new Set(applied.map((a) => sectionOf(a.path)).filter(Boolean))],
      rejected: [
        ...rejected,
        ...blocked.map((e) => ({ path: e.path, reason: "header fields are edited in the form, not here" })),
      ],
      model,
      formatLabel: fmt?.name,
    });
  } catch (err) {
    const message = err instanceof OpenRouterError || err instanceof Error ? err.message : "Edit failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
