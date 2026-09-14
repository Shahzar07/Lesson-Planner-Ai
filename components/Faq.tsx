"use client";

import { useState } from "react";

const ITEMS: [string, string][] = [
  [
    "Does it follow my school's exact lesson plan format?",
    "Yes. The B.Ed Standard format is built field for field from the teaching-practice sheet used across Pakistani B.Ed and ADE programmes: Specific Objectives, Skills/Attitude, Teaching Resources, Classroom Management, Methodology, Procedure, Board Summary, Recapitulation, Evaluation, Homework and the Supervisor Feedback block. Nothing is renamed or dropped.",
  ],
  [
    "کیا یہ اردو سبقی خاکہ بھی بنا سکتا ہے؟",
    "جی ہاں۔ مکمل سبقی خاکہ اردو میں تیار ہوتا ہے، بشمول مقاصدِ تدریس، اصول و ضوابط، سمعی و بصری اعانات، ترسیلِ مواد، اعلانِ سبق، سرگرمیاں، خلاصۂِ تختۂِ سیاہ، جانچ اور تفویض۔ معاون اور نگراں معلم کے تاثرات کی جگہ خالی چھوڑی جاتی ہے۔",
  ],
  [
    "Which curricula does it actually know?",
    "Cambridge (Primary, Lower Secondary, IGCSE/O Level, A Level), the Sindh Board (STBB textbooks, BSEK and the BISE boards), Oxford University Press Pakistan series such as New Oxford Modern English and New Countdown, the Federal Board and the National Curriculum, and AKU-EB. Each one carries its own knowledge pack covering stage structure, strands, assessment culture and exam command words.",
  ],
  [
    "Will it invent page numbers or syllabus codes?",
    "No, and this is enforced rather than requested. If you do not supply a page or chapter, the validator rejects any plan that contains one and sends it back to be rewritten. A fabricated Cambridge objective code is worse than a missing one, because your supervisor will check it.",
  ],
  [
    "How is the accuracy score calculated?",
    "Eleven deterministic checks run in code, not by a model: stage minutes must total the lesson duration exactly, every objective must use a measurable Bloom verb with a condition and a success criterion, Bloom levels must be spread, the procedure must be script-level with expected answers, differentiation and in-lesson assessment must both be concrete, and no citation may be invented. Anything that fails is sent back for a targeted repair pass.",
  ],
  [
    "Does it work for a class of 50 with only a blackboard?",
    "That is the default assumption. Turn on Low-resource mode and every resource must be either already in the room, free and locally findable, or drawable on the board in two minutes. Anything needing power or printing has to carry a no-tech alternative or the plan fails its context check.",
  ],
  [
    "What does it cost?",
    "Nothing to run. It uses free models through OpenRouter, so you bring your own free API key and the app routes between models automatically when one is busy. There is no per-plan charge.",
  ],
  [
    "Can I edit the plan afterwards?",
    "Every section has its own rewrite button where you can type an instruction, such as 'make the starter a pair activity' or 'add a differentiated worksheet for slower learners'. You can also print straight to A4 or download a Word document and edit it by hand.",
  ],
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ITEMS.map(([q, a], i) => {
        const isOpen = open === i;
        const isUrdu = /[؀-ۿ]/.test(q);
        return (
          <div key={q} className="card h-fit overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className={`flex-1 text-[14px] font-semibold leading-snug tracking-tight ${isUrdu ? "urdu" : ""}`}>
                {q}
              </span>
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
            </button>
            <div
              className="grid transition-all duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className={`px-4 pb-4 text-[13px] leading-relaxed text-muted ${isUrdu ? "urdu" : ""}`}>{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
