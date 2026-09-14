import { z } from "zod";

/* ------------------------------------------------------------------ *
 * Sabaq AI — the single canonical lesson-plan shape.
 *
 * Every output format (B.Ed English, Urdu سبقی خاکہ, Cambridge 5E) is a
 * *view* over this one object. One schema means one validator, one repair
 * path and one exporter, instead of three of each.
 * ------------------------------------------------------------------ */

export const BLOOM_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyse",
  "Evaluate",
  "Create",
] as const;
export type BloomLevel = (typeof BLOOM_LEVELS)[number];

const nonEmpty = z.string().trim().min(1);

export const ObjectiveSchema = z.object({
  text: nonEmpty,
  verb: nonEmpty,
  bloomLevel: z.enum(BLOOM_LEVELS),
  condition: z.string().default(""),
  degree: z.string().default(""),
});

export const QuestionSchema = z.object({
  q: nonEmpty,
  expected: z.string().default(""),
  bloomLevel: z.enum(BLOOM_LEVELS).catch("Understand"),
});

export const StageSchema = z.object({
  title: nonEmpty,
  stageType: z.string().default(""),
  minutes: z.coerce.number().int().min(0).max(240),
  teacherDoes: nonEmpty,
  studentsDo: z.string().default(""),
  questions: z.array(QuestionSchema).default([]),
  checkpoint: z.string().default(""),
});

export const ResourceSchema = z.object({
  item: nonEmpty,
  purpose: z.string().default(""),
  noTechAlternative: z.string().default(""),
});

export const VocabSchema = z.object({
  term: nonEmpty,
  definition: z.string().default(""),
  localExample: z.string().default(""),
});

export const MisconceptionSchema = z.object({
  misconception: nonEmpty,
  howToAddress: z.string().default(""),
});

export const AflSchema = z.object({
  technique: nonEmpty,
  whenInLesson: z.string().default(""),
  whatItReveals: z.string().default(""),
  ifStudentsStruggle: z.string().default(""),
});

export const EvalItemSchema = z.object({
  question: nonEmpty,
  marks: z.coerce.number().min(0).default(1),
  expectedAnswer: z.string().default(""),
  bloomLevel: z.enum(BLOOM_LEVELS).catch("Understand"),
});

export const LessonPlanSchema = z.object({
  meta: z.object({
    lessonNo: z.string().default(""),
    date: z.string().default(""),
    grade: z.string().default(""),
    section: z.string().default(""),
    subject: z.string().default(""),
    topic: z.string().default(""),
    duration: z.coerce.number().int().min(5).max(240).default(40),
    classStrength: z.string().default(""),
    averageAge: z.string().default(""),
    bookName: z.string().default(""),
    pageNos: z.string().default(""),
    teacherName: z.string().default(""),
    coreSkill: z.string().default(""),
  }).default({}),

  curriculumAlignment: z.object({
    system: z.string().default(""),
    stageLabel: z.string().default(""),
    strand: z.string().default(""),
    outcomeStatement: z.string().default(""),
    /** null unless the teacher supplied a real code. Never invented. */
    code: z.string().nullable().default(null),
    commandWords: z.array(z.string()).default([]),
  }).default({}),

  coreConcept: z.string().default(""),
  objectives: z.array(ObjectiveSchema).min(1),
  successCriteria: z.array(z.string()).default([]),

  skillsAndAttitude: z.object({
    skills: z.array(z.string()).default([]),
    attitudes: z.array(z.string()).default([]),
    psychomotor: z.array(z.string()).default([]),
  }).default({}),

  keyVocabulary: z.array(VocabSchema).default([]),
  priorKnowledge: z.array(z.string()).default([]),
  misconceptions: z.array(MisconceptionSchema).default([]),
  resources: z.array(ResourceSchema).default([]),

  classroomManagement: z.object({
    rules: z.array(z.string()).default([]),
    strategies: z.array(z.string()).default([]),
  }).default({}),

  methodology: z.object({
    primaryMethod: z.string().default(""),
    supportingMethods: z.array(z.string()).default([]),
    rationale: z.string().default(""),
  }).default({}),

  /** ترسیلِ مواد — the content broken into teachable parts. */
  contentDelivery: z.array(z.string()).default([]),

  procedure: z.array(StageSchema).min(1),

  boardSummary: z.object({
    heading: z.string().default(""),
    lines: z.array(z.string()).default([]),
    workedExample: z.string().default(""),
    keyBox: z.array(z.string()).default([]),
  }).default({}),

  differentiation: z.object({
    support: z.array(z.string()).default([]),
    extension: z.array(z.string()).default([]),
    specialNeeds: z.array(z.string()).default([]),
  }).default({}),

  assessmentForLearning: z.array(AflSchema).default([]),

  recapitulation: z.object({
    technique: z.string().default(""),
    questions: z.array(z.string()).default([]),
  }).default({}),

  evaluation: z.object({
    items: z.array(EvalItemSchema).default([]),
    totalMarks: z.coerce.number().default(0),
  }).default({}),

  homework: z.object({
    task: z.string().default(""),
    estimatedMinutes: z.coerce.number().default(0),
    howItWillBeChecked: z.string().default(""),
    differentiatedOption: z.string().default(""),
  }).default({}),

  teacherReflection: z.array(z.string()).default([]),
});

export type LessonPlan = z.infer<typeof LessonPlanSchema>;
export type Objective = z.infer<typeof ObjectiveSchema>;
export type Stage = z.infer<typeof StageSchema>;

/* ----------------------------- the brief ----------------------------- */

export interface LessonBrief {
  curriculum: string;
  grade: string;
  subject: string;
  topic: string;
  duration: number;
  classStrength: string;
  averageAge: string;
  bookName: string;
  pageNos: string;
  teacherName: string;
  section: string;
  date: string;
  lessonNo: string;
  coreSkill: string;
  language: "en" | "ur";
  format: string;
  priorKnowledge: string;
  notes: string;
  lowResource: boolean;
  includeHomework: boolean;
  strictRepair: boolean;
}

/* --------------------------- scoring output -------------------------- */

export interface RubricCheck {
  id: string;
  label: string;
  weight: number;
  passed: boolean;
  detail: string;
}

export interface QualityReport {
  score: number;
  checks: RubricCheck[];
  failures: RubricCheck[];
}
