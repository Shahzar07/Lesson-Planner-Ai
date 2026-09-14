"use client";

import { useEffect, useRef, useState } from "react";
import type { LessonPlan, LessonBrief, QualityReport } from "@/lib/types";
import type { AppliedEdit } from "@/lib/patch";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  edits?: AppliedEdit[];
  rejected?: { path: string; reason: string }[];
  scoreBefore?: number;
  scoreAfter?: number;
  error?: boolean;
}

const SECTIONS: [string, string][] = [
  ["", "Whole plan"],
  ["objectives", "Objectives"],
  ["procedure", "Procedure"],
  ["differentiation", "Differentiation"],
  ["evaluation", "Evaluation"],
  ["homework", "Homework"],
  ["resources", "Resources"],
  ["classroomManagement", "Classroom management"],
  ["boardSummary", "Board summary"],
  ["assessmentForLearning", "Assessment for learning"],
  ["recapitulation", "Recapitulation"],
  ["keyVocabulary", "Key vocabulary"],
];

const SUGGESTIONS_EN = [
  "Make the starter a pair activity",
  "Simplify the objectives for weaker learners",
  "Add one more extension task",
  "Make the evaluation worth 10 marks",
  "Shorten the development by 5 minutes",
  "Add a Think-Pair-Share checkpoint",
  "Make the homework doable without a parent",
  "Use a cricket example instead",
];

const SUGGESTIONS_UR = [
  "ابتدائی سرگرمی کو جوڑوں کی سرگرمی بنائیں",
  "مقاصد کو آسان الفاظ میں لکھیں",
  "ایک اور توسیعی سرگرمی شامل کریں",
  "جانچ کو دس نمبر کا بنائیں",
  "تفویض مختصر کر دیں",
];

