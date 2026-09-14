import { validate, autoBalance } from "../.test-build/validator.js";
import { parseLoose, repairPartial, extract } from "../.test-build/partial-json.js";
import { applyEdits, getAt, parsePointer, buildIndex, sectionOf } from "../.test-build/patch.js";
import { rankModels, fetchFreeModels, resolveChain, SEED } from "../.test-build/models.js";
import { salvagePlan } from "../.test-build/salvage.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { fail++; console.log(`  \x1b[31m✗ ${name}\x1b[0m ${extra}`); }
};

const brief = { language: "en", duration: 40, pageNos: "", lowResource: false };

const GOOD = {
  meta: { duration: 40, pageNos: "", subject: "Mathematics", topic: "Equivalent Fractions", grade: "Stage 4", lessonNo: "", date: "", section: "", classStrength: "40", averageAge: "9", bookName: "", teacherName: "", coreSkill: "Numeracy" },
  curriculumAlignment: { system: "Cambridge", stageLabel: "Stage 4", strand: "Number", outcomeStatement: "Recognise equivalence", code: null, commandWords: ["explain"] },
  coreConcept: "Two fractions can name the same amount.",
  objectives: [
    { text: "Students will be able to generate two equivalent fractions using a fraction wall, correctly for 4 of 5.", verb: "generate", bloomLevel: "Apply", condition: "using a fraction wall", degree: "4 of 5" },
    { text: "Students will be able to explain why 1/2 and 3/6 are equal, using a diagram, in two sentences.", verb: "explain", bloomLevel: "Understand", condition: "using a diagram", degree: "two sentences" },
    { text: "Students will be able to find the error in a wrong equivalence, given three worked pairs.", verb: "analyse", bloomLevel: "Analyse", condition: "given three worked pairs", degree: "all three identified" },
  ],
  successCriteria: ["I can make an equal fraction."],
  skillsAndAttitude: { skills: ["Numeracy"], attitudes: ["Works with a partner"], psychomotor: ["Draws a fraction wall neatly"] },
  keyVocabulary: [{ term: "equivalent", definition: "equal in value", localExample: "half a roti" }],
  priorKnowledge: ["Names parts of a fraction"],
  misconceptions: [{ misconception: "Bigger denominator means bigger fraction", howToAddress: "Compare 1/2 and 1/8 on the wall" }],
  resources: [{ item: "Fraction wall drawn on the board", purpose: "compare", noTechAlternative: "chalk on the board" }],
  classroomManagement: { rules: ["We raise a hand before speaking."], strategies: ["Countdown from five as the attention signal"] },
  methodology: { primaryMethod: "Activity-based learning", supportingMethods: ["Think-Pair-Share"], rationale: "Concrete before abstract." },
  contentDelivery: ["Part 1: the wall", "Part 2: the rule"],
  procedure: [
    { title: "Initiation Activity", stageType: "starter", minutes: 5, teacherDoes: "Draw a roti on the board and cut it into two. Ask who gets more if it is cut into four and a child takes two pieces. Write both fractions side by side and leave them there.", studentsDo: "Answer on slates", questions: [{ q: "Is one half the same as two quarters?", expected: "Yes, same amount", bloomLevel: "Understand" }, { q: "How do you know?", expected: "The shaded part is the same size", bloomLevel: "Analyse" }], checkpoint: "Most slates show yes" },
    { title: "Development", stageType: "main", minutes: 22, teacherDoes: "Hand each pair a fraction wall and model finding one equivalent pair aloud, narrating the multiplier. Then release them to find three more pairs while you circulate and note who multiplies only the numerator.", studentsDo: "Work in pairs on the wall", questions: [{ q: "What did you multiply the top and bottom by?", expected: "The same number", bloomLevel: "Apply" }, { q: "What happens if you only double the top?", expected: "It is no longer equal", bloomLevel: "Analyse" }], checkpoint: "At least three pairs found by most" },
    { title: "Board Summary", stageType: "board", minutes: 5, teacherDoes: "Write the rule in a box on the board and add two worked pairs beneath it. Point to each step as you say it so learners copy in the right order.", studentsDo: "Copy into notebooks", questions: [{ q: "What goes in the box?", expected: "Multiply top and bottom by the same number", bloomLevel: "Remember" }, { q: "Give me one more pair.", expected: "Any correct pair", bloomLevel: "Apply" }], checkpoint: "Notebooks show the boxed rule" },
    { title: "Recapitulation", stageType: "recap", minutes: 4, teacherDoes: "Cold call five learners using lollipop sticks and ask each for one equivalent fraction to 2/3. Write each answer up and let the class thumbs it.", studentsDo: "Answer and vote", questions: [{ q: "Give one fraction equal to 2/3.", expected: "4/6, 6/9", bloomLevel: "Apply" }, { q: "Why is 3/4 not equal to 2/3?", expected: "Different multiplier", bloomLevel: "Evaluate" }], checkpoint: "Four of five correct" },
    { title: "Evaluation", stageType: "assess", minutes: 4, teacherDoes: "Dictate three short items and collect the slips at the door as learners leave. Mark them before the next period so you know who to seat at the front.", studentsDo: "Write the exit slip", questions: [{ q: "Write two fractions equal to 1/3.", expected: "2/6 and 3/9", bloomLevel: "Apply" }, { q: "True or false: 2/5 = 4/10", expected: "True", bloomLevel: "Understand" }], checkpoint: "Slips collected" },
  ],
  boardSummary: { heading: "Equivalent Fractions", lines: ["Same amount, different name"], workedExample: "1/2 = 2/4 = 3/6", keyBox: ["Multiply top and bottom by the same number"] },
  differentiation: { support: ["A half-completed fraction wall and a partner who has already matched three pairs.", "Sentence starter written on the desk: 'These are equal because...'"], extension: ["Find a pair where the multiplier is greater than five and prove it on the wall.", "Write one wrong equivalence for a friend to find the error in."], specialNeeds: ["Front bench seating for the two learners with low vision."] },
  assessmentForLearning: [
    { technique: "Mini whiteboards, all show together", whenInLesson: "minute 22", whatItReveals: "Who multiplies only the numerator", ifStudentsStruggle: "Reteach the multiplier on the wall" },
    { technique: "Exit ticket", whenInLesson: "minute 38", whatItReveals: "Retention of the rule", ifStudentsStruggle: "Start next lesson with the wall again" },
  ],
  recapitulation: { technique: "Cold call with lollipop sticks", questions: ["Give one fraction equal to 2/3."] },
  evaluation: { items: [{ question: "Write two fractions equal to 1/3.", marks: 2, expectedAnswer: "2/6, 3/9", bloomLevel: "Apply" }], totalMarks: 2 },
  homework: { task: "Find three equivalent pairs using the wall in your notebook.", estimatedMinutes: 10, howItWillBeChecked: "Checked at the start of next period", differentiatedOption: "Supported learners find two." },
  teacherReflection: ["Did the wall help or distract?"],
};

