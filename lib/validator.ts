import type { LessonPlan, LessonBrief, RubricCheck, QualityReport } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * The accuracy engine.
 *
 * Eleven deterministic checks, run in Node on every generated plan before
 * the teacher sees it. Nothing here asks a model for an opinion — a plan
 * whose stage minutes total 47 in a 40-minute period fails arithmetically,
 * every time, which is exactly why it is worth doing outside the model.
 *
 * Failures feed buildRepairPrompt(), which sends back only the broken parts.
 * ------------------------------------------------------------------ */

const BANNED_EN = [
  "understand", "know", "learn", "appreciate", "grasp", "comprehend", "realise",
  "realize", "be aware", "aware of", "familiar", "introduced to", "study",
  "cover", "think about", "acquainted", "be taught", "gain knowledge",
];

const BANNED_UR = ["سمجھ", "جان سکیں", "واقف", "آگاہی", "معلومات حاصل", "علم حاصل"];

const MEASURABLE_EN = new Set(
  `define list name state label identify recall recognise recognize match select locate recite choose underline circle repeat tell arrange
   explain describe summarise summarize paraphrase classify compare illustrate translate convert restate interpret infer predict distinguish rewrite outline
   solve calculate use apply demonstrate construct measure draw complete operate produce sketch implement modify employ
   analyse analyze differentiate categorise categorize examine deduce attribute organise organize investigate test relate
   evaluate justify argue critique defend judge rank assess recommend decide appraise check prioritise prioritize
   design compose create plan formulate devise invent propose adapt generate hypothesise hypothesize develop build
   write read speak pronounce sort order count convert label arrange`
    .split(/\s+/).filter(Boolean),
);

const MEASURABLE_UR = [
  "بیان", "لکھ", "شناخت", "الگ", "درجہ بندی", "موازنہ", "حل", "وجہ", "مثال",
  "خاکہ", "جملے", "ترتیب", "نتیجہ", "دلیل", "تخلیق", "پڑھ", "بنا", "گن",
  "شمار", "نشان", "مکمل", "استعمال", "فرق", "تلفظ", "ادا",
];

const METHOD_WORDS = [
  "lecture", "demonstration", "inductive", "deductive", "inquiry", "discovery",
  "activity", "cooperative", "think-pair-share", "jigsaw", "problem solving",
  "problem-solving", "role play", "role-play", "storytelling", "project",
  "direct instruction", "gradual release", "5e", "herbart", "discussion",
  "questioning", "collaborative", "experiential", "concept attainment",
  // Urdu
  "تدریس", "مظاہرہ", "سرگرمی", "استقرائی", "استخراجی", "مکالمہ", "کہانی",
  "تعاونی", "دریافت", "حل طلب",
];

const AFL_WORDS = [
  "thumbs", "mini whiteboard", "slate", "exit ticket", "hinge", "cold call",
  "traffic light", "show me", "think-pair-share", "two stars", "fingers",
  "questioning", "observation", "circulat", "peer", "self-assess", "quiz",
  "checklist", "jvote",
  "انگوٹھ", "تختی", "پرچی", "سوال", "مشاہدہ", "جانچ", "ہاتھ",
];

const TECH_WORDS = ["projector", "video", "internet", "laptop", "computer", "youtube", "slide", "printout", "print-out", "printed", "photocopy", "tablet", "smart board", "smartboard"];

