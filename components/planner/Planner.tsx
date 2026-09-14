"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { LessonPlan, LessonBrief, QualityReport } from "@/lib/types";
import { CURRICULA, CURRICULUM_BY_ID, DURATIONS, CORE_SKILLS_EN, CORE_SKILLS_UR } from "@/lib/curricula";
import { FORMATS } from "@/lib/formats";
import PlanSheet from "./PlanSheet";
import QualityPanel from "./QualityPanel";
import PlanChat from "./PlanChat";
import { downloadDocx } from "@/lib/export/docx";
import { SAMPLE_PLAN } from "@/lib/sample-plan";
import { validate } from "@/lib/validator";

const today = () => new Date().toISOString().slice(0, 10);

const INITIAL: LessonBrief = {
  curriculum: "cambridge", grade: "Stage 4", subject: "Mathematics",
  topic: "", duration: 40, classStrength: "40", averageAge: "9",
  bookName: "", pageNos: "", teacherName: "", section: "", date: today(),
  lessonNo: "", coreSkill: "", language: "en", format: "bed-english",
  priorKnowledge: "", notes: "", lowResource: false,
  includeHomework: true, strictRepair: true,
};

export default function Planner() {
  const [brief, setBrief] = useState<LessonBrief>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [streamText, setStreamText] = useState("");
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [model, setModel] = useState("");
  const [elapsed, setElapsed] = useState<number | undefined>();
  const [pass, setPass] = useState(1);
  const [error, setError] = useState("");
  const [refining, setRefining] = useState<string | null>(null);
  /** Snapshots taken before each chat edit, so every change is reversible. */
  const [undoStack, setUndoStack] = useState<{ plan: LessonPlan; quality: QualityReport | null }[]>([]);
  const [changed, setChanged] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Kept in a ref so applyChatEdit can snapshot without re-creating itself.
  const planRef = useRef<{ plan: LessonPlan; quality: QualityReport | null } | null>(null);
  useEffect(() => {
    planRef.current = plan ? { plan, quality } : null;
  }, [plan, quality]);

  const curriculum = CURRICULUM_BY_ID[brief.curriculum];
  const format = FORMATS.find((f) => f.id === brief.format);
  const coreSkills = format?.language === "ur" ? CORE_SKILLS_UR : CORE_SKILLS_EN;

  const set = useCallback(<K extends keyof LessonBrief>(k: K, v: LessonBrief[K]) => {
    setBrief((b) => ({ ...b, [k]: v }));
  }, []);

  // Switching curriculum should not leave a stale grade or subject behind.
  const setCurriculum = (id: string) => {
    const c = CURRICULUM_BY_ID[id];
    setBrief((b) => ({
      ...b,
      curriculum: id,
      grade: c?.grades.some((g) => g.value === b.grade) ? b.grade : (c?.grades[2]?.value ?? c?.grades[0]?.value ?? ""),
      subject: c?.subjects.includes(b.subject) ? b.subject : (c?.subjects[0] ?? ""),
      bookName: c?.books.includes(b.bookName) ? b.bookName : "",
    }));
  };

  const grade = curriculum?.grades.find((g) => g.value === brief.grade);

  const generate = async () => {
    if (!brief.topic.trim() || busy) return;
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;

    setBusy(true); setError(""); setPlan(null); setQuality(null);
    setStreamText(""); setElapsed(undefined); setPass(1);
    setUndoStack([]); setChanged([]);
    setStatus("Connecting to the model");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...brief, averageAge: brief.averageAge || grade?.age || "" }),
        signal: ctl.signal,
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line); } catch { continue; }

          switch (ev.type) {
            case "status": setStatus(String(ev.message)); break;
            case "model":
              setModel(String(ev.model));
              setStatus(`Writing the plan with ${String(ev.model).split("/").pop()?.replace(":free", "")}`);
              break;
            case "delta": setStreamText((s) => s + String(ev.text)); break;
            case "plan":
              setPlan(ev.plan as LessonPlan);
              setQuality(ev.quality as QualityReport);
              setPass(Number(ev.pass ?? 1));
              if (ev.model) setModel(String(ev.model));
              break;
            case "done":
              setQuality(ev.quality as QualityReport);
              setElapsed(Number(ev.elapsedMs));
              setStatus("");
              break;
            case "error": setError(String(ev.message)); break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  const refine = async (section: string) => {
    if (!plan || refining) return;
    const instruction = window.prompt(
      `How should the "${section}" section change?\n\nLeave blank to simply make it stronger.`,
      "",
    );
    if (instruction === null) return;
    setRefining(section);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, brief, section, instruction }),
      });
      const j = await res.json();
      if (j.error) setError(j.error);
      else { setPlan(j.plan); setQuality(j.quality); }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefining(null);
    }
  };

  /** Show a finished plan without spending a generation. */
  const loadSample = useCallback(() => {
    const sampleBrief: LessonBrief = {
      ...INITIAL,
      curriculum: "cambridge", grade: "Stage 4", subject: "Mathematics",
      topic: "Equivalent Fractions", duration: 40, classStrength: "42",
      averageAge: "9", lessonNo: "12", section: "B",
      bookName: "Cambridge Primary Mathematics Learner's Book",
      coreSkill: "Numeracy", format: "bed-english", language: "en",
    };
    setBrief(sampleBrief);
    setPlan(SAMPLE_PLAN);
    setQuality(validate(SAMPLE_PLAN, sampleBrief));
    setModel(""); setElapsed(undefined); setPass(1);
    setError(""); setUndoStack([]); setChanged([]);
  }, []);

  const applyChatEdit = useCallback(
    (nextPlan: LessonPlan, nextQuality: QualityReport, changedSections: string[]) => {
      setUndoStack((stack) => {
        const snapshot = planRef.current;
        return snapshot ? [...stack.slice(-19), snapshot] : stack;
      });
      setPlan(nextPlan);
      setQuality(nextQuality);
      setChanged(changedSections);
    },
    [],
  );

  const undoChatEdit = useCallback(() => {
    setUndoStack((stack) => {
      if (!stack.length) return stack;
      const prev = stack[stack.length - 1];
      setPlan(prev.plan);
      setQuality(prev.quality);
      setChanged([]);
      return stack.slice(0, -1);
    });
  }, []);

  // Highlights fade on their own so the sheet does not stay lit up.
  useEffect(() => {
    if (!changed.length) return;
    const t = setTimeout(() => setChanged([]), 2600);
    return () => clearTimeout(t);
  }, [changed]);

  const streamPreview = useMemo(() => {
    if (!streamText) return "";
    // Show the human-readable values arriving, not raw JSON punctuation.
    const words = streamText.replace(/[{}\[\]"]/g, " ").replace(/\s+/g, " ").trim();
    return words.slice(-600);
  }, [streamText]);

  return (
    <div className="min-h-screen bg-wash/40">
      {/* ------------------------------ top bar ------------------------------ */}
      <header className="no-print sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink text-[13px] font-bold text-lime">س</span>
            <span className="wordmark text-[15px]">Sabaq</span>
          </Link>
          <span className="hidden text-[12px] text-faint md:inline">Lesson planner</span>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {plan && (
              <>
                <button onClick={() => window.print()} className="btn btn-ghost h-9 px-3 text-[12.5px]"><span className="hidden sm:inline">Print / </span>PDF</button>
                <button onClick={() => downloadDocx(plan, brief.format)} className="btn btn-ghost h-9 px-3 text-[12.5px]">Word</button>
              </>
            )}
            <button onClick={generate} disabled={busy || !brief.topic.trim()} className="btn btn-lime h-9 px-3.5 text-[12.5px]">
              {busy ? "Writing…" : plan ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-4 lg:grid-cols-[370px_1fr]">
        {/* ------------------------------- form ------------------------------- */}
        <aside className="no-print lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-1 thin-scroll">
          <div className="card p-4">
            <h2 className="display-sm text-[15px]">The brief</h2>
            <p className="mt-0.5 text-[11.5px] text-faint">Only the topic is required. Everything else sharpens the plan.</p>

            {/* curriculum */}
            <div className="mt-4">
              <span className="label">Curriculum</span>
              <div className="flex flex-wrap gap-1.5">
                {CURRICULA.map((c) => (
                  <button key={c.id} onClick={() => setCurriculum(c.id)} className="chip" data-on={brief.curriculum === c.id}>
                    {c.short}
                  </button>
                ))}
              </div>
              {curriculum && <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{curriculum.blurb}</p>}
            </div>

            {/* format */}
            <div className="mt-4">
              <span className="label">Output format</span>
              <div className="space-y-1.5">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => set("format", f.id)}
                    className={`w-full rounded-xl border p-2.5 text-left transition-colors ${brief.format === f.id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-[#cfdae3]"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[12.5px] font-semibold ${f.language === "ur" ? "urdu !text-[15px]" : ""}`}>{f.nativeName}</span>
                      <span className={`ml-auto rounded px-1.5 py-0.5 text-[9.5px] font-semibold ${brief.format === f.id ? "bg-white/15 text-white/70" : "bg-wash text-faint"}`}>
                        {f.language === "ur" ? "اردو" : "EN"}
                      </span>
                    </div>
                    <div className={`mt-0.5 text-[10.5px] leading-snug ${brief.format === f.id ? "text-white/55" : "text-faint"} ${f.language === "ur" ? "urdu" : ""}`}>
                      {f.blurb}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div>
                <label className="label" htmlFor="grade">Class / Stage</label>
                <select id="grade" className="field" value={brief.grade} onChange={(e) => set("grade", e.target.value)}>
                  {curriculum?.grades.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="subject">Subject</label>
                <select id="subject" className="field" value={brief.subject} onChange={(e) => set("subject", e.target.value)}>
                  {curriculum?.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="topic">
                Topic <span className="font-normal text-clay">required</span>
              </label>
              <input
                id="topic" className="field" value={brief.topic}
                onChange={(e) => set("topic", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate(); }}
                placeholder="Equivalent fractions"
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="label" htmlFor="duration">Duration</label>
                <select id="duration" className="field" value={brief.duration} onChange={(e) => set("duration", Number(e.target.value))}>
                  {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="strength">Class strength</label>
                <input id="strength" className="field" value={brief.classStrength} onChange={(e) => set("classStrength", e.target.value)} placeholder="40" inputMode="numeric" />
              </div>
            </div>

            <div className="mt-3">
              <label className="label" htmlFor="book">Textbook / series</label>
              <input
                id="book" className="field" list="book-list" value={brief.bookName}
                onChange={(e) => set("bookName", e.target.value)}
                placeholder={curriculum?.books[0] ?? "Optional"}
              />
              <datalist id="book-list">
                {curriculum?.books.map((b) => <option key={b} value={b} />)}
              </datalist>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <div>
                <label className="label" htmlFor="pages">Page numbers</label>
                <input id="pages" className="field" value={brief.pageNos} onChange={(e) => set("pageNos", e.target.value)} placeholder="only if you know" />
              </div>
              <div>
                <label className="label" htmlFor="coreSkill">Core skill</label>
                <input id="coreSkill" className="field" list="skill-list" value={brief.coreSkill} onChange={(e) => set("coreSkill", e.target.value)} placeholder="optional" />
                <datalist id="skill-list">{coreSkills.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
            </div>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-faint">
              Leave pages blank and nothing will be invented. The validator rejects any plan
              citing a page you did not give.
            </p>

            <details className="mt-4 rounded-xl border border-line">
              <summary className="cursor-pointer list-none px-3 py-2.5 text-[12px] font-semibold text-ink">
                Header details &amp; options
              </summary>
              <div className="space-y-3 border-t border-line p-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div><label className="label" htmlFor="teacher">Teacher</label>
                    <input id="teacher" className="field" value={brief.teacherName} onChange={(e) => set("teacherName", e.target.value)} /></div>
                  <div><label className="label" htmlFor="sec">Section</label>
                    <input id="sec" className="field" value={brief.section} onChange={(e) => set("section", e.target.value)} placeholder="A" /></div>
                  <div><label className="label" htmlFor="lno">Lesson no</label>
                    <input id="lno" className="field" value={brief.lessonNo} onChange={(e) => set("lessonNo", e.target.value)} /></div>
                  <div><label className="label" htmlFor="dt">Date</label>
                    <input id="dt" type="date" className="field" value={brief.date} onChange={(e) => set("date", e.target.value)} /></div>
                  <div><label className="label" htmlFor="age">Average age</label>
                    <input id="age" className="field" value={brief.averageAge} onChange={(e) => set("averageAge", e.target.value)} placeholder={grade?.age ?? ""} /></div>
                </div>
                <div>
                  <label className="label" htmlFor="prior">What students already know</label>
                  <textarea id="prior" rows={2} className="field" value={brief.priorKnowledge} onChange={(e) => set("priorKnowledge", e.target.value)} placeholder="They can already name the parts of a fraction." />
                </div>
                <div>
                  <label className="label" htmlFor="notes">Anything else</label>
                  <textarea id="notes" rows={2} className="field" value={brief.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Two learners have low vision. Period is right after break." />
                </div>
                <div className="space-y-1.5 pt-1">
                  {([
                    ["lowResource", "Low-resource mode", "Blackboard and chalk only. No printing, no power."],
                    ["includeHomework", "Set homework", "Include a homework task."],
                    ["strictRepair", "Auto-repair failures", "Run a second pass on anything the rubric fails."],
                  ] as const).map(([k, title, sub]) => (
                    <label key={k} className="flex cursor-pointer items-start gap-2.5 rounded-lg p-1.5 hover:bg-wash/60">
                      <input
                        type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#5ea33c]"
                        checked={brief[k] as boolean}
                        onChange={(e) => set(k, e.target.checked as never)}
                      />
                      <span>
                        <span className="block text-[12px] font-medium text-ink">{title}</span>
                        <span className="block text-[10.5px] leading-snug text-faint">{sub}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </details>

            <button onClick={generate} disabled={busy || !brief.topic.trim()} className="btn btn-lime mt-4 w-full">
              {busy ? "Writing the plan…" : "Generate lesson plan"}
            </button>
            <p className="mt-2 text-center text-[10.5px] text-faint">⌘/Ctrl + Enter from the topic field</p>
          </div>

          {quality && <div className="mt-4"><QualityPanel report={quality} model={model} elapsedMs={elapsed} pass={pass} /></div>}
        </aside>

        {/* ------------------------------ output ------------------------------ */}
        <section>
          {error && (
            <div className="no-print mb-4 rounded-xl border border-[#f3c7c0] bg-[#fdf3f1] p-4">
              <div className="text-[13px] font-semibold text-[#a93226]">Could not finish the plan</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#8f4a41]">{error}</p>
              <p className="mt-2 text-[11.5px] text-[#a1685f]">
                If this mentions a key or a model, run <code className="rounded bg-white/70 px-1">npm run doctor</code> to
                see which free models your OpenRouter key can reach.
              </p>
            </div>
          )}

          {busy && !plan && (
            <div className="card p-6">
              <div className="flex items-center gap-2.5">
                <span className="live-dot h-2 w-2 rounded-full bg-grass" />
                <span className="display-sm text-[14px]">{status || "Working"}</span>
              </div>
              <div className="mt-4 space-y-2">
                {[92, 78, 85, 60].map((w, i) => (
                  <div key={i} className="shimmer h-3 rounded-full bg-wash" style={{ width: `${w}%` }} />
                ))}
              </div>
              {streamPreview && (
                <p className="mt-5 max-h-28 overflow-hidden text-[11.5px] leading-relaxed text-faint">
                  {streamPreview}
                </p>
              )}
            </div>
          )}

          {!busy && !plan && !error && (
            <div className="card grid min-h-[380px] place-items-center p-8 text-center">
              <div>
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-wash text-[20px]">✳</div>
                <h3 className="display-sm text-[18px]">Your lesson plan appears here</h3>
                <p className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed text-muted">
                  Pick the curriculum and format on the left, type a topic, and Sabaq will
                  write the full plan, score it against eleven checks and repair whatever fails.
                </p>
                <button onClick={loadSample} className="btn btn-ghost mt-5 px-4">
                  See a finished sample plan
                </button>
                <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                  {["Equivalent fractions", "Photosynthesis", "اسمِ صفت", "Persuasive writing", "Newton's second law"].map((t) => (
                    <button key={t} onClick={() => set("topic", t)} className={`chip ${/[؀-ۿ]/.test(t) ? "urdu" : ""}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {plan && (
            <>
            <div className="card p-5 sm:p-7">
              {busy && (
                <div className="no-print mb-4 flex items-center gap-2 rounded-lg bg-wash px-3 py-2">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-grass" />
                  <span className="text-[11.5px] text-muted">{status || "Refining"}</span>
                </div>
              )}
              <PlanSheet
                plan={plan}
                formatId={brief.format}
                onRefine={refine}
                refining={refining}
                changed={changed}
              />
            </div>

            <PlanChat
              plan={plan}
              brief={brief}
              quality={quality}
              onApply={applyChatEdit}
              onUndo={undoChatEdit}
              canUndo={undoStack.length > 0}
            />
          </>
          )}
        </section>
      </div>
    </div>
  );
}
