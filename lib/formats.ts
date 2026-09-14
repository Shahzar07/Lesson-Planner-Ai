/* The three output formats. Each is a *view* over the canonical LessonPlan. */

export interface SectionDef {
  /** dot-path into the LessonPlan */
  key: string;
  label: string;
  /** rendered even when empty (so the printed sheet leaves writing space) */
  keepBlank?: boolean;
}

export interface FormatDef {
  id: string;
  name: string;
  nativeName: string;
  language: "en" | "ur";
  blurb: string;
  source: string;
  /** stage titles the model must use, in order */
  stageTitles: string[];
  sections: SectionDef[];
  /** extra instructions injected into the system prompt */
  directive: string;
}

export const FORMATS: FormatDef[] = [
  {
    id: "bed-english",
    name: "B.Ed Standard (English)",
    nativeName: "B.Ed Standard",
    language: "en",
    blurb:
      "The teaching-practice format used across Pakistani B.Ed and ADE programmes. Supervisor feedback block included.",
    source: "Matches the supplied LESSON PLAN FORMAT sheet, field for field.",
    stageTitles: [
      "Initiation Activity",
      "Development",
      "Board Summary",
      "Recapitulation",
      "Evaluation",
    ],
    sections: [
      { key: "meta", label: "Lesson Plan Header" },
      { key: "objectives", label: "Specific Objectives" },
      { key: "skillsAndAttitude", label: "Skills / Attitude" },
      { key: "resources", label: "Teaching Resources" },
      { key: "classroomManagement", label: "Classroom Management Rules & Strategy" },
      { key: "methodology", label: "Teaching Methodology" },
      { key: "procedure", label: "Procedure" },
      { key: "boardSummary", label: "Board Summary" },
      { key: "recapitulation", label: "Recapitulation" },
      { key: "evaluation", label: "Evaluation" },
      { key: "homework", label: "Homework" },
      { key: "supervisorFeedback", label: "Supervisor Feedback", keepBlank: true },
    ],
    directive: `Use exactly these procedure stage titles, in this order:
"Initiation Activity", then one or more "Development" stages (title them
"Development — <focus>" when there is more than one), then "Board Summary",
then "Recapitulation", then "Evaluation". Homework is a separate field, not a
stage, and its minutes are counted inside the Evaluation stage.
Leave the supervisor feedback block for a human to fill.`,
  },
  {
    id: "urdu-sabqi-khaka",
    name: "سبقی خاکہ (Urdu)",
    nativeName: "سبقی خاکہ",
    language: "ur",
    blurb:
      "معیاری اردو سبقی خاکہ — مکمل منصوبہ اردو میں، بشمول اعلانِ سبق، ترسیلِ مواد اور جانچ۔",
    source: "فراہم کردہ سبقی خاکہ فارمیٹ کے عین مطابق۔",
    stageTitles: [
      "ابتدائی سرگرمی",
      "اعلانِ سبق",
      "سرگرمی نمبر ۱",
      "سرگرمی نمبر ۲",
      "خلاصۂِ تختۂِ سیاہ / اعادہ",
      "جانچ",
    ],
    sections: [
      { key: "meta", label: "سبقی خاکہ" },
      { key: "objectives", label: "مقاصدِ تدریس" },
      { key: "classroomManagement.rules", label: "اصول و ضوابط برائے منظم کمرۂِ جماعت" },
      { key: "classroomManagement.strategies", label: "حکمتِ عمل برائے منظم کمرۂِ جماعت" },
      { key: "resources", label: "سمعی و بصری اعانات" },
      { key: "methodology", label: "طریقۂِ تدریس" },
      { key: "contentDelivery", label: "ترسیلِ مواد ( جُز / جُزو )" },
      { key: "coreConcept", label: "سبق کا بنیادی تصور" },
      { key: "procedure", label: "اہم اسباقی مدارج" },
      { key: "boardSummary", label: "خلاصۂِ تختۂِ سیاہ / اعادہ" },
      { key: "evaluation", label: "جانچ" },
      { key: "homework", label: "تفویض" },
      { key: "coTeacherFeedback", label: "معاون معلم / معلمہ کے تاثرات", keepBlank: true },
      { key: "supervisorFeedback", label: "نگراں معلم / معلمہ کے تاثرات", keepBlank: true },
    ],
    directive: `پورا منصوبہ اردو میں لکھیں۔ Every single string value in the JSON must be in
Urdu script, including stage titles, questions, expected answers and vocabulary
definitions. Do not mix English sentences into the Urdu plan; established technical
terms may stay in Urdu transliteration.
Use exactly these stage titles in order: "ابتدائی سرگرمی", "اعلانِ سبق",
"سرگرمی نمبر ۱", "سرگرمی نمبر ۲" (and "سرگرمی نمبر ۳" if the duration allows),
"خلاصۂِ تختۂِ سیاہ / اعادہ", "جانچ".
The two feedback blocks are filled by a human, so leave them out of the JSON.`,
  },
  {
    id: "cambridge-5e",
    name: "Cambridge 5E (English)",
    nativeName: "Cambridge 5E",
    language: "en",
    blurb:
      "Engage, Explore, Explain, Elaborate, Evaluate — with learner-facing success criteria and anticipated misconceptions.",
    source: "Built on the Cambridge Approaches to Teaching and Learning.",
    stageTitles: ["Engage", "Explore", "Explain", "Elaborate", "Evaluate"],
    sections: [
      { key: "meta", label: "Lesson Overview" },
      { key: "curriculumAlignment", label: "Curriculum Alignment" },
      { key: "objectives", label: "Learning Objectives" },
      { key: "successCriteria", label: "Success Criteria (learner facing)" },
      { key: "keyVocabulary", label: "Key Vocabulary & Language Awareness" },
      { key: "priorKnowledge", label: "Prior Knowledge" },
      { key: "misconceptions", label: "Anticipated Misconceptions" },
      { key: "resources", label: "Resources" },
      { key: "methodology", label: "Approach" },
      { key: "procedure", label: "Lesson Sequence (5E)" },
      { key: "assessmentForLearning", label: "Assessment for Learning" },
      { key: "differentiation", label: "Differentiation" },
      { key: "boardSummary", label: "Board / Anchor Chart" },
      { key: "evaluation", label: "Plenary Assessment" },
      { key: "homework", label: "Home Learning" },
      { key: "teacherReflection", label: "Post-lesson Reflection" },
    ],
    directive: `Use exactly these five stage titles in order: "Engage", "Explore",
"Explain", "Elaborate", "Evaluate". Write successCriteria as learner-facing
"I can ..." statements, one per objective. Populate misconceptions with at least two
genuine, subject-specific misconceptions for this topic and age, each with a concrete
way to surface and correct it during the lesson. Name the Cambridge pillar each stage
leans on inside methodology.rationale.`,
  },
];

export const FORMAT_BY_ID = Object.fromEntries(FORMATS.map((f) => [f.id, f]));
export const formatsForLanguage = (lang: "en" | "ur") =>
  FORMATS.filter((f) => f.language === lang);