const clean = (s: string) => (s ?? "").toLowerCase().trim();
const firstWord = (s: string) => clean(s).replace(/^(to|will|be able to)\s+/, "").split(/[\s,(]/)[0].replace(/[^a-z]/g, "");

function urduHas(text: string, needles: string[]) {
  return needles.some((n) => text.includes(n));
}

export function validate(plan: LessonPlan, brief: LessonBrief): QualityReport {
  const ur = brief.language === "ur";
  const checks: RubricCheck[] = [];
  const add = (id: string, label: string, weight: number, passed: boolean, detail: string) =>
    checks.push({ id, label, weight, passed, detail });

  /* 1 — timing integrity ------------------------------------------------ */
  const total = (plan.procedure ?? []).reduce((n, s) => n + (Number(s.minutes) || 0), 0);
  add(
    "timing", "Timings total the lesson duration", 15,
    total === plan.meta.duration,
    total === plan.meta.duration
      ? `Stages total ${total} of ${plan.meta.duration} minutes.`
      : `Stages total ${total} minutes but the lesson is ${plan.meta.duration}. Adjust stage minutes so they sum to exactly ${plan.meta.duration}.`,
  );

  /* 2 — measurable objectives ------------------------------------------ */
  const badVerbs: string[] = [];
  for (const o of plan.objectives ?? []) {
    const hay = clean(`${o.verb} ${o.text}`);
    if (ur) {
      if (urduHas(hay, BANNED_UR) || !urduHas(hay, MEASURABLE_UR)) badVerbs.push(o.verb || o.text.slice(0, 40));
    } else {
      const banned = BANNED_EN.some((b) => hay.includes(b));
      const ok = MEASURABLE_EN.has(firstWord(o.verb)) || MEASURABLE_EN.has(firstWord(o.text.replace(/^.*will be able to\s*/i, "")));
      if (banned || !ok) badVerbs.push(o.verb || o.text.slice(0, 40));
    }
  }
  add(
    "measurable", "Every objective uses a measurable verb", 15,
    badVerbs.length === 0,
    badVerbs.length === 0
      ? "All objective verbs are observable."
      : `These are not observable and must be rewritten with a Bloom verb: ${badVerbs.join("; ")}.`,
  );

  /* 3 — ABCD completeness ---------------------------------------------- */
  const missingAbcd = (plan.objectives ?? [])
    .map((o, i) => (!o.condition?.trim() || !o.degree?.trim() ? i + 1 : 0))
    .filter(Boolean);
  add(
    "abcd", "Objectives carry a condition and a degree", 10,
    missingAbcd.length === 0,
    missingAbcd.length === 0
      ? "Every objective states the condition and the success criterion."
      : `Objective(s) ${missingAbcd.join(", ")} are missing a condition or a degree. Add the "given/using..." part and a measurable success criterion.`,
  );

  /* 4 — Bloom spread ---------------------------------------------------- */
  const levels = (plan.objectives ?? []).map((o) => o.bloomLevel);
  const distinct = new Set(levels);
  const higher = levels.filter((l) => ["Apply", "Analyse", "Evaluate", "Create"].includes(l)).length;
  const remembers = levels.filter((l) => l === "Remember").length;
  const spreadOk = distinct.size >= 2 && higher >= 1 && remembers <= 2;
  add(
    "bloom", "Bloom levels are spread, not flat", 10, spreadOk,
    spreadOk
      ? `${distinct.size} levels used, ${higher} at Apply or above.`
      : `Needs at least two distinct Bloom levels, at least one at Apply or above, and at most two at Remember. Currently: ${levels.join(", ") || "none"}.`,
  );

  /* 5 — named methodology ---------------------------------------------- */
  const method = clean(`${plan.methodology?.primaryMethod} ${(plan.methodology?.supportingMethods ?? []).join(" ")}`);
  const methodOk = method.length > 3 && METHOD_WORDS.some((m) => method.includes(m));
  add(
    "method", "A recognised teaching method is named", 5, methodOk,
    methodOk ? `Primary method: ${plan.methodology.primaryMethod}.`
      : "Name a recognised method (activity-based, inductive, demonstration, cooperative learning, 5E, direct instruction) rather than describing teaching in general terms.",
  );

  /* 6 — script-level procedure ----------------------------------------- */
  const thin = (plan.procedure ?? [])
    .filter((s) => clean(s.teacherDoes).length < 90 || !s.studentsDo?.trim())
    .map((s) => s.title);
  const qCoverage = (plan.procedure ?? []).filter((s) => (s.questions ?? []).length >= 2).length;
  const needQ = Math.max(1, Math.ceil((plan.procedure ?? []).length * 0.6));
  const procOk = thin.length === 0 && qCoverage >= needQ;
  add(
    "procedure", "Procedure is script level", 10, procOk,
    procOk ? `${plan.procedure.length} stages, ${qCoverage} of them carrying two or more scripted questions.`
      : [
          thin.length ? `Too thin to teach from: ${thin.join(", ")}. Write what the teacher actually says and does, and what students are physically doing.` : "",
          qCoverage < needQ ? `Only ${qCoverage} of ${plan.procedure.length} stages carry two or more exact questions; at least ${needQ} must.` : "",
        ].filter(Boolean).join(" "),
  );

  /* 7 — questions carry expected answers -------------------------------- */
  const allQ = (plan.procedure ?? []).flatMap((s) => s.questions ?? []);
  const naked = allQ.filter((q) => !q.expected?.trim()).length;
  add(
    "answers", "Every question has the expected response", 5,
    allQ.length > 0 && naked === 0,
    allQ.length === 0 ? "No scripted questions found."
      : naked === 0 ? `All ${allQ.length} questions list what the teacher is listening for.`
      : `${naked} question(s) have no expected answer. Add what the teacher should be listening for.`,
  );

  /* 8 — differentiation ------------------------------------------------- */
  const sup = (plan.differentiation?.support ?? []).filter((s) => s.trim().length > 25);
  const ext = (plan.differentiation?.extension ?? []).filter((s) => s.trim().length > 25);
  const diffOk = sup.length >= 2 && ext.length >= 2;
  add(
    "differentiation", "Concrete support and concrete extension", 10, diffOk,
    diffOk ? `${sup.length} support strategies, ${ext.length} extensions.`
      : `Needs at least two specific support strategies and two specific extensions (currently ${sup.length} and ${ext.length}). "Help weak students" is not a strategy; name the scaffold.`,
  );

  /* 9 — assessment for learning ----------------------------------------- */
  const afl = (plan.assessmentForLearning ?? []).filter((a) => a.technique?.trim());
  const aflNamed = afl.filter((a) => AFL_WORDS.some((w) => clean(a.technique).includes(w) || a.technique.includes(w)));
  const aflOk = afl.length >= 2 && aflNamed.length >= 1;
  add(
    "afl", "In-lesson assessment checkpoints", 5, aflOk,
    aflOk ? `${afl.length} checkpoints gather evidence during the lesson.`
      : "Add at least two in-lesson checkpoints naming a real AfL technique (mini whiteboards, thumbs, hinge question, exit ticket, cold call).",
  );

  /* 10 — no fabricated citation ----------------------------------------- */
  const suppliedPages = Boolean(brief.pageNos?.trim());
  const citationSurface = [
    plan.meta.pageNos,
    plan.curriculumAlignment?.code ?? "",
    plan.homework?.task ?? "",
    (plan.resources ?? []).map((r) => r.item).join(" "),
    (plan.contentDelivery ?? []).join(" "),
  ].join(" ");
  const invented =
    !suppliedPages &&
    (/\bp(?:ages?|gs?)?\.?\s*\d/i.test(citationSurface) ||
      /\bchapter\s*\d/i.test(citationSurface) ||
      /\bex(?:ercise)?\.?\s*\d+(?:\.\d+)?/i.test(citationSurface) ||
      Boolean(plan.curriculumAlignment?.code));
  add(
    "citations", "No invented page, chapter or code", 10, !invented,
    !invented
      ? suppliedPages ? "Uses only the reference the teacher supplied." : "No page, chapter or objective code was invented."
      : "The plan cites a page, chapter, exercise or objective code that the teacher never supplied. Remove it, set curriculumAlignment.code to null and meta.pageNos to an empty string, and refer to \"the unit named in the brief\" instead.",
  );

  /* 11 — context fidelity ----------------------------------------------- */
  const wholePlan = JSON.stringify(plan);
  const dollars = /\$\s?\d|\bdollars?\b/i.test(wholePlan);
  const techNoFallback = (plan.resources ?? []).filter(
    (r) => TECH_WORDS.some((t) => clean(r.item).includes(t)) && !r.noTechAlternative?.trim(),
  );
  const ctxOk = !dollars && techNoFallback.length === 0;
  add(
    "context", "Written for a Pakistani classroom", 5, ctxOk,
    ctxOk ? "Local context, and every powered resource has a no-tech fallback."
      : [
          dollars ? "Prices are in dollars; use Pakistani rupees." : "",
          techNoFallback.length ? `These resources need power or printing but give no alternative: ${techNoFallback.map((r) => r.item).join(", ")}.` : "",
        ].filter(Boolean).join(" "),
  );

  const earned = checks.filter((c) => c.passed).reduce((n, c) => n + c.weight, 0);
  const possible = checks.reduce((n, c) => n + c.weight, 0);

  return {
    score: Math.round((earned / possible) * 100),
    checks,
    failures: checks.filter((c) => !c.passed),
  };
}

/* ---------------------- deterministic pre-repair ---------------------- */

/**
 * Fix what arithmetic alone can fix, before spending a model call.
 * Rebalances stage minutes onto the longest stage so the total is exact.
 */
export function autoBalance(plan: LessonPlan): LessonPlan {
  const target = plan.meta.duration;
  const stages = plan.procedure ?? [];
  if (!stages.length) return plan;

  const total = stages.reduce((n, s) => n + (Number(s.minutes) || 0), 0);
  const drift = target - total;
  if (drift === 0) return plan;

  // Only nudge; a wild mismatch is a real planning error and belongs to the model.
  if (Math.abs(drift) > Math.max(5, Math.round(target * 0.2))) return plan;

  let longest = 0;
  stages.forEach((s, i) => {
    if ((s.minutes ?? 0) > (stages[longest].minutes ?? 0)) longest = i;
  });
  const next = structuredClone(plan);
  next.procedure[longest].minutes = Math.max(1, (next.procedure[longest].minutes ?? 0) + drift);
  return next;
}
