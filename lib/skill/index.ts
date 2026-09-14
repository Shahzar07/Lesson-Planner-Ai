import fs from "node:fs";
import path from "node:path";
import type { LessonBrief } from "@/lib/types";
import { CURRICULUM_BY_ID } from "@/lib/curricula";
import { FORMAT_BY_ID } from "@/lib/formats";

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
  return `{
  "meta": {
    "lessonNo": string, "date": string, "grade": string, "section": string,
    "subject": string, "topic": string, "duration": ${brief.duration},
    "classStrength": string, "averageAge": string, "bookName": string,
    "pageNos": string, "teacherName": string, "coreSkill": string
  },
  "curriculumAlignment": {
    "system": string, "stageLabel": string, "strand": string,
    "outcomeStatement": string,          // the outcome in plain words
    "code": null,                        // ONLY a real code if the brief gave one, else null
    "commandWords": [string]             // exam command words this lesson rehearses
  },
  "coreConcept": string,                 // the single central idea, one sentence
  "objectives": [                        // 3 to 5
    { "text": string,                    // full ABCD sentence
      "verb": string,                    // the measurable main verb only
      "bloomLevel": "Remember|Understand|Apply|Analyse|Evaluate|Create",
      "condition": string,               // the "given/using/in pairs" part
      "degree": string }                 // the success criterion, e.g. "4 out of 5"
  ],
  "successCriteria": [string],           // learner-facing "I can ..." ${is5E ? "(REQUIRED)" : "(one per objective)"}
  "skillsAndAttitude": { "skills": [string], "attitudes": [string], "psychomotor": [string] },
  "keyVocabulary": [ { "term": string, "definition": string, "localExample": string } ],
  "priorKnowledge": [string],
  "misconceptions": [ { "misconception": string, "howToAddress": string } ],
  "resources": [ { "item": string, "purpose": string, "noTechAlternative": string } ],
  "classroomManagement": { "rules": [string], "strategies": [string] },
  "methodology": { "primaryMethod": string, "supportingMethods": [string], "rationale": string },
  "contentDelivery": [string],           // the content split into teachable parts
  "procedure": [                         // stage minutes MUST total exactly ${brief.duration}
    { "title": string,                   // from the required stage titles
      "stageType": string,
      "minutes": number,
      "teacherDoes": string,             // script level: what the teacher says and does
      "studentsDo": string,
      "questions": [ { "q": string, "expected": string, "bloomLevel": string } ],
      "checkpoint": string }             // how the teacher knows to move on
  ],
  "boardSummary": { "heading": string, "lines": [string], "workedExample": string, "keyBox": [string] },
  "differentiation": { "support": [string], "extension": [string], "specialNeeds": [string] },
  "assessmentForLearning": [
    { "technique": string, "whenInLesson": string, "whatItReveals": string, "ifStudentsStruggle": string }
  ],
  "recapitulation": { "technique": string, "questions": [string] },
  "evaluation": { "items": [ { "question": string, "marks": number, "expectedAnswer": string, "bloomLevel": string } ], "totalMarks": number },
  "homework": { "task": string, "estimatedMinutes": number, "howItWillBeChecked": string, "differentiatedOption": string },
  "teacherReflection": [string]
}

Required procedure stage titles for the "${fmt?.name}" format:
${(fmt?.stageTitles ?? []).map((t) => `  - ${t}`).join("\n")}`;
}

/* ------------------------------ prompts ------------------------------ */

export function buildSystemPrompt(brief: LessonBrief): string {
  const packs = selectPacks(brief);
  const fmt = FORMAT_BY_ID[brief.format];
  const parts: string[] = [loadSkill()];

  for (const p of packs) {
    const body = loadPack(p);
    if (body) parts.push(`\n\n---\n\n${body}`);
  }

  parts.push(`\n\n---\n\n# FORMAT DIRECTIVE — ${fmt?.name ?? brief.format}\n\n${fmt?.directive ?? ""}`);

  if (brief.lowResource) {
    parts.push(`\n\n# LOW-RESOURCE MODE (ON)
This classroom has a blackboard and chalk and nothing else. No projector, no printer,
no internet, no photocopies, no laminated cards. Every resource must be either
(a) already in the room, (b) free and locally findable, or (c) drawable on the board in
under two minutes. If you name anything printed, the noTechAlternative must say exactly
how to run the activity without it.`);
  }

  if (!brief.includeHomework) {
    parts.push(`\n\n# HOMEWORK
The teacher does not want homework set. Put a single short line in homework.task saying
no written homework is assigned and give a two-minute oral revision instruction instead.`);
  }

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
