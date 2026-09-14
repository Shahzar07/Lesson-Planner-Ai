/** A static replica of the planner UI, used as the hero product shot. */
export default function AppMock() {
  return (
    <div className="card overflow-hidden bg-white" style={{ boxShadow: "0 40px 80px -32px rgb(10 16 22 / .28), 0 8px 24px -12px rgb(10 16 22 / .12)" }}>
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#f0625a]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f7bd4f]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#5fc95f]" />
        </div>
        <div className="mx-auto flex h-6 max-w-[240px] flex-1 items-center justify-center rounded-md bg-wash px-3 text-[10px] text-faint">
          sabaq.ai/plan
        </div>
      </div>

      <div className="grid grid-cols-[150px_1fr] md:grid-cols-[168px_1fr_190px]">
        {/* sidebar */}
        <aside className="border-r border-line bg-wash/60 p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-ink text-[10px] font-bold text-lime">س</span>
            <span className="text-[12px] font-bold tracking-tight">Sabaq</span>
          </div>
          {[
            ["New plan", true],
            ["My plans", false],
            ["Formats", false],
            ["Curricula", false],
            ["Schemes of work", false],
          ].map(([label, on]) => (
            <div
              key={String(label)}
              className={`mb-0.5 rounded-lg px-2.5 py-1.5 text-[11px] ${on ? "bg-white font-semibold text-ink shadow-sm" : "text-muted"}`}
            >
              {String(label)}
            </div>
          ))}
          <div className="mt-4 rounded-xl border border-line bg-white p-2.5">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-faint">Accuracy</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[22px] font-bold leading-none tracking-tight text-emerald">96</span>
              <span className="text-[10px] text-faint">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wash">
              <div className="h-full w-[96%] rounded-full bg-emerald" />
            </div>
          </div>
        </aside>

        {/* plan sheet */}
        <section className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-ink px-2 py-0.5 text-[9.5px] font-semibold text-white">Cambridge</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] text-muted">Stage 4</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] text-muted">Mathematics</span>
            <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] text-muted">40 min</span>
          </div>

          <h4 className="text-[15px] font-bold tracking-tight">Equivalent Fractions</h4>
          <p className="mt-0.5 text-[10.5px] text-faint">B.Ed Standard format · Lesson 12</p>

          <div className="mt-3 space-y-2.5">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-faint">Specific Objectives</div>
              <div className="mt-1 space-y-1">
                {[
                  ["Apply", "…will be able to generate two equivalent fractions for a given fraction using a fraction wall, correctly for 4 of 5."],
                  ["Analyse", "…will be able to explain why 1/2 and 3/6 name the same amount, using a diagram."],
                ].map(([lvl, txt]) => (
                  <div key={String(txt)} className="flex gap-2 rounded-lg border border-line bg-wash/40 p-1.5">
                    <span className="h-fit shrink-0 rounded bg-emerald/10 px-1.5 py-0.5 text-[8.5px] font-semibold text-emerald">{lvl}</span>
                    <span className="text-[10px] leading-snug text-muted">{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-faint">Procedure</div>
              <div className="mt-1 space-y-1">
                {[
                  ["Initiation Activity", "5", "#bef264"],
                  ["Development — fraction wall", "14", "#a8e63f"],
                  ["Development — equivalence rule", "8", "#7cb857"],
                  ["Board Summary", "4", "#5ea33c"],
                  ["Recapitulation", "5", "#4f8f38"],
                  ["Evaluation", "4", "#2f6b2c"],
                ].map(([t, m, c]) => (
                  <div key={String(t)} className="flex items-center gap-2">
                    <span className="h-1.5 rounded-full" style={{ width: `${Number(m) * 5}px`, background: String(c) }} />
                    <span className="flex-1 truncate text-[10px] text-muted">{t}</span>
                    <span className="text-[9.5px] font-semibold tabular-nums text-ink">{m}′</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-line pt-1 text-[9.5px]">
                  <span className="text-faint">Total</span>
                  <span className="font-bold text-emerald">40 / 40 ✓</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* rubric rail */}
        <aside className="hidden border-l border-line p-3 md:block">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-faint">Quality rubric</div>
          <div className="mt-2 space-y-1.5">
            {[
              ["Timings total", true],
              ["Measurable verbs", true],
              ["ABCD objectives", true],
              ["Bloom spread", true],
              ["Script-level steps", true],
              ["Differentiation", true],
              ["AfL checkpoints", true],
              ["No invented pages", true],
              ["Local context", false],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center gap-1.5">
                <span
                  className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full text-[8px] font-bold text-white ${ok ? "bg-emerald" : "bg-[#f7bd4f]"}`}
                >
                  {ok ? "✓" : "!"}
                </span>
                <span className="truncate text-[9.5px] text-muted">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-ink p-2">
            <div className="text-[8.5px] text-white/50">Model</div>
            <div className="text-[9.5px] font-semibold text-lime">DeepSeek V3 · free</div>
            <div className="mt-0.5 text-[8.5px] text-white/40">7.8s · repaired 1 issue</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
