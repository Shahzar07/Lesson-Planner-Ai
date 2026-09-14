"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseLoose } from "@/lib/partial-json";

/* ------------------------------------------------------------------ *
 * Streaming preview.
 *
 * A free model needs a good half-minute to write a full plan. Staring at a
 * shimmer for that long feels broken; watching the objectives land at eight
 * seconds and the stages fill in after does not. Same wall clock, completely
 * different experience — and it is honest, because this really is the plan
 * being written.
 * ------------------------------------------------------------------ */

interface Partial {
  coreConcept?: string;
  objectives?: { text?: string; bloomLevel?: string }[];
  methodology?: { primaryMethod?: string };
  procedure?: { title?: string; minutes?: number; teacherDoes?: string }[];
  differentiation?: { support?: string[]; extension?: string[] };
  evaluation?: { items?: { question?: string }[] };
  homework?: { task?: string };
}

const STEPS = [
  ["coreConcept", "Core concept"],
  ["objectives", "Objectives"],
  ["methodology", "Methodology"],
  ["procedure", "Procedure"],
  ["differentiation", "Differentiation"],
  ["evaluation", "Evaluation"],
  ["homework", "Homework"],
] as const;

export default function LivePreview({
  raw, status, model, startedAt, urdu,
}: {
  raw: string;
  status: string;
  model: string;
  startedAt: number;
  urdu: boolean;
}) {
  const [tick, setTick] = useState(0);
  const lastParse = useRef(0);
  const cached = useRef<Partial>({});

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  // Parsing every token would burn the main thread; twice a second is plenty.
  const plan = useMemo(() => {
    const now = Date.now();
    if (now - lastParse.current > 400 || !cached.current.objectives) {
      lastParse.current = now;
      const p = parseLoose<Partial>(raw);
      if (p && typeof p === "object") cached.current = p;
    }
    return cached.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, tick]);

  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  const done = new Set(STEPS.filter(([k]) => {
    const v = plan[k as keyof Partial];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }).map(([k]) => k));

  const stageTotal = (plan.procedure ?? []).reduce((n, s) => n + (Number(s?.minutes) || 0), 0);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="live-dot h-2 w-2 shrink-0 rounded-full bg-grass" />
        <span className="display-sm text-[13.5px]">{status || "Writing the plan"}</span>
        <span className="ml-auto flex items-center gap-2 text-[11px] text-faint">
          {model && <span className="hidden sm:inline">{model.split("/").pop()?.replace(":free", "")}</span>}
          <span className="tabular-nums">{seconds}s</span>
        </span>
      </div>

      {/* what has landed so far */}
      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5">
        {STEPS.map(([key, label]) => (
          <span key={key}
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors ${
              done.has(key) ? "bg-emerald/10 text-emerald" : "bg-wash text-faint"
            }`}>
            {done.has(key) ? "✓ " : ""}{label}
          </span>
        ))}
      </div>

      <div className={`space-y-4 p-4 ${urdu ? "urdu" : ""}`}>
        {plan.coreConcept && (
          <p className="text-[13.5px] leading-relaxed text-ink">{plan.coreConcept}</p>
        )}

        {(plan.objectives ?? []).length > 0 && (
          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">Objectives</div>
            <ol className="space-y-1.5">
              {plan.objectives!.filter((o) => o?.text).map((o, i) => (
                <li key={i} className="flex gap-2">
                  {o.bloomLevel && (
                    <span className="mt-0.5 shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald">
                      {o.bloomLevel}
                    </span>
                  )}
                  <span className="flex-1 text-[13px] leading-relaxed text-ink">{o.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {(plan.procedure ?? []).length > 0 && (
          <div>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-faint">Procedure</span>
              {stageTotal > 0 && (
                <span className="text-[10.5px] tabular-nums text-faint">{stageTotal} min so far</span>
              )}
            </div>
            <div className="space-y-1.5">
              {plan.procedure!.filter((s) => s?.title).map((s, i) => (
                <div key={i} className="rounded-lg border border-line px-2.5 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[12.5px] font-semibold text-ink">{s.title}</span>
                    {typeof s.minutes === "number" && (
                      <span className="ml-auto shrink-0 text-[11px] tabular-nums text-faint">{s.minutes} min</span>
                    )}
                  </div>
                  {s.teacherDoes && (
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-muted">{s.teacherDoes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(plan.evaluation?.items ?? []).length > 0 && (
          <div>
            <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-faint">Evaluation</div>
            <ul className="space-y-1">
              {plan.evaluation!.items!.filter((it) => it?.question).map((it, i) => (
                <li key={i} className="text-[12.5px] leading-relaxed text-muted">{it.question}</li>
              ))}
            </ul>
          </div>
        )}

        {!plan.coreConcept && !(plan.objectives ?? []).length && (
          <div className="space-y-2 py-2">
            {[92, 78, 85, 60].map((w, i) => (
              <div key={i} className="shimmer h-3 rounded-full bg-wash" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
