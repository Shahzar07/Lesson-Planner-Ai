import fs from "node:fs";
import path from "node:path";
import type { LessonBrief } from "@/lib/types";
import { CURRICULUM_BY_ID } from "@/lib/curricula";
import { FORMAT_BY_ID } from "@/lib/formats";
import {
  section, COMPACT_CURRICULUM, VERB_RULES_EN, VERB_RULES_UR, URDU_FIELDS,
} from "@/lib/skill/compact";

/** Full knowledge packs cost ~5,300 tokens. Opt in when latency does not matter. */
const FULL_CONTEXT = process.env.SABAQ_FULL_CONTEXT === "1";

/* ------------------------------------------------------------------ *
 * The Skill loader.
 *
 * SKILL.md is the always-on contract. The knowledge packs are loaded
 * *selectively* per brief, so a Cambridge maths plan never pays the token
 * cost of the Urdu grammar pack. That selectivity is the whole optimisation:
 * a focused 4k-token context beats a 20k-token kitchen sink on a free model.
 * ------------------------------------------------------------------ */

const SKILL_DIR = path.join(process.cwd(), "lib", "skill");
const KNOWLEDGE_DIR = path.join(SKILL_DIR, "knowledge");

const cache = new Map<string, string>();

function read(file: string): string {
  const hit = cache.get(file);
  if (hit !== undefined) return hit;
  try {
    const text = fs.readFileSync(file, "utf8");
    cache.set(file, text);
    return text;
  } catch {
    cache.set(file, "");
    return "";
  }
}

export const loadSkill = () => read(path.join(SKILL_DIR, "SKILL.md"));
export const loadPack = (name: string) =>
  read(path.join(KNOWLEDGE_DIR, `${name}.md`));

/** Which packs this particular brief actually needs. */
export function selectPacks(brief: LessonBrief): string[] {
  const curriculum = CURRICULUM_BY_ID[brief.curriculum];
  const packs = new Set<string>(curriculum?.knowledgePacks ?? ["bed-pedagogy", "blooms"]);
  packs.add("quality-rubric");
  if (brief.language === "ur") packs.add("urdu-format");
  // A teacher on Sindh Board who names an Oxford book needs both.
  if (/oxford|countdown|nome|progressive/i.test(brief.bookName)) packs.add("oxford-pakistan");
  return [...packs];
}

/* --------------------- the JSON shape the model returns -------------------- */

export function schemaBlock(brief: LessonBrief): string {
  const fmt = FORMAT_BY_ID[brief.format];
  const is5E = brief.format === "cambridge-5e";
  const stages = fmt?.stageTitles.length ?? 5;

  // Fields only one format actually renders are not requested from the others.
  // Every omitted key has a zod default, so a shorter answer is still valid —
  // and ~1,500 fewer output tokens is ~40 seconds on a free model.
  const only5E = is5E
    ? `
  "successCriteria": [string],        // 3, learner facing "I can ..."
  "misconceptions": [ { "misconception": string, "howToAddress": string } ],  // 2
  "keyVocabulary": [ { "term": string, "definition": string, "localExample": string } ], // 3
  "priorKnowledge": [string],         // 2
  "teacherReflection": [string],      // 2`
    : "";

  return `{
  "coreConcept": string,              // the single central idea, ONE sentence
  "curriculumAlignment": {
    "system": string, "stageLabel": string, "strand": string,
    "outcomeStatement": string,       // the outcome in plain words, one sentence
    "code": null,                     // ALWAYS null unless the brief gave a real code
    "commandWords": [string]          // 2-3
  },
  "objectives": [                     // exactly 3
    { "text": string,                 // full sentence: audience, verb, condition, degree
      "verb": string,                 // the measurable main verb alone
      "bloomLevel": "Remember|Understand|Apply|Analyse|Evaluate|Create",
      "condition": string,            // the "using / given / in pairs" part
      "degree": string }              // the success criterion, e.g. "4 of 5"
  ],                                  // >=1 at Apply or above; <=1 at Remember
  "skillsAndAttitude": { "skills": [string], "attitudes": [string], "psychomotor": [string] }, // 2/1/1
  "resources": [ { "item": string, "purpose": string, "noTechAlternative": string } ], // 3
  "classroomManagement": { "rules": [string], "strategies": [string] },  // 3 rules, 3 strategies
  "methodology": { "primaryMethod": string, "supportingMethods": [string], "rationale": string },
  "contentDelivery": [string],        // 3, the content split into teachable parts
  "procedure": [                      // ${stages} stages, minutes MUST total exactly ${brief.duration}
    { "title": string,                // from the required titles below, in order
      "minutes": number,
      "teacherDoes": string,          // 2-3 sentences of what the teacher SAYS and DOES
      "studentsDo": string,           // one sentence
      "questions": [                  // exactly 2 per stage
        { "q": string, "expected": string, "bloomLevel": string } ],
      "checkpoint": string }          // one sentence: how to know whether to move on
  ],
  "boardSummary": { "heading": string, "lines": [string], "workedExample": string, "keyBox": [string] },
  "differentiation": {
    "support": [string],              // exactly 2, each naming a concrete scaffold
    "extension": [string],            // exactly 2, concrete
    "specialNeeds": [string]          // 1
  },
  "assessmentForLearning": [          // exactly 2
    { "technique": string, "whenInLesson": string, "whatItReveals": string, "ifStudentsStruggle": string }
  ],
  "recapitulation": { "technique": string, "questions": [string] },   // 2 questions
  "evaluation": {
    "items": [ { "question": string, "marks": number, "expectedAnswer": string, "bloomLevel": string } ], // 3
    "totalMarks": number
  },
  "homework": { "task": string, "estimatedMinutes": number, "howItWillBeChecked": string, "differentiatedOption": string }${only5E}
}

Stage titles to use, in this order:
${(fmt?.stageTitles ?? []).map((t) => `  - ${t}`).join("\n")}

Keep every string tight. A field that runs long costs the teacher time waiting.`;
}