console.log("\n\x1b[1mAccuracy engine\x1b[0m");
const good = validate(structuredClone(GOOD), brief);
ok(`a correct plan scores 100 (got ${good.score})`, good.score === 100, JSON.stringify(good.failures.map(f => f.label)));

// --- each check must actually fire ---
const mutate = (fn) => { const p = structuredClone(GOOD); fn(p); return validate(p, brief); };

ok("catches timings that do not add up",
  mutate(p => { p.procedure[1].minutes = 30; }).failures.some(f => f.id === "timing"));

ok('catches a banned verb ("understand")',
  mutate(p => { p.objectives[0] = { ...p.objectives[0], text: "Students will understand fractions.", verb: "understand" }; })
    .failures.some(f => f.id === "measurable"));

ok("catches a missing condition or degree",
  mutate(p => { p.objectives[0].degree = ""; }).failures.some(f => f.id === "abcd"));

ok("catches a flat Bloom spread",
  mutate(p => { p.objectives.forEach(o => { o.bloomLevel = "Remember"; }); }).failures.some(f => f.id === "bloom"));

ok("catches a vague methodology",
  mutate(p => { p.methodology.primaryMethod = "good teaching"; p.methodology.supportingMethods = []; })
    .failures.some(f => f.id === "method"));

ok("catches a procedure that is not script level",
  mutate(p => { p.procedure[1].teacherDoes = "Teach the topic."; }).failures.some(f => f.id === "procedure"));

