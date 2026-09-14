"use client";

import type { LessonPlan } from "@/lib/types";
import { FORMAT_BY_ID } from "@/lib/formats";

const L = {
  en: {
    lessonPlan: "Lesson Plan", no: "Lesson Plan No", cls: "Class", date: "Date",
    subject: "Subject", duration: "Duration", topic: "Topic", strength: "Class Strength",
    book: "Curriculum / Book Name", pages: "Page No(s)", teacher: "Teacher",
    section: "Section", age: "Average Age", coreSkill: "Core Skill",
    alignment: "Curriculum Alignment", coreConcept: "Core Concept",
    objectives: "Specific Objectives", success: "Success Criteria",
    skills: "Skills / Attitude", vocab: "Key Vocabulary", prior: "Prior Knowledge",
    misconceptions: "Anticipated Misconceptions", resources: "Teaching Resources",
    management: "Classroom Management Rules & Strategy", rules: "Rules",
    strategies: "Strategy", method: "Teaching Methodology",
    delivery: "Content Delivery", procedure: "Procedure", board: "Board Summary",
    diff: "Differentiation", support: "Support", extension: "Extension",
    sen: "Special Educational Needs", afl: "Assessment for Learning",
    recap: "Recapitulation", evaluation: "Evaluation", homework: "Homework",
    reflection: "Post-lesson Reflection", supervisor: "Supervisor Feedback",
    signature: "Supervisor signature", marks: "marks", total: "Total",
    teacherDoes: "Teacher", studentsDo: "Students", checkpoint: "Checkpoint",
    expect: "Listening for", min: "min", commandWords: "Command words",
  },
  ur: {
    lessonPlan: "سبقی خاکہ", no: "سبق کا نمبر شمار", cls: "جماعت", date: "تاریخِ تدریس",
    subject: "مضمون", duration: "دورانیۂِ تدریس", topic: "عنوان", strength: "تعدادِ طلبہ",
    book: "نصاب / کتاب", pages: "صفحہ نمبر", teacher: "معلم / معلمہ",
    section: "فریق", age: "اوسط عمر", coreSkill: "سبق کی بنیادی مہارت",
    alignment: "نصابی مطابقت", coreConcept: "سبق کا بنیادی تصور",
    objectives: "مقاصدِ تدریس", success: "معیارِ کامیابی",
    skills: "مہارتیں / رویے", vocab: "کلیدی الفاظ", prior: "سابقہ معلومات",
    misconceptions: "متوقع غلط فہمیاں", resources: "سمعی و بصری اعانات",
    management: "اصول و ضوابط برائے منظم کمرۂِ جماعت", rules: "اصول و ضوابط",
    strategies: "حکمتِ عمل", method: "طریقۂِ تدریس",
    delivery: "ترسیلِ مواد ( جُز / جُزو )", procedure: "اہم اسباقی مدارج",
    board: "خلاصۂِ تختۂِ سیاہ / اعادہ", diff: "انفرادی توجہ", support: "معاونت",
    extension: "توسیع", sen: "خصوصی ضروریات", afl: "دورانِ سبق جانچ",
    recap: "اعادہ", evaluation: "جانچ", homework: "تفویض",
    reflection: "بعد از سبق غور و فکر", supervisor: "نگراں معلم / معلمہ کے تاثرات",
    signature: "دستخط", marks: "نمبر", total: "کل",
    teacherDoes: "معلم", studentsDo: "طلبہ", checkpoint: "جانچ کا مرحلہ",
    expect: "متوقع جواب", min: "منٹ", commandWords: "ہدایتی الفاظ",
  },
} as const;

