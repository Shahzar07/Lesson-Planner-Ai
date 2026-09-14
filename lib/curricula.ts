/* Structured curriculum metadata used to build the picker and to steer the model. */

export interface CurriculumDef {
  id: string;
  name: string;
  short: string;
  blurb: string;
  knowledgePacks: string[];
  grades: { value: string; label: string; stage: string; age: string }[];
  subjects: string[];
  books: string[];
  assessmentStyle: string;
}

const camGrades = [
  ...Array.from({ length: 6 }, (_, i) => ({
    value: `Stage ${i + 1}`,
    label: `Stage ${i + 1}`,
    stage: "Cambridge Primary",
    age: `${i + 5}–${i + 6}`,
  })),
  ...Array.from({ length: 3 }, (_, i) => ({
    value: `Stage ${i + 7}`,
    label: `Stage ${i + 7}`,
    stage: "Cambridge Lower Secondary",
    age: `${i + 11}–${i + 12}`,
  })),
  { value: "Year 10 (IGCSE/O Level)", label: "Year 10 — IGCSE / O Level", stage: "Cambridge Upper Secondary", age: "14–15" },
  { value: "Year 11 (IGCSE/O Level)", label: "Year 11 — IGCSE / O Level", stage: "Cambridge Upper Secondary", age: "15–16" },
  { value: "AS Level", label: "AS Level", stage: "Cambridge Advanced", age: "16–17" },
  { value: "A Level", label: "A Level", stage: "Cambridge Advanced", age: "17–18" },
];

const romanGrades = [
  ["I", "6"], ["II", "7"], ["III", "8"], ["IV", "9"], ["V", "10"],
  ["VI", "11"], ["VII", "12"], ["VIII", "13"], ["IX", "14"], ["X", "15"],
  ["XI", "16"], ["XII", "17"],
].map(([r, a]) => ({
  value: `Class ${r}`,
  label: `Class ${r}`,
  stage:
    ["I", "II", "III", "IV", "V"].includes(r) ? "Primary"
      : ["VI", "VII", "VIII"].includes(r) ? "Elementary"
      : ["IX", "X"].includes(r) ? "Secondary (SSC)"
      : "Higher Secondary (HSSC)",
  age: `${a}–${Number(a) + 1}`,
}));

export const CURRICULA: CurriculumDef[] = [
  {
    id: "cambridge",
    name: "Cambridge International (CAIE)",
    short: "Cambridge",
    blurb: "Primary, Lower Secondary, IGCSE / O Level and A Level.",
    knowledgePacks: ["cambridge", "bed-pedagogy", "blooms"],
    grades: camGrades,
    subjects: [
      "English", "English as a Second Language", "Mathematics", "Science",
      "Biology", "Chemistry", "Physics", "Global Perspectives",
      "Computer Science", "ICT", "Digital Literacy", "History", "Geography",
      "Business Studies", "Economics", "Accounting", "Art & Design",
    ],
    books: [
      "Cambridge Primary Mathematics Learner's Book",
      "Cambridge Primary English Learner's Book",
      "Cambridge Primary Science Learner's Book",
      "Cambridge Lower Secondary Mathematics Learner's Book",
      "Cambridge IGCSE Coursebook",
      "Oxford Cambridge-endorsed title",
    ],
    assessmentStyle:
      "Command-word driven. Teach the difference between describe, explain, compare and evaluate inside the lesson.",
  },
  {
    id: "sindh",
    name: "Sindh Board (STBB / BSEK / BISE)",
    short: "Sindh Board",
    blurb: "Sindh Textbook Board syllabus and SLOs, Classes I to XII.",
    knowledgePacks: ["sindh-board", "bed-pedagogy", "blooms"],
    grades: romanGrades,
    subjects: [
      "English", "Urdu", "Sindhi", "Mathematics", "General Science",
      "Physics", "Chemistry", "Biology", "Islamiat", "Pakistan Studies",
      "Social Studies", "Computer Science", "Geography", "History",
    ],
    books: [
      "Sindh Textbook Board (STBB) prescribed textbook",
      "Sindh Textbook Board — Urdu",
      "Sindh Textbook Board — Sindhi",
      "Sindh Textbook Board — General Science",
    ],
    assessmentStyle:
      "Board-exam stems: define, state, give reasons, differentiate between, write a note on, solve, draw and label. Always show the mark allocation.",
  },
  {
    id: "oxford",
    name: "Oxford (OUP Pakistan series)",
    short: "Oxford",
    blurb: "New Oxford Modern English, New Countdown, Oxford Progressive English and more.",
    knowledgePacks: ["oxford-pakistan", "bed-pedagogy", "blooms"],
    grades: romanGrades,
    subjects: [
      "English", "Mathematics", "Science", "Social Studies", "Islamiat",
      "Computer Science", "Urdu",
    ],
    books: [
      "New Oxford Modern English (NOME)",
      "Oxford Progressive English",
      "New Countdown (Mathematics)",
      "Oxford Reading Circle",
      "New Oxford Social Studies for Pakistan",
      "Oxford Progressive Islamiat",
      "New Oxford Science",
      "Oxford Grammar and Composition",
    ],
    assessmentStyle:
      "Unit-based. Name which slice of the unit this lesson covers: pre-reading, passage, comprehension, skill focus, independent exercise or composition.",
  },
  {
    id: "fbise",
    name: "Federal Board (FBISE) / National Curriculum",
    short: "Federal",
    blurb: "FBISE scheme of studies and the National Curriculum of Pakistan.",
    knowledgePacks: ["sindh-board", "bed-pedagogy", "blooms"],
    grades: romanGrades,
    subjects: [
      "English", "Urdu", "Mathematics", "General Science", "Physics",
      "Chemistry", "Biology", "Islamiat", "Pakistan Studies",
      "Computer Science", "Social Studies",
    ],
    books: [
      "National Book Foundation (NBF) textbook",
      "Punjab Curriculum and Textbook Board title",
      "FBISE prescribed textbook",
    ],
    assessmentStyle:
      "SLO-referenced. Objective + subjective paper split; rehearse both question types.",
  },
  {
    id: "akueb",
    name: "Aga Khan University Examination Board (AKU-EB)",
    short: "AKU-EB",
    blurb: "SSC and HSSC with a strong higher-order-thinking emphasis.",
    knowledgePacks: ["sindh-board", "bed-pedagogy", "blooms"],
    grades: romanGrades.filter((g) => ["IX", "X", "XI", "XII"].some((r) => g.value.endsWith(` ${r}`))),
    subjects: [
      "English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology",
      "Islamiat", "Pakistan Studies", "Computer Science",
    ],
    books: ["AKU-EB recommended textbook", "Sindh Textbook Board (STBB) prescribed textbook"],
    assessmentStyle:
      "Cognitive-level tagged items (Knowledge / Understanding / Application). Weight the Evaluation section toward Understanding and Application.",
  },
];

export const CURRICULUM_BY_ID = Object.fromEntries(CURRICULA.map((c) => [c.id, c]));

export const DURATIONS = [30, 35, 40, 45, 50, 60, 80, 90];

export const CORE_SKILLS_EN = [
  "Listening", "Speaking", "Reading", "Writing", "Critical thinking",
  "Problem solving", "Scientific enquiry", "Numeracy", "Creative expression",
  "Collaboration",
];

export const CORE_SKILLS_UR = [
  "سننا", "بولنا", "پڑھنا", "لکھنا", "تنقیدی سوچ",
  "مسئلہ کشائی", "تخلیقی اظہار", "باہمی تعاون",
];