ok("catches a question with no expected answer",
  mutate(p => { p.procedure[0].questions[0].expected = ""; }).failures.some(f => f.id === "answers"));

ok('catches vague differentiation',
  mutate(p => { p.differentiation.support = ["Help weak students"]; }).failures.some(f => f.id === "differentiation"));

ok("catches missing AfL checkpoints",
  mutate(p => { p.assessmentForLearning = []; }).failures.some(f => f.id === "afl"));

ok("catches an invented page number",
  mutate(p => { p.homework.task = "Do the sums on page 47."; }).failures.some(f => f.id === "citations"));

ok("catches an invented Cambridge code",
  mutate(p => { p.curriculumAlignment.code = "4Nc.03"; }).failures.some(f => f.id === "citations"));

ok("allows a page number the teacher DID supply", (() => {
  const p = structuredClone(GOOD);
  p.meta.pageNos = "47-49"; p.homework.task = "Do the sums on page 47.";
  return !validate(p, { ...brief, pageNos: "47-49" }).failures.some(f => f.id === "citations");
})());

ok("catches dollar pricing",
  mutate(p => { p.coreConcept = "A pizza costs $5."; }).failures.some(f => f.id === "context"));

ok("catches a projector with no fallback",
  mutate(p => { p.resources.push({ item: "Projector and video", purpose: "show cycle", noTechAlternative: "" }); })
    .failures.some(f => f.id === "context"));

console.log("\n\x1b[1mAuto-balance\x1b[0m");
const drift = structuredClone(GOOD); drift.procedure[1].minutes = 20; // totals 38
const fixed = autoBalance(drift);
const sum = fixed.procedure.reduce((n, s) => n + s.minutes, 0);
ok(`nudges 38 back to 40 (got ${sum})`, sum === 40);

const wild = structuredClone(GOOD); wild.procedure[1].minutes = 90; // way off
ok("refuses to silently fix a wild mismatch",
  autoBalance(wild).procedure.reduce((n, s) => n + s.minutes, 0) !== 40);

console.log("\n\x1b[1mTolerant JSON\x1b[0m");
ok("parses clean JSON", parseLoose('{"a":1}')?.a === 1);
ok("strips a ```json fence", parseLoose('```json\n{"a":2}\n```')?.a === 2);
ok("ignores prose before the object", parseLoose('Here is your plan:\n{"a":3}\nHope that helps!')?.a === 3);
ok("closes a truncated object", parseLoose('{"a":1,"b":{"c":[1,2')?.a === 1);
ok("closes a truncated string", parseLoose('{"a":"half a senten')?.a !== undefined);
ok("handles braces inside strings", parseLoose('{"a":"a } brace","b":7}')?.b === 7);
ok("handles escaped quotes", parseLoose('{"a":"say \\"hi\\"","b":8}')?.b === 8);
ok("returns null on junk", parseLoose("not json at all") === null);
ok("handles Urdu content", parseLoose('{"t":"سبقی خاکہ"}')?.t === "سبقی خاکہ");


console.log("\n\x1b[1mTargeted edits (JSON Pointer)\x1b[0m");

const base = () => structuredClone(GOOD);

ok("replaces a nested string", (() => {
  const r = applyEdits(base(), [{ path: "/coreConcept", value: "New idea." }]);
  return r.doc.coreConcept === "New idea." && r.applied.length === 1 && !r.rejected.length;
})());

ok("records the before value for the diff", (() => {
  const r = applyEdits(base(), [{ path: "/coreConcept", value: "x" }]);
  return r.applied[0].before === GOOD.coreConcept && r.applied[0].after === "x";
})());

ok("edits an item inside an array", (() => {
  const r = applyEdits(base(), [{ path: "/objectives/1/bloomLevel", value: "Create" }]);
  return r.doc.objectives[1].bloomLevel === "Create" && r.doc.objectives[0].bloomLevel === "Apply";
})());

ok("appends with a trailing dash", (() => {
  const n = GOOD.differentiation.extension.length;
  const r = applyEdits(base(), [{ op: "add", path: "/differentiation/extension/-", value: "Another task." }]);
  return r.doc.differentiation.extension.length === n + 1 &&
         r.doc.differentiation.extension.at(-1) === "Another task.";
})());