export default function PlanSheet({
  plan,
  formatId,
  onRefine,
  refining,
}: {
  plan: LessonPlan;
  formatId: string;
  onRefine?: (section: string) => void;
  refining?: string | null;
}) {
  const fmt = FORMAT_BY_ID[formatId];
  const ur = fmt?.language === "ur";
  const t = ur ? L.ur : L.en;
  const is5E = formatId === "cambridge-5e";
  const totalMinutes = plan.procedure.reduce((n, s) => n + (s.minutes || 0), 0);

  const S = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <section className="print-break border-t border-line pt-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className={`flex-1 text-[12px] font-bold uppercase tracking-wider text-ink ${ur ? "urdu !text-[15px] !normal-case !tracking-normal" : ""}`}>
          {title}
        </h3>
        {onRefine && (
          <button
            onClick={() => onRefine(id)}
            disabled={Boolean(refining)}
            className="no-print rounded-md px-1.5 py-0.5 text-[10px] font-medium text-faint transition-colors hover:bg-wash hover:text-ink disabled:opacity-40"
            title="Rewrite this section"
          >
            {refining === id ? "rewriting…" : "rewrite"}
          </button>
        )}
      </div>
      <div className={ur ? "urdu" : ""}>{children}</div>
    </section>
  );

  const Bullets = ({ items }: { items: string[] }) => (
    <ul className="space-y-1.5">
      {items.filter(Boolean).map((x, i) => (
        <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink">
          <span className={`mt-[7px] h-1 w-1 shrink-0 rounded-full bg-grass ${ur ? "order-2" : ""}`} />
          <span className="flex-1">{x}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <article className="print-sheet bg-white">
      {/* ------------------------------ header ------------------------------ */}
      <header className={`mb-5 ${ur ? "urdu" : ""}`}>
        <h2 className={`text-center text-[19px] ${ur ? "font-bold" : "display-sm"}`}>{t.lessonPlan}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
          {([
            [t.no, plan.meta.lessonNo], [t.date, plan.meta.date], [t.cls, plan.meta.grade],
            [t.section, plan.meta.section], [t.subject, plan.meta.subject],
            [`${t.duration}`, `${plan.meta.duration} ${t.min}`], [t.topic, plan.meta.topic],
            [t.strength, plan.meta.classStrength], [t.age, plan.meta.averageAge],
            [t.book, plan.meta.bookName], [t.pages, plan.meta.pageNos],
            [t.coreSkill, plan.meta.coreSkill], [t.teacher, plan.meta.teacherName],
          ] as [string, string][])
            .filter(([, v]) => v && String(v).trim())
            .map(([k, v]) => (
              <div key={k} className="flex gap-1.5 border-b border-dotted border-line pb-1">
                <dt className="shrink-0 font-semibold text-faint">{k}:</dt>
                <dd className="min-w-0 flex-1 truncate text-ink">{v}</dd>
              </div>
            ))}
        </dl>
      </header>

      <div className="space-y-4">
        {/* alignment */}
        {(plan.curriculumAlignment?.outcomeStatement || plan.curriculumAlignment?.strand) && (
          <S id="curriculumAlignment" title={t.alignment}>
            <p className="text-[13.5px] leading-relaxed text-ink">
              {[plan.curriculumAlignment.system, plan.curriculumAlignment.stageLabel, plan.curriculumAlignment.strand]
                .filter(Boolean).join(" · ")}
            </p>
            {plan.curriculumAlignment.outcomeStatement && (
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{plan.curriculumAlignment.outcomeStatement}</p>
            )}
            {plan.curriculumAlignment.code
              ? <p className="mt-1 text-[12px] font-semibold text-emerald">{plan.curriculumAlignment.code}</p>
              : null}
            {plan.curriculumAlignment.commandWords?.length > 0 && (
              <p className="mt-2 text-[12px] text-faint">
                {t.commandWords}: {plan.curriculumAlignment.commandWords.join(", ")}
              </p>
            )}
          </S>
        )}

        {plan.coreConcept && (
          <S id="coreConcept" title={t.coreConcept}>
            <p className="text-[13.5px] leading-relaxed text-ink">{plan.coreConcept}</p>
          </S>
        )}

        {/* objectives */}
        <S id="objectives" title={t.objectives}>
          <ol className="space-y-2">
            {plan.objectives.map((o, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald">
                  {o.bloomLevel}
                </span>
                <span className="flex-1 text-[13.5px] leading-relaxed text-ink">{o.text}</span>
              </li>
            ))}
          </ol>
        </S>

        {plan.successCriteria?.length > 0 && (is5E || plan.successCriteria.length > 1) && (
          <S id="successCriteria" title={t.success}><Bullets items={plan.successCriteria} /></S>
        )}

        {/* skills */}
        {(plan.skillsAndAttitude?.skills?.length || plan.skillsAndAttitude?.attitudes?.length) && (
          <S id="skillsAndAttitude" title={t.skills}>
            <Bullets items={[
              ...(plan.skillsAndAttitude.skills ?? []),
              ...(plan.skillsAndAttitude.attitudes ?? []),
              ...(plan.skillsAndAttitude.psychomotor ?? []),
            ]} />
          </S>
        )}

        {plan.keyVocabulary?.length > 0 && (
          <S id="keyVocabulary" title={t.vocab}>
            <div className="space-y-1.5">
              {plan.keyVocabulary.map((v, i) => (
                <div key={i} className="text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-ink">{v.term}</span>
                  {v.definition && <span className="text-muted"> — {v.definition}</span>}
                  {v.localExample && <span className="text-faint"> ({v.localExample})</span>}
                </div>
              ))}
            </div>
          </S>
        )}

        {plan.priorKnowledge?.length > 0 && (
          <S id="priorKnowledge" title={t.prior}><Bullets items={plan.priorKnowledge} /></S>
        )}

        {plan.misconceptions?.length > 0 && (
          <S id="misconceptions" title={t.misconceptions}>
            <div className="space-y-2">
              {plan.misconceptions.map((m, i) => (
                <div key={i} className="rounded-lg border border-line bg-wash/40 p-2.5">
                  <div className="text-[13px] font-semibold text-ink">{m.misconception}</div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{m.howToAddress}</div>
                </div>
              ))}
            </div>
          </S>
        )}

        {/* resources */}
        {plan.resources?.length > 0 && (
          <S id="resources" title={t.resources}>
            <div className="space-y-1.5">
              {plan.resources.map((r, i) => (
                <div key={i} className="text-[13.5px] leading-relaxed">
                  <span className="font-medium text-ink">{r.item}</span>
                  {r.purpose && <span className="text-muted"> — {r.purpose}</span>}
                  {r.noTechAlternative && (
                    <div className="text-[12px] text-faint">↳ {r.noTechAlternative}</div>
                  )}
                </div>
              ))}
            </div>
          </S>
        )}

        {/* management */}
        {(plan.classroomManagement?.rules?.length || plan.classroomManagement?.strategies?.length) && (
          <S id="classroomManagement" title={t.management}>
            {plan.classroomManagement.rules?.length > 0 && (
              <>
                <div className="mb-1.5 text-[11.5px] font-semibold text-faint">{t.rules}</div>
                <Bullets items={plan.classroomManagement.rules} />
              </>
            )}
            {plan.classroomManagement.strategies?.length > 0 && (
              <>
                <div className="mb-1.5 mt-3 text-[11.5px] font-semibold text-faint">{t.strategies}</div>
                <Bullets items={plan.classroomManagement.strategies} />
              </>
            )}
          </S>
        )}

        {/* methodology */}
        {plan.methodology?.primaryMethod && (
          <S id="methodology" title={t.method}>
            <p className="text-[13.5px] leading-relaxed text-ink">
              <span className="font-semibold">{plan.methodology.primaryMethod}</span>
              {plan.methodology.supportingMethods?.length > 0 && (
                <span className="text-muted"> · {plan.methodology.supportingMethods.join(" · ")}</span>
              )}
            </p>
            {plan.methodology.rationale && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{plan.methodology.rationale}</p>
            )}
          </S>
        )}

        {plan.contentDelivery?.length > 0 && (
          <S id="contentDelivery" title={t.delivery}><Bullets items={plan.contentDelivery} /></S>
        )}

        {/* procedure */}
        <S id="procedure" title={t.procedure}>
          <div className="space-y-3">
            {plan.procedure.map((s, i) => (
              <div key={i} className="print-break rounded-xl border border-line p-3">
                <div className="mb-2 flex items-baseline gap-2">
                  <span className="text-[13.5px] font-bold text-ink">{s.title}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-wash px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                    {s.minutes} {t.min}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed text-ink">
                  <span className="font-semibold text-faint">{t.teacherDoes}: </span>
                  {s.teacherDoes}
                </p>
                {s.studentsDo && (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
                    <span className="font-semibold text-faint">{t.studentsDo}: </span>
                    {s.studentsDo}
                  </p>
                )}
                {s.questions?.length > 0 && (
                  <ul className="mt-2 space-y-1.5 border-t border-dashed border-line pt-2">
                    {s.questions.map((q, j) => (
                      <li key={j} className="text-[12.5px] leading-relaxed">
                        <span className="font-medium text-ink">{q.q}</span>
                        {q.expected && (
                          <span className="block text-faint">↳ {t.expect}: {q.expected}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {s.checkpoint && (
                  <p className="mt-2 rounded-lg bg-wash/60 px-2.5 py-1.5 text-[12px] leading-relaxed text-muted">
                    <span className="font-semibold">{t.checkpoint}: </span>{s.checkpoint}
                  </p>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg bg-wash px-3 py-2 text-[12px]">
              <span className="text-faint">{t.total}</span>
              <span className={`font-bold tabular-nums ${totalMinutes === plan.meta.duration ? "text-emerald" : "text-[#c0392b]"}`}>
                {totalMinutes} / {plan.meta.duration} {t.min}
              </span>
            </div>
          </div>
        </S>

        {/* board */}
        {(plan.boardSummary?.lines?.length || plan.boardSummary?.workedExample) && (
          <S id="boardSummary" title={t.board}>
            <div className="rounded-xl border-2 border-ink/80 bg-[#122018] p-4 text-white">
              {plan.boardSummary.heading && (
                <div className="mb-2 border-b border-white/20 pb-1.5 text-center text-[14px] font-bold">
                  {plan.boardSummary.heading}
                </div>
              )}
              {plan.boardSummary.lines?.map((l, i) => (
                <div key={i} className="text-[13px] leading-relaxed text-white/85">{l}</div>
              ))}
              {plan.boardSummary.workedExample && (
                <pre className={`mt-2 whitespace-pre-wrap rounded-lg bg-white/5 p-2.5 text-[12.5px] leading-relaxed text-white/80 ${ur ? "urdu" : "font-mono"}`}>
                  {plan.boardSummary.workedExample}
                </pre>
              )}
              {plan.boardSummary.keyBox?.length > 0 && (
                <div className="mt-2 rounded-lg border border-lime/50 p-2.5">
                  {plan.boardSummary.keyBox.map((k, i) => (
                    <div key={i} className="text-[13px] font-semibold text-lime">{k}</div>
                  ))}
                </div>
              )}
            </div>
          </S>
        )}

        {/* differentiation */}
        {(plan.differentiation?.support?.length || plan.differentiation?.extension?.length) && (
          <S id="differentiation" title={t.diff}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[11.5px] font-semibold text-faint">{t.support}</div>
                <Bullets items={plan.differentiation.support ?? []} />
              </div>
              <div>
                <div className="mb-1.5 text-[11.5px] font-semibold text-faint">{t.extension}</div>
                <Bullets items={plan.differentiation.extension ?? []} />
              </div>
            </div>
            {plan.differentiation.specialNeeds?.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11.5px] font-semibold text-faint">{t.sen}</div>
                <Bullets items={plan.differentiation.specialNeeds} />
              </div>
            )}
          </S>
        )}

        {/* afl */}
        {plan.assessmentForLearning?.length > 0 && (
          <S id="assessmentForLearning" title={t.afl}>
            <div className="space-y-2">
              {plan.assessmentForLearning.map((a, i) => (
                <div key={i} className="rounded-lg border border-line p-2.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-ink">{a.technique}</span>
                    {a.whenInLesson && <span className="text-[11.5px] text-faint">{a.whenInLesson}</span>}
                  </div>
                  {a.whatItReveals && <div className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{a.whatItReveals}</div>}
                  {a.ifStudentsStruggle && <div className="mt-0.5 text-[12.5px] leading-relaxed text-faint">↳ {a.ifStudentsStruggle}</div>}
                </div>
              ))}
            </div>
          </S>
        )}

        {/* recap */}
        {(plan.recapitulation?.questions?.length || plan.recapitulation?.technique) && (
          <S id="recapitulation" title={t.recap}>
            {plan.recapitulation.technique && (
              <p className="mb-1.5 text-[13px] font-medium text-ink">{plan.recapitulation.technique}</p>
            )}
            <Bullets items={plan.recapitulation.questions ?? []} />
          </S>
        )}

        {/* evaluation */}
        {plan.evaluation?.items?.length > 0 && (
          <S id="evaluation" title={t.evaluation}>
            <ol className="space-y-2">
              {plan.evaluation.items.map((it, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="shrink-0 text-[13px] font-semibold text-faint">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="text-[13.5px] leading-relaxed text-ink">{it.question}</div>
                    {it.expectedAnswer && (
                      <div className="text-[12px] leading-relaxed text-faint">↳ {it.expectedAnswer}</div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11.5px] tabular-nums text-faint">
                    {it.marks} {t.marks}
                  </span>
                </li>
              ))}
            </ol>
            {plan.evaluation.totalMarks > 0 && (
              <div className="mt-2 border-t border-line pt-1.5 text-right text-[12px] font-semibold text-ink">
                {t.total}: {plan.evaluation.totalMarks}
              </div>
            )}
          </S>
        )}

        {/* homework */}
        {plan.homework?.task && (
          <S id="homework" title={t.homework}>
            <p className="text-[13.5px] leading-relaxed text-ink">{plan.homework.task}</p>
            {plan.homework.differentiatedOption && (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">↳ {plan.homework.differentiatedOption}</p>
            )}
            {plan.homework.howItWillBeChecked && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-faint">{plan.homework.howItWillBeChecked}</p>
            )}
          </S>
        )}

        {plan.teacherReflection?.length > 0 && is5E && (
          <S id="teacherReflection" title={t.reflection}><Bullets items={plan.teacherReflection} /></S>
        )}

        {/* supervisor block — always blank, for a human */}
        <section className="print-break border-t border-line pt-4">
          <h3 className={`mb-2 text-[12px] font-bold uppercase tracking-wider text-ink ${ur ? "urdu !text-[15px] !normal-case !tracking-normal" : ""}`}>
            {t.supervisor}
          </h3>
          <div className="space-y-4 pt-1">
            {[0, 1, 2].map((i) => <div key={i} className="border-b border-dotted border-line" />)}
          </div>
          <div className={`mt-6 text-[12px] text-faint ${ur ? "urdu" : ""}`}>
            {t.signature}: ________________________
          </div>
        </section>
      </div>
    </article>
  );
}
