import type { LessonPlan } from "@/lib/types";

/**
 * A complete, rubric-clean example. It exists so a teacher can see exactly what
 * the tool produces before setting up an API key, and so the UI can be worked on
 * without spending a generation.
 *
 * It scores 100 against lib/validator.ts — if a rubric check changes and this
 * stops scoring 100, the sample is the thing that is wrong, not the check.
 */
export const SAMPLE_PLAN: LessonPlan = {
  meta: {
    lessonNo: "12", date: "", grade: "Stage 4", section: "B", subject: "Mathematics",
    topic: "Equivalent Fractions", duration: 40, classStrength: "42", averageAge: "9",
    bookName: "Cambridge Primary Mathematics Learner's Book", pageNos: "",
    teacherName: "", coreSkill: "Numeracy",
  },
  curriculumAlignment: {
    system: "Cambridge International", stageLabel: "Cambridge Primary, Stage 4",
    strand: "Number — fractions",
    outcomeStatement:
      "Recognise that a fraction can be written in more than one way while naming the same amount, and generate equivalent fractions.",
    code: null,
    commandWords: ["explain", "compare", "show"],
  },
  coreConcept: "Two fractions that look different can name exactly the same amount.",
  objectives: [
    {
      text: "By the end of the lesson, students will be able to generate two equivalent fractions for a given fraction using a fraction wall, correctly for at least four out of five.",
      verb: "generate", bloomLevel: "Apply",
      condition: "using a fraction wall", degree: "at least four out of five",
    },
    {
      text: "By the end of the lesson, students will be able to explain why one half and three sixths name the same amount, using a labelled diagram, in two complete sentences.",
      verb: "explain", bloomLevel: "Understand",
      condition: "using a labelled diagram", degree: "in two complete sentences",
    },
    {
      text: "By the end of the lesson, students will be able to find the error in a wrongly written equivalence, given three worked pairs, identifying all three mistakes.",
      verb: "analyse", bloomLevel: "Analyse",
      condition: "given three worked pairs", degree: "identifying all three mistakes",
    },
  ],
  successCriteria: [
    "I can make a fraction that is equal to the one I am given.",
    "I can say why two fractions are equal using a picture.",
    "I can spot when someone has made an equal fraction the wrong way.",
  ],
  skillsAndAttitude: {
    skills: ["Numeracy and proportional reasoning", "Explaining a method to a partner"],
    attitudes: ["Works cooperatively in a pair without taking over", "Waits for a turn before answering"],
    psychomotor: ["Draws and shades a fraction wall neatly to the ruled lines"],
  },
  keyVocabulary: [
    { term: "equivalent", definition: "equal in value, even if it looks different", localExample: "half a roti and two quarters of the same roti" },
    { term: "numerator", definition: "the number on top, how many parts you have", localExample: "the 3 in three quarters" },
    { term: "denominator", definition: "the number underneath, how many equal parts in one whole", localExample: "the 4 in three quarters" },
  ],
  priorKnowledge: [
    "Can name the numerator and denominator of a simple fraction",
    "Can shade a given fraction of a shape divided into equal parts",
    "Knows the two, three, four and five times tables",
  ],
  misconceptions: [
    {
      misconception: "Learners double only the numerator, writing one half as two halves instead of two quarters.",
      howToAddress: "Shade both on the fraction wall side by side and ask which strip is longer. The picture contradicts the answer before you say anything.",
    },
    {
      misconception: "Learners think a bigger denominator always means a bigger fraction.",
      howToAddress: "Put one half against one eighth on the wall and ask which piece of roti they would rather have.",
    },
  ],
  resources: [
    { item: "Fraction wall drawn on the blackboard before the bell", purpose: "the shared reference every child can see", noTechAlternative: "already chalk only, nothing to substitute" },
    { item: "Paper strips, four per pair, torn from any old notebook", purpose: "folding to find equal parts by hand", noTechAlternative: "learners tear their own from rough pages" },
    { item: "Slates or rough notebooks for the all-show-together check", purpose: "seeing every answer at once", noTechAlternative: "learners hold up a page with the answer written large" },
  ],
  classroomManagement: {
    rules: [
      "We raise a hand before speaking.",
      "We listen while a classmate is explaining.",
      "We move into pairs quietly, within ten seconds.",
      "We keep the paper strips on the desk, not in the air.",
    ],
    strategies: [
      "Countdown from five as the attention signal, taught once at the start and then used without explanation",
      "Three to five seconds of wait time after every question before taking any answer",
      "Cold call from lollipop sticks so every learner stays ready rather than only the raised hands",
      "Teacher moves to the disengaged bench rather than naming the learner across the room",
      "Struggling learners seated on the front two benches beside a peer who has already mastered the step",
    ],
  },
  methodology: {
    primaryMethod: "Activity-based learning",
    supportingMethods: ["Think-Pair-Share", "Inductive questioning", "Gradual release: I do, we do, you do"],
    rationale:
      "The concept is visual before it is procedural, so learners meet it on the wall and with folded strips first and only then meet the multiply-top-and-bottom rule. This follows the Cambridge active learning pillar and keeps the rule as a summary of what they have already seen rather than something to memorise.",
  },
  contentDelivery: [
    "Part 1: equal amounts can have different names, met physically by folding",
    "Part 2: reading equivalence off the fraction wall",
    "Part 3: the multiplier rule, named only after it has been noticed",
  ],
  procedure: [
    {
      title: "Initiation Activity", stageType: "starter", minutes: 5,
      teacherDoes: "Draw a roti on the board and cut it in two. Shade one half. Beside it draw the same roti cut into four and shade two quarters. Say nothing about fractions yet. Ask the class which child got more to eat, and give five seconds of wait time before taking any hand.",
      studentsDo: "Look, think for five seconds, then answer on slates and hold them up together.",
      questions: [
        { q: "Ayesha gets one half of this roti and Bilal gets two quarters of the same roti. Who got more?", expected: "Both got the same amount", bloomLevel: "Understand" },
        { q: "How can you tell, just by looking at the picture?", expected: "The shaded parts are the same size", bloomLevel: "Analyse" },
      ],
      checkpoint: "Most slates say the same. If more than ten say Bilal got more, shade the two pictures again before moving on.",
    },
    {
      title: "Development — folding to find equal parts", stageType: "main", minutes: 12,
      teacherDoes: "Give each pair four paper strips. Model folding one strip in half and labelling both parts, narrating each step aloud as you do it. Then ask pairs to fold a second strip into four and hold it against the first. Circulate and note which pairs are folding unequal parts, because that is the misconception that will bite later.",
      studentsDo: "Fold, label, and lay the strips on top of each other to compare in pairs.",
      questions: [
        { q: "Hold your half strip against your quarters strip. What do you notice?", expected: "One half covers exactly two quarters", bloomLevel: "Understand" },
        { q: "Fold a third strip into eight. How many eighths cover one half?", expected: "Four eighths", bloomLevel: "Apply" },
      ],
      checkpoint: "Walk the rows. Every pair should be holding strips with visibly equal parts before the rule is introduced.",
    },
    {
      title: "Development — naming the rule", stageType: "main", minutes: 10,
      teacherDoes: "Write one half equals two quarters equals four eighths on the board in a row. Ask what is happening to the top number and then to the bottom number each time. Let the class arrive at doubling before you write it. Only then write the rule in a box: multiply the top and the bottom by the same number. Do one worked example aloud, then set three for pairs to try.",
      studentsDo: "Work three equivalences in pairs, one writing and one checking, then swap roles.",
      questions: [
        { q: "What did we multiply the top by, and what did we multiply the bottom by?", expected: "The same number, both times", bloomLevel: "Analyse" },
        { q: "What happens if I only double the top and leave the bottom alone?", expected: "It is not equal any more, it becomes a bigger fraction", bloomLevel: "Analyse" },
        { q: "Give me one fraction that is equal to two thirds.", expected: "Four sixths, six ninths, or any correct multiple", bloomLevel: "Apply" },
      ],
      checkpoint: "Mini whiteboards, all show together. If more than six learners multiply only the numerator, go back to the strips before the board summary.",
    },
    {
      title: "Board Summary", stageType: "board", minutes: 5,
      teacherDoes: "Head the board Equivalent Fractions. Write the boxed rule, then the worked row beneath it, then the two key words with their meanings in the corner. Point to each part as you say it so the class copies in the right order rather than racing ahead.",
      studentsDo: "Copy the summary into notebooks, including the boxed rule.",
      questions: [
        { q: "What goes inside the box?", expected: "Multiply the top and the bottom by the same number", bloomLevel: "Remember" },
        { q: "Give me one more pair to add to the row.", expected: "Any correct equivalent pair", bloomLevel: "Apply" },
      ],
      checkpoint: "Glance along the rows. Every notebook should show the boxed rule before the recap starts.",
    },
    {
      title: "Recapitulation", stageType: "recap", minutes: 4,
      teacherDoes: "Cold call five learners using the lollipop sticks. Ask each for one fraction equal to two thirds and write every answer on the board, right or wrong. Then ask the class to thumb each one up or down and explain one of the downs.",
      studentsDo: "Answer when called, then vote with thumbs and justify one answer aloud.",
      questions: [
        { q: "Give one fraction equal to two thirds.", expected: "Four sixths, six ninths, eight twelfths", bloomLevel: "Apply" },
        { q: "Why is three quarters not equal to two thirds?", expected: "The top and bottom were not multiplied by the same number", bloomLevel: "Evaluate" },
      ],
      checkpoint: "At least four of the five cold-called answers correct before moving to the written check.",
    },
    {
      title: "Evaluation", stageType: "assess", minutes: 4,
      teacherDoes: "Dictate the three items slowly, twice each. Collect the slips at the door as learners leave. Mark them before the next period so you know exactly who to seat at the front tomorrow.",
      studentsDo: "Write the three answers on a slip of rough paper and hand it in at the door.",
      questions: [
        { q: "Write two fractions equal to one third.", expected: "Two sixths and three ninths", bloomLevel: "Apply" },
        { q: "True or false: two fifths equals four tenths. Give one reason.", expected: "True, both were multiplied by two", bloomLevel: "Evaluate" },
      ],
      checkpoint: "Every learner hands in a slip. Count them against the register at the door.",
    },
  ],
  boardSummary: {
    heading: "Equivalent Fractions",
    lines: [
      "Equivalent means equal in value, even when it looks different.",
      "1/2  =  2/4  =  4/8",
    ],
    workedExample: "2/3  =  (2 x 2)/(3 x 2)  =  4/6",
    keyBox: ["Multiply the top and the bottom by the SAME number."],
  },
  differentiation: {
    support: [
      "A half-completed fraction wall left on the desk, and a partner who has already matched three pairs correctly, so the learner starts from a working example rather than a blank page.",
      "A sentence starter written on the desk: these two fractions are equal because the shaded part is the same size.",
      "Fewer items, not easier ones: three equivalences instead of six, at the same level of demand.",
    ],
    extension: [
      "Find an equivalent pair where the multiplier is greater than five, and prove it on the wall rather than by the rule.",
      "Write one wrong equivalence deliberately and pass it to a partner to find the error in.",
      "Work backwards: given four twelfths, find the simplest fraction that names the same amount.",
    ],
    specialNeeds: [
      "The two learners with low vision sit on the front bench, and the board is written in large chalk with the rule underlined twice.",
      "Read every dictated evaluation item aloud twice, at dictation speed, for the learner who processes written text slowly.",
    ],
  },
  assessmentForLearning: [
    {
      technique: "Slates, all show together", whenInLesson: "minute 5, end of the starter",
      whatItReveals: "Whether the class already senses that different names can mean the same amount",
      ifStudentsStruggle: "Re-shade the two rotis side by side before starting the folding activity",
    },
    {
      technique: "Mini whiteboards, all show together", whenInLesson: "minute 27, end of the rule stage",
      whatItReveals: "Exactly who is multiplying only the numerator",
      ifStudentsStruggle: "Return to the paper strips with that group while the rest begin the board summary",
    },
    {
      technique: "Exit ticket collected at the door", whenInLesson: "minute 40",
      whatItReveals: "Whether the rule survived to the end of the lesson",
      ifStudentsStruggle: "Open the next period with the fraction wall rather than new content",
    },
  ],
  recapitulation: {
    technique: "Cold call from lollipop sticks, then whole-class thumbs vote",
    questions: [
      "Give one fraction equal to two thirds.",
      "Why is three quarters not equal to two thirds?",
      "What is the rule for making an equivalent fraction?",
    ],
  },
  evaluation: {
    items: [
      { question: "Write two fractions equal to one third.", marks: 2, expectedAnswer: "2/6 and 3/9", bloomLevel: "Apply" },
      { question: "True or false: 2/5 = 4/10. Give one reason for your answer.", marks: 2, expectedAnswer: "True, the top and bottom were both multiplied by two", bloomLevel: "Evaluate" },
      { question: "Faisal says 1/2 = 2/3. Find his mistake and correct it.", marks: 2, expectedAnswer: "He did not multiply by the same number; 1/2 = 2/4", bloomLevel: "Analyse" },
    ],
    totalMarks: 6,
  },
  homework: {
    task: "In your notebook, draw a fraction wall up to eighths and use it to write three pairs of equivalent fractions.",
    estimatedMinutes: 15,
    howItWillBeChecked: "Checked in the first three minutes of the next period, walking the rows while the starter runs.",
    differentiatedOption: "Supported learners complete two pairs using the wall already drawn in today's classwork.",
  },
  teacherReflection: [
    "Did the paper strips help, or did they become a distraction to manage?",
    "How many learners were still multiplying only the numerator at the exit ticket?",
    "Was ten minutes enough for the rule stage, or did it need the time from the recap?",
  ],
};