ok("inserts at a position", (() => {
  const r = applyEdits(base(), [{ op: "add", path: "/priorKnowledge/0", value: "First." }]);
  return r.doc.priorKnowledge[0] === "First." && r.doc.priorKnowledge.length === GOOD.priorKnowledge.length + 1;
})());

ok("removes an array item", (() => {
  const n = GOOD.procedure.length;
  const r = applyEdits(base(), [{ op: "remove", path: "/procedure/1" }]);
  return r.doc.procedure.length === n - 1 && r.doc.procedure[1].title === "Board Summary";
})());

ok("never mutates the input document", (() => {
  const input = base();
  applyEdits(input, [{ path: "/coreConcept", value: "mutated" }]);
  return input.coreConcept === GOOD.coreConcept;
})());

ok("applies several edits in one pass", (() => {
  const r = applyEdits(base(), [
    { path: "/procedure/1/minutes", value: 18 },
    { path: "/procedure/2/minutes", value: 9 },
  ]);
  return r.applied.length === 2 && r.doc.procedure[1].minutes === 18 && r.doc.procedure[2].minutes === 9;
})());

// --- the hostile cases: these paths come from a language model ---
ok("rejects a hallucinated field instead of creating it", (() => {
  const r = applyEdits(base(), [{ path: "/madeUpSection", value: "nope" }]);
  return !("madeUpSection" in r.doc) && r.rejected.length === 1 && !r.applied.length;
})());

ok("rejects a path through a field that does not exist", (() => {
  const r = applyEdits(base(), [{ path: "/nope/deeper/x", value: 1 }]);
  return r.rejected.length === 1 && !r.applied.length;
})());

ok("rejects an out-of-range array index", (() => {
  const r = applyEdits(base(), [{ path: "/objectives/99/text", value: "x" }]);
  return r.rejected.length === 1 && r.doc.objectives.length === GOOD.objectives.length;
})());

ok("blocks __proto__ pollution", (() => {
  const r = applyEdits(base(), [{ path: "/__proto__/polluted", value: true }]);
  return r.rejected.length === 1 && ({}).polluted === undefined;
})());

ok("blocks a constructor/prototype path", (() => {
  const r = applyEdits(base(), [{ path: "/constructor/prototype/x", value: 1 }]);
  return r.rejected.length === 1 && ({}).x === undefined;
})());

ok("rejects a malformed pointer", (() => {
  const r = applyEdits(base(), [{ path: "objectives/0/text", value: "x" }]);
  return r.rejected.length === 1;
})());

ok("rejects a replace with no value", (() => {
  const r = applyEdits(base(), [{ path: "/coreConcept" }]);
  return r.rejected.length === 1 && r.doc.coreConcept === GOOD.coreConcept;
})());

ok("keeps good edits when one in the batch is bad", (() => {
  const r = applyEdits(base(), [
    { path: "/coreConcept", value: "kept" },
    { path: "/notAThing", value: "dropped" },
  ]);
  return r.doc.coreConcept === "kept" && r.applied.length === 1 && r.rejected.length === 1;
})());

ok("getAt reads a nested value", getAt(GOOD, "/procedure/0/title") === "Initiation Activity");
ok("getAt returns undefined for a bad path", getAt(GOOD, "/procedure/9/title") === undefined);
ok("parsePointer unescapes ~1 and ~0", JSON.stringify(parsePointer("/a~1b/c~0d")) === JSON.stringify(["a/b", "c~d"]));
ok("sectionOf finds the top-level key", sectionOf("/objectives/1/text") === "objectives");

console.log("\n\x1b[1mAddressable index\x1b[0m");
const idx = buildIndex(GOOD);
ok("indexes every leaf as a pointer", idx.length > 60, `got ${idx.length}`);
ok("indexes an objective's text", idx.some(l => l.startsWith("/objectives/0/text = ")));
ok("truncates long values", idx.every(l => l.length < 200));
ok("every indexed path resolves", idx.every(l => getAt(GOOD, l.split(" = ")[0]) !== undefined));


console.log("\n\x1b[1mModel ranking\x1b[0m");
const M = (id, context = 64000) => ({ id, name: id, context });
const PREF_EN = ["deepseek-chat","deepseek-v3","glm-4","glm","qwen3","qwen","llama-3.3","nemotron","mistral-small"];
const PREF_UR = ["qwen3","qwen","glm-4","glm","deepseek-chat"];

