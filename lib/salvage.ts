import { LessonPlanSchema, type LessonPlan } from "@/lib/types";

/* ------------------------------------------------------------------ *
 * Salvage.
 *
 * A free model on a serverless function gets cut off: the platform's wall
 * clock runs out, or the provider drops the connection at 90% written. The
 * old behaviour threw that away and showed an error, which is the worst
 * possible trade — the teacher waited a minute and got nothing, when what
 * arrived was a nearly complete plan.
 *
 * So: prune whatever is half-written and keep the rest. A plan missing its
 * last evaluation item is still a plan. zod supplies defaults for every
 * optional field, so the pruned object still satisfies the same schema the
 * full generator answers to.
 * ------------------------------------------------------------------ */

export interface SalvageResult {
  plan: LessonPlan | null;
  /** true when something had to be dropped to make it valid */
  truncated: boolean;
  dropped: string[];
}

/** Walk a dotted/indexed path and delete the array element it points at. */
function dropAt(root: unknown, path: (string | number)[]): boolean {
  if (!path.length) return false;
  let cur: unknown = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (cur === null || typeof cur !== "object") return false;
    cur = (cur as Record<string | number, unknown>)[path[i]];
  }
  const last = path[path.length - 1];
  if (Array.isArray(cur) && typeof last === "number" && last >= 0 && last < cur.length) {
    cur.splice(last, 1);
    return true;
  }
  return false;
}

/**
 * Try to make an incomplete object satisfy the schema by removing the
 * individual array entries that are broken, rather than failing the whole plan.
 */
export function salvagePlan(raw: unknown): SalvageResult {
  const first = LessonPlanSchema.safeParse(raw);
  if (first.success) return { plan: first.data, truncated: false, dropped: [] };

  if (raw === null || typeof raw !== "object") {
    return { plan: null, truncated: false, dropped: [] };
  }

  const work = structuredClone(raw);
  const dropped: string[] = [];

  // Each pass removes the deepest broken array entries, then re-validates.
  for (let pass = 0; pass < 6; pass++) {
    const attempt = LessonPlanSchema.safeParse(work);
    if (attempt.success) {
      return { plan: attempt.data, truncated: dropped.length > 0, dropped };
    }

    // Deepest first, so removing one does not shift the index of another.
    const targets = attempt.error.issues
      .map((issue) => {
        const p = [...issue.path];
        // Walk back to the nearest array index in the path.
        while (p.length && typeof p[p.length - 1] !== "number") p.pop();
        return p as (string | number)[];
      })
      .filter((p) => p.length > 0)
      .sort((a, b) => b.length - a.length || Number(b[b.length - 1]) - Number(a[a.length - 1]));

    if (!targets.length) break;

    let removedAny = false;
    const seen = new Set<string>();
    for (const t of targets) {
      const key = t.join(".");
      if (seen.has(key)) continue;
      seen.add(key);
      if (dropAt(work, t)) {
        dropped.push(key);
        removedAny = true;
      }
    }
    if (!removedAny) break;
  }

  return { plan: null, truncated: true, dropped };
}
