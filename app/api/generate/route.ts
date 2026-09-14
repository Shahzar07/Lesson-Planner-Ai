import { NextRequest } from "next/server";
import { LessonPlanSchema, type LessonBrief, type LessonPlan } from "@/lib/types";
import { buildSystemPrompt, buildUserPrompt, buildRepairPrompt } from "@/lib/skill";
import { streamChat, chat, OpenRouterError } from "@/lib/openrouter";
import { parseLoose } from "@/lib/partial-json";
import { validate, autoBalance } from "@/lib/validator";
import { salvagePlan } from "@/lib/salvage";
import { FORMAT_BY_ID } from "@/lib/formats";

export const runtime = "nodejs";
// Vercel Hobby caps a function at 60s and kills it mid-stream at the limit, so
// the whole request is budgeted to finish inside that. Raise both if you are on
// a plan that allows longer.
export const maxDuration = 60;
const WALL_CLOCK_MS = Number(process.env.SABAQ_BUDGET_MS ?? 52_000);
export const dynamic = "force-dynamic";

/** Score below which the repair pass is worth a second model call. */
const REPAIR_THRESHOLD = 90;
/** A repair is a second full generation; it only runs with time to spare. */
const REPAIR_NEEDS_MS = 18_000;

function normalise(input: Partial<LessonBrief>): LessonBrief {
  const fmt = FORMAT_BY_ID[input.format ?? ""] ?? FORMAT_BY_ID["bed-english"];
  return {
    curriculum: input.curriculum || "cambridge",
    grade: input.grade || "",
    subject: input.subject || "",
    topic: (input.topic || "").slice(0, 400),
    duration: Math.min(240, Math.max(5, Number(input.duration) || 40)),
    classStrength: input.classStrength || "",
    averageAge: input.averageAge || "",
    bookName: input.bookName || "",
    pageNos: input.pageNos || "",
    teacherName: input.teacherName || "",
    section: input.section || "",
    date: input.date || "",
    lessonNo: input.lessonNo || "",
    coreSkill: input.coreSkill || "",
    language: fmt.language,
    format: fmt.id,
    priorKnowledge: (input.priorKnowledge || "").slice(0, 1200),
    notes: (input.notes || "").slice(0, 1600),
    lowResource: Boolean(input.lowResource),
    includeHomework: input.includeHomework !== false,
    strictRepair: Boolean(input.strictRepair),
  };
}

/** Fill header fields straight from the brief; the model should never guess these. */
function stampMeta(plan: LessonPlan, brief: LessonBrief): LessonPlan {
  const m = plan.meta;
  m.duration = brief.duration;
  m.topic = brief.topic || m.topic;
  m.subject = brief.subject || m.subject;
  m.grade = brief.grade || m.grade;
  if (brief.section) m.section = brief.section;
  if (brief.date) m.date = brief.date;
  if (brief.lessonNo) m.lessonNo = brief.lessonNo;
  if (brief.teacherName) m.teacherName = brief.teacherName;
  if (brief.classStrength) m.classStrength = brief.classStrength;
  if (brief.averageAge) m.averageAge = brief.averageAge;
  if (brief.bookName) m.bookName = brief.bookName;
  // Never let an unsupplied page number survive.
  m.pageNos = brief.pageNos?.trim() ? brief.pageNos.trim() : "";
  if (!brief.pageNos?.trim()) plan.curriculumAlignment.code = null;
  return plan;
}

export async function POST(req: NextRequest) {
  let brief: LessonBrief;
  try {
    brief = normalise(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!brief.topic.trim()) {
    return Response.json({ error: "A topic is required." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          /* client disconnected */
        }
      };

      const started = Date.now();
      try {
        const system = buildSystemPrompt(brief);
        const user = buildUserPrompt(brief);

        send({ type: "status", message: "Loading the Cambridge, board and B.Ed knowledge packs" });

        let raw = "";
        let usedModel = "";

        const deadline = started + WALL_CLOCK_MS;

        for await (const ev of streamChat({
          system,
          user,
          language: brief.language,
          signal: req.signal,
          maxTokens: 5000,
          temperature: 0.35,
          deadline,
          ttftMs: 14_000,
          timeoutMs: 45_000,
          maxModels: 4,
        })) {
          if (ev.type === "chain") {
            send({
              type: "status",
              message:
                ev.source === "live"
                  ? `Picking from ${ev.chain.length} free models available now`
                  : ev.source === "env"
                    ? "Using the models pinned in your environment"
                    : "Live model list unavailable, trying the fallback list",
            });
          } else if (ev.type === "model") {
            usedModel = ev.model;
            send({ type: "model", model: ev.model });
          } else {
            raw += ev.text;
            send({ type: "delta", text: ev.text });
          }
        }

        send({ type: "status", message: "Checking the plan against the quality rubric" });

        const parsed = parseLoose<unknown>(raw);
        if (!parsed) {
          send({ type: "error", message: "The model did not return usable JSON. Try again, or pick a different model in Advanced." });
          controller.close();
          return;
        }

        const salvaged = salvagePlan(parsed);
        if (!salvaged.plan) {
          send({
            type: "error",
            message:
              "The model was cut off before it produced enough of a plan to use. Try again — it is usually faster on the second attempt.",
            hint: "If this keeps happening, your hosting plan's function time limit may be shorter than the model needs. Lower SABAQ_BUDGET_MS, or upgrade the plan.",
          });
          controller.close();
          return;
        }
        if (salvaged.truncated) {
          send({
            type: "status",
            message: `The model was cut short, so ${salvaged.dropped.length} incomplete item${salvaged.dropped.length === 1 ? "" : "s"} were dropped`,
          });
        }

        let plan = stampMeta(autoBalance(salvaged.plan), brief);
        let report = validate(plan, brief);
        send({ type: "plan", plan, quality: report, model: usedModel, pass: 1 });

        /* ---- repair pass: only the failures, only when it is worth it ---- */
        const msLeft = deadline - Date.now();
        if (
          brief.strictRepair &&
          report.score < REPAIR_THRESHOLD &&
          report.failures.length &&
          msLeft > REPAIR_NEEDS_MS
        ) {
          send({
            type: "status",
            message: `Scored ${report.score}. Repairing ${report.failures.length} issue${report.failures.length === 1 ? "" : "s"}`,
          });

          try {
            const { text, model: repairModel } = await chat({
              system,
              user: buildRepairPrompt(brief, JSON.stringify(plan), report.failures),
              language: brief.language,
              signal: req.signal,
              maxTokens: 5000,
              temperature: 0.2,
              deadline,
              ttftMs: 10_000,
              timeoutMs: Math.max(8_000, msLeft - 2_000),
              maxModels: 2,
            });

            const repaired = LessonPlanSchema.safeParse(parseLoose(text));
            if (repaired.success) {
              const candidate = stampMeta(autoBalance(repaired.data), brief);
              const candidateReport = validate(candidate, brief);
              // Keep the repair only if it genuinely scored better.
              if (candidateReport.score > report.score) {
                plan = candidate;
                report = candidateReport;
                send({ type: "plan", plan, quality: report, model: repairModel, pass: 2 });
              }
            }
          } catch {
            send({ type: "status", message: "Repair pass unavailable; keeping the first plan." });
          }
        }

        send({
          type: "done",
          quality: report,
          model: usedModel,
          elapsedMs: Date.now() - started,
          truncated: salvaged.truncated,
        });
      } catch (err) {
        if (err instanceof OpenRouterError) {
          send({ type: "error", message: err.message, hint: err.hint, attempts: err.attempts });
        } else {
          send({ type: "error", message: err instanceof Error ? err.message : "Generation failed." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