ok("prefers a named family over an unknown one",
  rankModels([M("someone/unknown-model:free"), M("z-ai/glm-4.6:free")], PREF_EN)[0] === "z-ai/glm-4.6:free");

ok("puts Qwen first for Urdu, GLM first for English", (() => {
  const pool = [M("z-ai/glm-4.6:free"), M("qwen/qwen3-max:free"), M("meta-llama/llama-3.3-70b:free")];
  return rankModels(pool, PREF_UR)[0].includes("qwen") && rankModels(pool, PREF_EN)[0].includes("glm");
})());

ok("matches a future version of a known family", (() => {
  // the whole point: qwen4 should rank like qwen3 without a code change
  const pool = [M("someone/unknown:free"), M("qwen/qwen4-500b:free")];
  return rankModels(pool, PREF_UR)[0] === "qwen/qwen4-500b:free";
})());

ok("breaks ties on context length", (() => {
  const r = rankModels([M("z-ai/glm-4-air:free", 32000), M("z-ai/glm-4-plus:free", 200000)], PREF_EN);
  return r[0] === "z-ai/glm-4-plus:free";
})());

ok("keeps unknown models rather than dropping them", (() => {
  const pool = [M("a/unknown-one:free"), M("b/unknown-two:free")];
  return rankModels(pool, PREF_EN).length === 2;
})());

ok("never mutates the pool it was given", (() => {
  const pool = [M("z/b:free"), M("a/glm-4:free")];
  const before = pool.map(m => m.id).join(",");
  rankModels(pool, PREF_EN);
  return pool.map(m => m.id).join(",") === before;
})());

ok("handles an empty catalogue", rankModels([], PREF_EN).length === 0);

// Straight from a real deployment's diagnosis: this key only sees nvidia models.
const NVIDIA_POOL = [
  M("nvidia/nemotron-3.5-lightning:free"),
  M("nvidia/nemotron-3-ultra-550b-a55b:free"),
  M("nvidia/nemotron-3-super-120b-a12b:free"),
  M("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"),
];
const PREF_REAL = ["glm-4","glm","deepseek-chat","deepseek-v3","qwen3","qwen",
                   "nemotron-3.5","lightning","nemotron","llama-3.3"];

ok("puts the explicitly-reasoning model LAST", (() => {
  const r = rankModels(NVIDIA_POOL, PREF_REAL);
  return r[r.length - 1].includes("reasoning");
})());

ok("still keeps the reasoning model as a fallback, not dropped",
   rankModels(NVIDIA_POOL, PREF_REAL).length === 4);

ok("prefers the fast nemotron when that is all there is",
   rankModels(NVIDIA_POOL, PREF_REAL)[0].includes("lightning"));

ok("a plain model always outranks a reasoning one of a better family", (() => {
  const pool = [M("z-ai/glm-4-reasoning:free"), M("meta-llama/llama-3.3-70b:free")];
  return rankModels(pool, PREF_REAL)[0].includes("llama");
})());


console.log("\n\x1b[1mLive catalogue parsing\x1b[0m");

const entry = (id, over = {}) => ({
  id, name: id, context_length: 64000,
  pricing: { prompt: "0", completion: "0" },
  architecture: { input_modalities: ["text"], output_modalities: ["text"] },
  ...over,
});
const realFetch = globalThis.fetch;
const stub = (payload, opts = {}) => {
  globalThis.fetch = async () => ({
    ok: opts.ok !== false,
    status: opts.status ?? 200,
    json: async () => payload,
  });
};
const restore = () => { globalThis.fetch = realFetch; };
// fetchFreeModels caches per module; bust it by advancing nothing and using
// distinct assertions on one fetch where possible.
const fresh = async (payload, opts) => {
  stub(payload, opts);
  const mod = await import(`../.test-build/models.js?bust=${Math.random()}`);
  return mod;
};

