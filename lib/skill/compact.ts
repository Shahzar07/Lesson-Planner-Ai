/* ------------------------------------------------------------------ *
 * Compact context.
 *
 * The full knowledge packs are ~5,300 tokens. On a free model that is paid
 * for twice: once in time-to-first-token, and again in the attention it
 * spends on prose it does not need for this particular lesson.
 *
 * So the default path sends the rules that actually change the output — the
 * non-negotiables, the verb lists, and four to six lines about the curriculum
 * in hand — and nothing else. The packs stay the source of truth for humans
 * and are still sent in full when SABAQ_FULL_CONTEXT=1.
 * ------------------------------------------------------------------ */

/** Pull one "## n. Heading" section out of SKILL.md without a markdown parser. */
export function section(md: string, heading: string): string {
  const start = md.indexOf(heading);
  if (start === -1) return "";
  const after = md.indexOf("\n## ", start + heading.length);
  return md.slice(start, after === -1 ? undefined : after).trim();
}

/** Four to six lines per system: what actually steers a lesson plan. */
export const COMPACT_CURRICULUM: Record<string, string> = {
  cambridge: `Cambridge International (CAIE).
- Stages 1-6 Primary, 7-9 Lower Secondary, IGCSE/O Level, AS/A Level.
- Maths strands: Number; Geometry and Measure; Statistics and Probability.
  English: Reading; Writing; Speaking and Listening.
  Science: Biology; Chemistry; Physics; Earth and Space, plus Thinking and Working Scientifically.
- Teach the command words explicitly: state, describe, explain, compare, evaluate, justify.
  Describe says what happens; explain says why.
- Most learners in Pakistan are EAL. Pre-teach subject vocabulary on the board, allow Urdu
  for pair talk, require English for the written record.
- NEVER output a Cambridge objective code. Name the stage and strand in words.`,

  sindh: `Sindh Board (STBB textbooks; BSEK and the BISE boards).
- Written against Student Learning Outcomes: "Students will be able to <measurable verb>".
- Classes I-V Primary, VI-VIII Elementary, IX-X Secondary (SSC), XI-XII Higher Secondary.
- Sindhi is compulsory alongside English and Urdu.
- Exam stems to rehearse in Evaluation, with marks shown: define, state, give reasons,
  differentiate between, write a note on, solve, draw and label, fill in the blanks.
- Assume 40-60 learners, fixed benches, blackboard and chalk, the textbook as the only
  resource in the child's hands, and no printing budget.`,

  oxford: `Oxford University Press Pakistan series.
- "We follow Oxford" means a series, not a board: New Oxford Modern English,
  Oxford Progressive English, New Countdown (maths), New Oxford Social Studies.
- An OUP unit spans several periods. Say which slice this lesson covers: pre-reading,
  the passage, comprehension, skill focus, independent exercise, or composition.
- Editions are revised often, so NEVER state a page, exercise or passage number unless
  the teacher supplied it. Say "the unit named in the brief".`,

  fbise: `Federal Board (FBISE) and the National Curriculum of Pakistan.
- SLO-referenced, same grammar as a lesson objective.
- Classes I-XII; SSC and HSSC papers split objective and subjective, so rehearse both.
- National Book Foundation textbooks are common. Never invent a page number.
- Assume a large class, a blackboard, and no printing.`,

  akueb: `Aga Khan University Examination Board (AKU-EB), SSC and HSSC.
- Items are tagged Knowledge, Understanding or Application, and the paper leans hard on
  the last two. Weight the Evaluation section toward Understanding and Application.
- Higher-order questions are the point: ask why and which-is-better, not only what.
- Sindh Textbook Board books are commonly used underneath.`,
};

export const VERB_RULES_EN = `MEASURABLE VERBS (use as the objective's main verb)
Remember: define, list, name, state, label, identify, recall, match
Understand: explain, describe, summarise, compare, classify, give reasons for, predict
Apply: solve, calculate, use, demonstrate, construct, measure, draw, complete, show how
Analyse: analyse, differentiate, categorise, examine, find the error in, deduce
Evaluate: evaluate, justify, judge, critique, decide between, rank with reasons
Create: design, compose, create, plan, devise, write an original, propose

BANNED as an objective's main verb (not observable):
understand, know, learn, appreciate, grasp, comprehend, realise, be aware of,
be familiar with, be introduced to, study, cover, think about`;

export const VERB_RULES_UR = `قابلِ پیمائش افعال: بیان کر سکیں گے، لکھ سکیں گے، شناخت کر سکیں گے،
الگ کر سکیں گے، درجہ بندی کر سکیں گے، موازنہ کر سکیں گے، حل کر سکیں گے، وجہ بتا سکیں گے،
مثال دے سکیں گے، خاکہ بنا سکیں گے، جملے بنا سکیں گے، ترتیب دے سکیں گے، نتیجہ اخذ کر سکیں گے

ممنوع (ناقابلِ مشاہدہ): سمجھ سکیں گے، جان سکیں گے، واقف ہو سکیں گے، آگاہی حاصل کر سکیں گے

مقاصد کی ساخت:
سبق کے اختتام پر طلبہ [شرط] [قابلِ پیمائش فعل] سکیں گے، [معیار]۔`;

export const URDU_FIELDS = `اردو سبقی خاکہ کے عنوانات:
مقاصدِ تدریس · اصول و ضوابط برائے منظم کمرۂِ جماعت · حکمتِ عمل · سمعی و بصری اعانات ·
طریقۂِ تدریس · ترسیلِ مواد (جُز/جُزو) · سبق کا بنیادی تصور · اہم اسباقی مدارج ·
خلاصۂِ تختۂِ سیاہ · جانچ · تفویض

ہر string value اردو رسم الخط میں ہونی چاہیے، بشمول سوالات اور متوقع جوابات۔`;