/* ------------------------------ prompts ------------------------------ */

export function buildSystemPrompt(brief: LessonBrief): string {
  const fmt = FORMAT_BY_ID[brief.format];
  const skill = loadSkill();
  const parts: string[] = [];

  if (FULL_CONTEXT) {
    parts.push(skill);
    for (const p of selectPacks(brief)) {
      const body = loadPack(p);
      if (body) parts.push(`\n\n---\n\n${body}`);
    }
  } else {
    // The rules that change the output, and nothing else.
    parts.push(
      "# SKILL — Lesson Plan Architect\n\n" +
        "You are Sabaq, a senior teacher-educator who has supervised B.Ed and ADE teaching " +
        "practice in Pakistan for twenty years. You write lesson plans a university supervisor " +
        "signs without a correction. Your output is a working document a teacher carries into a " +
        "real classroom tomorrow morning, not an essay about teaching.\n\n" +
        (section(skill, "## 1. Non-negotiables") || "") +
        "\n\n" +
        (section(skill, "## 6. Self-check") || ""),
    );
    parts.push(`\n\n---\n\n# CURRICULUM\n\n${COMPACT_CURRICULUM[brief.curriculum] ?? ""}`);
    parts.push(`\n\n---\n\n${brief.language === "ur" ? VERB_RULES_UR : VERB_RULES_EN}`);
    if (brief.language === "ur") parts.push(`\n\n${URDU_FIELDS}`);
  }

  parts.push(`\n\n---\n\n# FORMAT — ${fmt?.name ?? brief.format}\n\n${fmt?.directive ?? ""}`);

  if (brief.lowResource) {
    parts.push(`\n\n# LOW-RESOURCE MODE
A blackboard and chalk, nothing else. No projector, printer, internet or photocopies.
Every resource must already be in the room, be free and locally findable, or be drawable
on the board in two minutes. Anything printed needs a no-tech alternative in the same line.`);
  }

  if (!brief.includeHomework) {
    parts.push(`\n\n# HOMEWORK
None is wanted. Put one short line in homework.task saying no written homework is set,
and give a two-minute oral revision instruction instead.`);
  }

  parts.push(`\n\n# SPEED
Answer in one pass. Do not restate the brief, do not explain your reasoning, do not write
anything before or after the JSON. Keep every field tight and concrete.`);

  return parts.join("");
}

export function buildUserPrompt(brief: LessonBrief): string {
  const curriculum = CURRICULUM_BY_ID[brief.curriculum];
  const fmt = FORMAT_BY_ID[brief.format];

  const supplied: string[] = [];
  const given = (label: string, value: string) => {
    if (value && value.trim()) supplied.push(`- ${label}: ${value.trim()}`);
  };

  given("Curriculum system", curriculum?.name ?? brief.curriculum);
  given("Class / Stage", brief.grade);
  given("Section", brief.section);
  given("Subject", brief.subject);
  given("Topic", brief.topic);
  given("Textbook / series", brief.bookName);
  given("Page numbers SUPPLIED BY THE TEACHER", brief.pageNos);
  given("Lesson number", brief.lessonNo);
  given("Date", brief.date);
  given("Teacher", brief.teacherName);
  given("Class strength", brief.classStrength);
  given("Average age", brief.averageAge);
  given("Core skill focus", brief.coreSkill);
  given("What students already know", brief.priorKnowledge);
  given("Teacher's extra notes", brief.notes);

  const pageRule = brief.pageNos?.trim()
    ? `The teacher supplied page numbers (${brief.pageNos.trim()}). Echo them exactly in meta.pageNos and build the Development around that content.`
    : `The teacher did NOT supply page numbers. Set meta.pageNos to "" and never invent a page, chapter or exercise number.`;

  return `Write one complete lesson plan.

## Brief
${supplied.join("\n")}
- Lesson duration: ${brief.duration} minutes (stage minutes must total exactly this)
- Output language: ${brief.language === "ur" ? "Urdu (اردو) — every string value in Urdu script" : "English"}
- Output format: ${fmt?.name}
- Assessment culture to write toward: ${curriculum?.assessmentStyle ?? "balanced"}

## Citation rule for this plan
${pageRule}
${curriculum?.id === "cambridge" ? "Do not output a Cambridge learning-objective code. Set curriculumAlignment.code to null and describe the strand in words." : ""}

## Output
Return ONE JSON object matching this shape exactly. No prose, no markdown fence, no
commentary before or after. Every key present. No empty arrays.

${schemaBlock(brief)}

Before you emit, verify: the stage minutes total exactly ${brief.duration}; no objective
uses a banned verb; every objective has a condition and a degree; at least one objective
is Apply or above; every question has an expected answer; support and extension are both
concrete.`;
}

/** Second pass — only the failures, so it is cheap and surgical. */
export function buildRepairPrompt(
  brief: LessonBrief,
  planJson: string,
  failures: { label: string; detail: string }[],
): string {
  return `The lesson plan below failed ${failures.length} quality check${failures.length === 1 ? "" : "s"}.

## Failures to fix
${failures.map((f, i) => `${i + 1}. ${f.label} — ${f.detail}`).join("\n")}

## Rules
- Fix ONLY what is listed. Do not rewrite passing sections.
- Keep every other field byte-identical to the input.
- The stage minutes must total exactly ${brief.duration}.
- Output language stays ${brief.language === "ur" ? "Urdu" : "English"}.
- Return the COMPLETE corrected JSON object, nothing else. No fence, no commentary.

## Plan to repair
${planJson}`;
}