{
  const m = await fresh({ data: [
    entry("z-ai/glm-4.6:free"),
    entry("paid/expensive", { pricing: { prompt: "0.0000015", completion: "0.000002" } }),
    entry("meta-llama/llama-guard-4:free"),
    entry("tiny/model:free", { context_length: 4096 }),
    entry("some/embedder:free"),
    entry("qwen/qwen3-max:free"),
  ]});
  const free = await m.fetchFreeModels();
  const ids = free.map(f => f.id);
  ok("keeps genuinely free models", ids.includes("z-ai/glm-4.6:free") && ids.includes("qwen/qwen3-max:free"));
  ok("drops paid models", !ids.includes("paid/expensive"));
  ok("drops safety-classifier models", !ids.some(i => i.includes("guard")));
  ok("drops embedding models", !ids.some(i => i.includes("embed")));
  ok("drops context windows too small for a lesson plan", !ids.includes("tiny/model:free"));
  restore();
}

{
  // A model priced "0" without the :free suffix still counts as free.
  const m = await fresh({ data: [entry("vendor/zero-cost-model")] });
  const free = await m.fetchFreeModels();
  ok("detects free by price, not just the :free suffix", free.length === 1);
  restore();
}

{
  const m = await fresh({ data: [entry("image/only:free", { architecture: { output_modalities: ["image"] } })] });
  ok("drops models that cannot output text", (await m.fetchFreeModels()).length === 0);
  restore();
}

{
  // catalogue down -> must fall back to the seed, never throw at the caller
  globalThis.fetch = async () => { throw new Error("ENETUNREACH"); };
  const m = await import(`../.test-build/models.js?bust=${Math.random()}`);
  const r = await m.resolveChain("en");
  ok("falls back to the seed when the catalogue is unreachable",
     r.source === "seed" && r.chain.length > 0);
  ok("says why it fell back", typeof r.note === "string" && r.note.includes("ENETUNREACH"));
  restore();
}

{
  const m = await fresh({ data: [entry("z-ai/glm-4.6:free"), entry("qwen/qwen3-max:free")] });
  const r = await m.resolveChain("ur");
  ok("uses the live catalogue when reachable", r.source === "live");
  ok("ranks Qwen first for Urdu from live data", r.chain[0].includes("qwen"));
  restore();
}

{
  process.env.SABAQ_MODELS_EN = "pinned/one:free,pinned/two:free";
  const m = await import(`../.test-build/models.js?bust=${Math.random()}`);
  const r = await m.resolveChain("en");
  ok("an env override wins over discovery",
     r.source === "env" && r.chain[0] === "pinned/one:free");
  delete process.env.SABAQ_MODELS_EN;
  restore();
}

ok("the seed is only a fallback, and is non-empty", Array.isArray(SEED) && SEED.length >= 5);


console.log("\n\x1b[1mSalvaging a cut-off stream\x1b[0m");

ok("passes a complete plan through untouched", (() => {
  const r = salvagePlan(structuredClone(GOOD));
  return r.plan !== null && r.truncated === false && r.dropped.length === 0;
})());

ok("drops a half-written trailing stage and keeps the rest", (() => {
  const p = structuredClone(GOOD);
  p.procedure.push({ title: "Evaluation", minutes: 4 });   // no teacherDoes: cut mid-object
  const r = salvagePlan(p);
  return r.plan !== null && r.truncated && r.plan.procedure.length === GOOD.procedure.length;
})());

ok("drops a half-written objective", (() => {
  const p = structuredClone(GOOD);
  p.objectives.push({ text: "", verb: "", bloomLevel: "Apply" });
  const r = salvagePlan(p);
  return r.plan !== null && r.plan.objectives.length === GOOD.objectives.length;
})());

ok("drops several broken entries in one go", (() => {
  const p = structuredClone(GOOD);
  p.procedure.push({ title: "X", minutes: 1 });
  p.evaluation.items.push({ question: "", marks: 1 });
  p.resources.push({ purpose: "no item" });
  const r = salvagePlan(p);
  return r.plan !== null && r.dropped.length >= 3;
})());

ok("keeps the earlier items when the last one is broken", (() => {
  const p = structuredClone(GOOD);
  const firstTitle = p.procedure[0].title;
  p.procedure.push({ minutes: 2 });
  const r = salvagePlan(p);
  return r.plan?.procedure[0].title === firstTitle;
})());

ok("fills defaults for fields the model never reached", (() => {
  const p = structuredClone(GOOD);
  delete p.teacherReflection;
  delete p.keyVocabulary;
  delete p.successCriteria;
  const r = salvagePlan(p);
  return r.plan !== null &&
         Array.isArray(r.plan.teacherReflection) &&
         Array.isArray(r.plan.keyVocabulary);
})());