/** Human label for a JSON Pointer, e.g. /objectives/1/text -> "Objective 2 · text" */
function label(path: string): string {
  const parts = path.replace(/^\//, "").split("/");
  const head = parts[0] ?? "";
  const nice: Record<string, string> = {
    objectives: "Objective", procedure: "Stage", differentiation: "Differentiation",
    evaluation: "Evaluation", homework: "Homework", resources: "Resource",
    classroomManagement: "Management", boardSummary: "Board summary",
    assessmentForLearning: "AfL", recapitulation: "Recap", keyVocabulary: "Vocabulary",
    successCriteria: "Success criteria", methodology: "Methodology",
    misconceptions: "Misconception", contentDelivery: "Content delivery",
    skillsAndAttitude: "Skills", coreConcept: "Core concept",
    priorKnowledge: "Prior knowledge", curriculumAlignment: "Alignment",
    teacherReflection: "Reflection",
  };
  const base = nice[head] ?? head;
  const idx = parts[1] && /^\d+$/.test(parts[1]) ? ` ${Number(parts[1]) + 1}` : "";
  const tail = parts.slice(idx ? 2 : 1).filter((p) => !/^\d+$/.test(p)).join(" · ");
  return `${base}${idx}${tail ? ` · ${tail}` : ""}`;
}

export default function PlanChat({
  plan, brief, quality, onApply, onUndo, canUndo,
}: {
  plan: LessonPlan;
  brief: LessonBrief;
  quality: QualityReport | null;
  onApply: (plan: LessonPlan, quality: QualityReport, changedSections: string[]) => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState("");
  const [precise, setPrecise] = useState(true);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const ur = brief.language === "ur";
  const suggestions = ur ? SUGGESTIONS_UR : SUGGESTIONS_EN;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns, busy]);

  const grow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 150) + "px";
  };

  const send = async (text?: string) => {
    const msg = (text ?? value).trim();
    if (!msg || busy) return;

    const history = turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: "user", content: msg }]);
    setValue("");
    setShowSuggestions(false);
    requestAnimationFrame(grow);
    setBusy(true);

    const scoreBefore = quality?.score;

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, brief, message: msg, history, scope, precise }),
      });
      const j = await res.json();

      if (j.error) {
        setTurns((t) => [...t, { role: "assistant", content: j.error, error: true }]);
      } else if (!j.plan || !j.edits?.length) {
        setTurns((t) => [...t, {
          role: "assistant",
          content: j.summary ?? "Nothing changed.",
          rejected: j.rejected,
        }]);
      } else {
        onApply(j.plan, j.quality, j.changedSections ?? []);
        setTurns((t) => [...t, {
          role: "assistant",
          content: j.summary,
          edits: j.edits,
          rejected: j.rejected?.length ? j.rejected : undefined,
          scoreBefore,
          scoreAfter: j.quality?.score,
        }]);
      }
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
      taRef.current?.focus();
    }
  };

  return (
    <>
      <div className="no-print mt-4">
      {/* ------------------------------ transcript ------------------------------ */}
      {turns.length > 0 && (
        <div className="mb-3 space-y-2.5">
          {turns.map((t, i) =>
            t.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className={`max-w-[78%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13px] leading-relaxed text-white ${ur ? "urdu" : ""}`}>
                  {t.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] ${t.error ? "bg-[#fdf3f1] text-[#c0392b]" : "bg-wash text-grass-deep"}`}>
                  {t.error ? "!" : "✳"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] leading-relaxed ${t.error ? "text-[#a93226]" : "text-ink"} ${ur && !t.error ? "urdu" : ""}`}>
                    {t.content}
                  </p>

                  {t.edits && t.edits.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {t.edits.slice(0, 8).map((e, j) => (
                        <details key={j} className="group rounded-lg border border-line bg-wash/40">
                          <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              e.op === "add" ? "bg-emerald/10 text-emerald"
                                : e.op === "remove" ? "bg-[#fdeaea] text-[#c0392b]"
                                : "bg-ink/5 text-ink"}`}>
                              {e.op}
                            </span>
                            <span className="flex-1 truncate text-[11.5px] font-medium text-ink">{label(e.path)}</span>
                            <span className="text-[10px] text-faint transition-transform group-open:rotate-90">›</span>
                          </summary>
                          <div className="space-y-1 px-2.5 pb-2 pt-0.5">
                            {e.before !== undefined && (
                              <p className={`text-[11px] leading-relaxed text-faint line-through ${ur ? "urdu" : ""}`}>
                                {typeof e.before === "string" ? e.before : JSON.stringify(e.before)}
                              </p>
                            )}
                            {e.after !== undefined && (
                              <p className={`text-[11.5px] leading-relaxed text-ink ${ur ? "urdu" : ""}`}>
                                {typeof e.after === "string" ? e.after : JSON.stringify(e.after)}
                              </p>
                            )}
                          </div>
                        </details>
                      ))}
                      {t.edits.length > 8 && (
                        <p className="text-[11px] text-faint">and {t.edits.length - 8} more</p>
                      )}
                    </div>
                  )}

                  {t.rejected && t.rejected.length > 0 && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#a1685f]">
                      {t.rejected.length} change{t.rejected.length === 1 ? "" : "s"} could not be applied
                      {t.rejected[0]?.reason ? ` — ${t.rejected[0].reason}` : ""}.
                    </p>
                  )}

                  {typeof t.scoreAfter === "number" && typeof t.scoreBefore === "number" && (
                    <p className="mt-1.5 text-[11px] text-faint">
                      Accuracy {t.scoreBefore} →{" "}
                      <span className={
                        t.scoreAfter > t.scoreBefore ? "font-semibold text-emerald"
                          : t.scoreAfter < t.scoreBefore ? "font-semibold text-[#c0392b]" : ""
                      }>
                        {t.scoreAfter}
                      </span>
                      {t.scoreAfter < t.scoreBefore ? " — check the rubric panel" : ""}
                    </p>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex gap-2.5">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-wash text-[11px] text-grass-deep">✳</span>
              <div className="flex items-center gap-1.5 pt-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="live-dot h-1.5 w-1.5 rounded-full bg-faint"
                    style={{ animationDelay: `${i * 0.18}s` }} />
                ))}
                <span className="ml-1 text-[12px] text-faint">working out which parts to change</span>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      )}

        <p className="px-1 pt-1 text-[10.5px] leading-relaxed text-faint">
          Edits are applied to named fields only, and the rubric re-runs after every
          change. Header details like class, date and duration stay in the form on the left.
        </p>
      </div>

      {/* Sticky from here down: a composer you have to scroll to find is a
          composer nobody uses. Only the composer itself sticks — anything else
          in here would float over the plan and cover it. */}
      <div className="no-print sticky bottom-3 z-30">
      {/* ------------------------------ suggestions ----------------------------- */}
      {showSuggestions && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} disabled={busy}
              className={`chip ${ur ? "urdu !h-auto !py-1.5" : ""}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ------------------------------- composer -------------------------------
          Sticky, because the plan is long and a chat bar you have to scroll to
          find is a chat bar nobody uses. */}
      <div className="rounded-[20px] border border-line bg-white shadow-[0_2px_8px_-2px_rgb(10_16_22/.06),0_16px_40px_-16px_rgb(10_16_22/.22)] backdrop-blur-md">
        {/* row 1 — the input */}
        <div className="flex items-start gap-2.5 px-3.5 pt-3">
          <span className="mt-1.5 shrink-0 text-[13px] text-grass" aria-hidden="true">✳</span>
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); grow(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={ur ? "کیا تبدیل کرنا ہے؟ مثلاً: ابتدائی سرگرمی کو جوڑوں کی سرگرمی بنائیں" : "What should change? e.g. make the starter a pair activity"}
            className={`min-h-[26px] w-full resize-none border-0 bg-transparent py-1 text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-[#a6b3be] ${ur ? "urdu" : ""}`}
          />
        </div>

        {/* row 2 — mode toggle */}
        <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-1.5">
          <button
            onClick={() => setPrecise((p) => !p)}
            role="switch"
            aria-checked={precise}
            aria-label="Precise edits"
            className="flex items-center gap-2"
          >
            <span className={`relative h-[18px] w-[32px] rounded-full transition-colors ${precise ? "bg-grass" : "bg-[#d7e0e7]"}`}>
              <span className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-all"
                style={{ left: precise ? 16 : 2 }} />
            </span>
            <span className="text-[12px] font-medium text-ink">Precise</span>
          </button>
          <span className="rounded-md bg-wash px-1.5 py-0.5 text-[10px] font-semibold text-faint">
            {precise ? "smallest change" : "may restructure"}
          </span>
        </div>

        {/* row 3 — tools */}
        <div className="flex items-center gap-1.5 border-t border-line px-2.5 py-2">
          <label className="sr-only" htmlFor="chat-scope">Limit to section</label>
          <select
            id="chat-scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="h-8 max-w-[150px] rounded-lg border border-line bg-white px-2 pr-6 text-[11.5px] text-muted outline-none"
            style={{
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5L6 8l3.5-3.5' stroke='%235b6b7a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center",
            }}
          >
            {SECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>

          <button
            onClick={() => setShowSuggestions((s) => !s)}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium text-muted transition-colors hover:bg-wash hover:text-ink"
            aria-expanded={showSuggestions}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" fill="none">
              <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Ideas
          </button>

          <button
            onClick={onUndo}
            disabled={!canUndo || busy}
            className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11.5px] font-medium text-muted transition-colors hover:bg-wash hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" fill="none">
              <path d="M3 5.5h6a3 3 0 010 6H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 3L2.5 5.5 5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Undo
          </button>

          <span className="ml-auto hidden text-[10.5px] text-faint sm:inline">Enter to send</span>

          <button
            onClick={() => send()}
            disabled={busy || !value.trim()}
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lime text-ink transition-all hover:bg-lime-2 disabled:bg-wash disabled:text-faint"
          >
            {busy ? (
              <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
            ) : (
              <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" fill="none">
                <path d="M7 11.5v-9M3 6.5L7 2.5l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      </div>
    </>
  );
}
