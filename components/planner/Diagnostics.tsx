"use client";

import { useState } from "react";

interface Probe { model: string; ok: boolean; ms: number; ttfc?: number; status?: number; reason?: string; reasoningOnly?: boolean }
interface Report {
  ok: boolean;
  keyConfigured: boolean;
  keyPreview?: string;
  problem?: string;
  fix?: string;
  catalogue?: { count: number; error?: string };
  chains?: { en: string[]; ur: string[]; source: string; note?: string };
  probes?: Probe[];
  fastest?: string | null;
  suggestedEnv?: Record<string, string> | null;
  allFree?: string[];
}

/**
 * Runs against the server the app is actually deployed on, which is the only
 * place that can answer "is the key set, can we reach OpenRouter, and does the
 * account's privacy setting allow free models".
 */
export default function Diagnostics({
  message, hint, attempts,
}: {
  message: string;
  hint?: string;
  attempts?: { model: string; reason?: string; status?: number }[];
}) {
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true);
    setReport(null);
    try {
      const res = await fetch("/api/doctor");
      setReport(await res.json());
    } catch (e) {
      setReport({ ok: false, keyConfigured: false, problem: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const envText = report?.suggestedEnv
    ? Object.entries(report.suggestedEnv).map(([k, v]) => `${k}=${v}`).join("\n")
    : "";

  return (
    <div className="no-print mb-4 rounded-xl border border-[#f3c7c0] bg-[#fdf3f1] p-4">
      <div className="text-[13px] font-semibold text-[#a93226]">Could not finish the plan</div>
      <p className="mt-1 text-[12.5px] leading-relaxed text-[#8f4a41]">{message}</p>

      {hint && (
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[12px] leading-relaxed text-[#7a4038]">
          {hint.split(/(https?:\/\/\S+)/).map((part, i) =>
            part.startsWith("http") ? (
              <a key={i} href={part} target="_blank" rel="noreferrer noopener"
                className="font-semibold underline underline-offset-2">{part}</a>
            ) : part,
          )}
        </p>
      )}

      {attempts && attempts.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[11.5px] font-medium text-[#a1685f]">
            What each model said ({attempts.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5">
            {attempts.map((a, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-[#8f4a41]">
                <span className="font-mono">{a.model.split("/").pop()}</span>
                <span className="text-[#a1685f]">— {a.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <button onClick={run} disabled={busy}
        className="btn mt-3 h-9 border border-[#e6b5ac] bg-white px-4 text-[12.5px] text-[#a93226] hover:bg-white/80">
        {busy ? "Testing the server…" : "Run diagnosis on the server"}
      </button>

      {report && (
        <div className="mt-3 space-y-2 rounded-xl border border-[#eccfc8] bg-white p-3">
          <div className="flex items-center gap-2">
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${report.ok ? "bg-emerald" : "bg-[#c0392b]"}`}>
              {report.ok ? "✓" : "!"}
            </span>
            <span className="text-[12.5px] font-semibold text-ink">
              {report.ok ? "At least one free model is working" : "No model is working yet"}
            </span>
          </div>

          <dl className="space-y-1 text-[11.5px]">
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-faint">Key on server</dt>
              <dd className="text-ink">{report.keyConfigured ? report.keyPreview ?? "set" : "NOT SET"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 text-faint">Free models seen</dt>
              <dd className="text-ink">
                {report.catalogue?.error ? `unreachable — ${report.catalogue.error}` : report.catalogue?.count ?? 0}
              </dd>
            </div>
            {report.chains && (
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-faint">Chain source</dt>
                <dd className="text-ink">{report.chains.source}</dd>
              </div>
            )}
          </dl>

          {report.probes && report.probes.length > 0 && (
            <div className="space-y-1 border-t border-line pt-2">
              {report.probes.map((p) => (
                <div key={p.model} className="flex items-center gap-2 text-[11px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${p.ok ? "bg-emerald" : "bg-[#c0392b]"}`} />
                  <span className="flex-1 truncate font-mono text-ink">{p.model}</span>
                  <span className="shrink-0 text-faint">
                    {p.ok ? `first word in ${((p.ttfc ?? p.ms) / 1000).toFixed(1)}s` : p.reason}
                  </span>
                </div>
              ))}
            </div>
          )}

          {report.problem && (
            <div className="border-t border-line pt-2">
              <p className="text-[12px] font-semibold text-[#a93226]">{report.problem}</p>
              {report.fix && (
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
                  {report.fix.split(/(https?:\/\/\S+)/).map((part, i) =>
                    part.startsWith("http") ? (
                      <a key={i} href={part} target="_blank" rel="noreferrer noopener"
                        className="font-semibold text-ink underline underline-offset-2">{part}</a>
                    ) : part,
                  )}
                </p>
              )}
            </div>
          )}

          {report.allFree && report.allFree.length > 0 && (
            <details className="border-t border-line pt-2">
              <summary className="cursor-pointer text-[11.5px] font-medium text-muted">
                Every free model your key can see ({report.allFree.length})
              </summary>
              <p className="mt-1 text-[11px] leading-relaxed text-faint">
                Ranked as the app would try them. Anything marked
                <span className="mx-1 rounded bg-wash px-1 font-mono">reasoning</span>
                thinks before it writes, so it is tried last.
              </p>
              <ul className="mt-1.5 max-h-44 space-y-0.5 overflow-y-auto thin-scroll">
                {report.allFree.map((id) => (
                  <li key={id} className="truncate font-mono text-[10.5px] text-muted">{id}</li>
                ))}
              </ul>
            </details>
          )}

          {envText && (
            <div className="border-t border-line pt-2">
              <p className="mb-1 text-[11px] text-faint">
                Optional: pin these in your host&rsquo;s environment variables to skip the dead ones.
              </p>
              <pre className="overflow-x-auto rounded-lg bg-wash p-2 text-[10.5px] leading-relaxed text-ink">{envText}</pre>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(envText).then(
                    () => { setCopied(true); setTimeout(() => setCopied(false), 1600); },
                    () => {},
                  );
                }}
                className="mt-1 text-[11px] font-medium text-grass-deep hover:underline"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