ok("refuses when there is not enough to be a plan", (() => {
  const r = salvagePlan({ coreConcept: "only this" });
  return r.plan === null;
})());

ok("refuses junk", salvagePlan("not an object").plan === null && salvagePlan(null).plan === null);

ok("never mutates its input", (() => {
  const p = structuredClone(GOOD);
  p.procedure.push({ title: "X", minutes: 1 });
  const n = p.procedure.length;
  salvagePlan(p);
  return p.procedure.length === n;
})());

ok("a salvaged plan still passes the rubric machinery", (() => {
  const p = structuredClone(GOOD);
  p.procedure.push({ title: "Cut off here", minutes: 3 });
  const r = salvagePlan(p);
  if (!r.plan) return false;
  const report = validate(r.plan, brief);
  return typeof report.score === "number" && report.checks.length === 11;
})());

// end-to-end: truncated JSON text -> parse -> salvage -> valid plan
ok("recovers a plan from a truncated JSON STRING", (() => {
  const full = JSON.stringify(GOOD);
  const cut = full.slice(0, Math.floor(full.length * 0.88));   // stream died at 88%
  const parsed = parseLoose(cut);
  if (!parsed) return false;
  const r = salvagePlan(parsed);
  return r.plan !== null && r.plan.objectives.length >= 1 && r.plan.procedure.length >= 1;
})());


console.log("\n\x1b[1mTruncation stress test\x1b[0m");
{
  // A stream can die anywhere. Sweep every cut point and measure how often a
  // usable plan comes back, because this is what a serverless timeout does.
  const full = JSON.stringify(GOOD);
  let recovered = 0, attempts = 0, worstLoss = 0;
  const failures = [];
  for (let pct = 40; pct <= 99; pct++) {
    attempts++;
    const cut = full.slice(0, Math.floor(full.length * pct / 100));
    const parsed = parseLoose(cut);
    const r = parsed ? salvagePlan(parsed) : { plan: null };
    if (r.plan && r.plan.objectives.length >= 1 && r.plan.procedure.length >= 1) {
      recovered++;
      const kept = r.plan.procedure.length;
      worstLoss = Math.max(worstLoss, GOOD.procedure.length - kept);
    } else {
      failures.push(pct);
    }
  }
  const rate = Math.round((recovered / attempts) * 100);
  ok(`recovers a usable plan from ${rate}% of cut points between 40% and 99%`,
     rate >= 95, `failed at: ${failures.join(", ")}`);
  ok("a recovered plan always keeps at least one stage", worstLoss < GOOD.procedure.length);

  // and the recovered plan must still be scoreable, never crash the rubric
  let scored = 0;
  for (let pct = 60; pct <= 99; pct += 3) {
    const parsed = parseLoose(full.slice(0, Math.floor(full.length * pct / 100)));
    const r = parsed ? salvagePlan(parsed) : { plan: null };
    if (r.plan) { const rep = validate(r.plan, brief); if (typeof rep.score === "number") scored++; }
  }
  ok("every recovered plan can be scored without throwing", scored >= 12, `scored ${scored}`);
}

console.log("\n\x1b[1mMid-escape and awkward cuts\x1b[0m");
ok("survives a cut on a lone backslash", parseLoose('{"a":"line\\\\') !== null);
ok("survives a cut right after a key", parseLoose('{"a":1,"b":') !== null);
ok("survives a cut inside a number", (() => {
  const r = parseLoose('{"a":1,"b":12');
  return r !== null && r.a === 1;
})());
ok("survives a cut inside a unicode escape", parseLoose('{"a":"x\\u00') !== null);
ok("survives a cut deep in nested arrays", (() => {
  const r = parseLoose('{"a":[{"b":[1,2,{"c":"half');
  return r !== null && Array.isArray(r.a);
})());
ok("keeps as much as possible when retreating", (() => {
  const r = parseLoose('{"keep1":"yes","keep2":"also","broken":"cut here');
  return r !== null && r.keep1 === "yes" && r.keep2 === "also";
})());

console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m\n`);
process.exit(fail ? 1 : 0);
