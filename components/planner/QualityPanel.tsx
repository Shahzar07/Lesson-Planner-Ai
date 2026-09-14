"use client";

import type { QualityReport } from "@/lib/types";

export default function QualityPanel({ report, model, elapsedMs, pass }: {
  report: QualityReport;
  model?: string;
  elapsedMs?: number;
  pass?: number;
}) {
  const tone = report.score >= 90 ? "emerald" : report.score >= 75 ? "#d99100" : "#c0392b";
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-4 border-b border-line p-4">
        <div className="relative grid h-14 w-14 shrink-0 place-items-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#eef3f6" strokeWidth="3.5" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              stroke={tone === "emerald" ? "var(--color-emerald)" : tone}
              strokeWidth="3.5" strokeLinecap="round"
              strokeDasharray={`${(report.score / 100) * 97.4} 97.4`}
              style={{ transition: "stroke-dasharray .8s cubic-bezier(.22,1,.36,1)" }}
            />
          </svg>
          <span className="text-[15px] font-bold tabular-nums tracking-tight">{report.score}</span>
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold tracking-tight">Accuracy score</div>
          <div className="text-[11.5px] text-faint">
            {report.failures.length === 0
              ? "All eleven checks passed"
              : `${report.failures.length} check${report.failures.length === 1 ? "" : "s"} still failing`}
          </div>
          {(model || elapsedMs) && (
            <div className="mt-0.5 truncate text-[10.5px] text-faint">
              {model?.split("/").pop()?.replace(":free", " · free")}
              {elapsedMs ? ` · ${(elapsedMs / 1000).toFixed(1)}s` : ""}
              {pass && pass > 1 ? " · repaired" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[300px] divide-y divide-line overflow-y-auto thin-scroll">
        {report.checks.map((c) => (
          <details key={c.id} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-2.5 hover:bg-wash/50">
              <span className={`grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white ${c.passed ? "bg-emerald" : "bg-[#e0a800]"}`}
                style={{ height: 18, width: 18 }}>
                {c.passed ? "✓" : "!"}
              </span>
              <span className="flex-1 text-[12px] font-medium text-ink">{c.label}</span>
              <span className="text-[10.5px] tabular-nums text-faint">{c.weight}</span>
            </summary>
            <p className="px-4 pb-3 pl-11 text-[11.5px] leading-relaxed text-muted">{c.detail}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
