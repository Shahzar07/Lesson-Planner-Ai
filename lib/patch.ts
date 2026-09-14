/* ------------------------------------------------------------------ *
 * Targeted edits, addressed by JSON Pointer (RFC 6901).
 *
 * Conversational editing works far better when the model returns "change
 * /procedure/1/teacherDoes to X" than when it returns a whole new plan:
 * the edit is surgical, it is auditable, the untouched 95% cannot drift,
 * and it is cheap enough to feel instant on a free model.
 *
 * Everything here is defensive. The paths arrive from a language model, so
 * they are treated as untrusted input: unknown paths are rejected rather
 * than created, and the prototype chain is unreachable by construction.
 * ------------------------------------------------------------------ */

export type EditOp = "replace" | "add" | "remove";

export interface Edit {
  op?: EditOp;
  path: string;
  value?: unknown;
}

export interface AppliedEdit {
  op: EditOp;
  path: string;
  before: unknown;
  after: unknown;
}

export interface PatchResult<T> {
  doc: T;
  applied: AppliedEdit[];
  rejected: { path: string; reason: string }[];
}

const BLOCKED = new Set(["__proto__", "constructor", "prototype"]);

/** "/a/b~1c/0" -> ["a", "b/c", "0"] */
export function parsePointer(pointer: string): string[] | null {
  if (pointer === "" || pointer === "/") return [];
  if (!pointer.startsWith("/")) return null;
  const parts = pointer
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  return parts.some((p) => BLOCKED.has(p)) ? null : parts;
}

export function getAt(doc: unknown, pointer: string): unknown {
  const parts = parsePointer(pointer);
  if (!parts) return undefined;
  let cur: unknown = doc;
  for (const key of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    if (Array.isArray(cur)) {
      const i = Number(key);
      if (!Number.isInteger(i) || i < 0 || i >= cur.length) return undefined;
      cur = cur[i];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, key)) return undefined;
      cur = (cur as Record<string, unknown>)[key];
    }
  }
  return cur;
}

/**
 * Apply edits to a deep copy. Never mutates the input.
 * An edit that does not address something real is rejected, not invented —
 * a hallucinated path must not silently grow a new field on the plan.
 */
export function applyEdits<T>(doc: T, edits: Edit[]): PatchResult<T> {
  const next = structuredClone(doc);
  const applied: AppliedEdit[] = [];
  const rejected: { path: string; reason: string }[] = [];

  for (const edit of edits) {
    const op: EditOp = edit.op ?? "replace";
    const parts = parsePointer(edit.path);

    if (!parts || parts.length === 0) {
      rejected.push({ path: edit.path, reason: "unusable path" });
      continue;
    }
    if (op !== "remove" && edit.value === undefined) {
      rejected.push({ path: edit.path, reason: "no value supplied" });
      continue;
    }

    // Walk to the parent of the target.
    const leaf = parts[parts.length - 1];
    let parent: unknown = next;
    let ok = true;
    for (const key of parts.slice(0, -1)) {
      if (parent === null || typeof parent !== "object") { ok = false; break; }
      if (Array.isArray(parent)) {
        const i = Number(key);
        if (!Number.isInteger(i) || i < 0 || i >= parent.length) { ok = false; break; }
        parent = parent[i];
      } else {
        if (!Object.prototype.hasOwnProperty.call(parent, key)) { ok = false; break; }
        parent = (parent as Record<string, unknown>)[key];
      }
    }
    if (!ok || parent === null || typeof parent !== "object") {
      rejected.push({ path: edit.path, reason: "path does not exist on this plan" });
      continue;
    }

    if (Array.isArray(parent)) {
      const appending = leaf === "-";
      const i = appending ? parent.length : Number(leaf);
      if (!appending && (!Number.isInteger(i) || i < 0 || i > parent.length)) {
        rejected.push({ path: edit.path, reason: "array index out of range" });
        continue;
      }
      if (op === "remove") {
        if (i >= parent.length) {
          rejected.push({ path: edit.path, reason: "nothing at that index" });
          continue;
        }
        applied.push({ op, path: edit.path, before: parent[i], after: undefined });
        parent.splice(i, 1);
      } else if (op === "add") {
        applied.push({ op, path: edit.path, before: undefined, after: edit.value });
        parent.splice(i, 0, edit.value);
      } else {
        if (i >= parent.length) {
          rejected.push({ path: edit.path, reason: "nothing at that index to replace" });
          continue;
        }
        applied.push({ op, path: edit.path, before: parent[i], after: edit.value });
        parent[i] = edit.value;
      }
      continue;
    }

    const obj = parent as Record<string, unknown>;
    const exists = Object.prototype.hasOwnProperty.call(obj, leaf);

    if (op === "remove") {
      if (!exists) {
        rejected.push({ path: edit.path, reason: "field not present" });
        continue;
      }
      applied.push({ op, path: edit.path, before: obj[leaf], after: undefined });
      delete obj[leaf];
      continue;
    }

    // "add" on an object is only allowed where the field already exists in the
    // schema; the plan shape is fixed, so a brand-new key is a hallucination.
    if (!exists) {
      rejected.push({ path: edit.path, reason: "no such field on a lesson plan" });
      continue;
    }
    applied.push({ op: "replace", path: edit.path, before: obj[leaf], after: edit.value });
    obj[leaf] = edit.value;
  }

  return { doc: next, applied, rejected };
}

/** Top-level plan section a pointer belongs to, for highlighting in the UI. */
export function sectionOf(pointer: string): string {
  const parts = parsePointer(pointer);
  return parts && parts.length ? parts[0] : "";
}

/* ------------------------- addressable index ------------------------- */

const MAX = 120;
const trim = (s: string) => (s.length > MAX ? s.slice(0, MAX) + "…" : s);

/**
 * A compact map of every editable path and its current value, so the model
 * can address a real location instead of guessing one. Long strings are
 * truncated: the model needs to know *where* things are, not re-read them.
 */
export function buildIndex(doc: unknown, base = "", out: string[] = []): string[] {
  if (doc === null || doc === undefined) return out;

  if (Array.isArray(doc)) {
    doc.forEach((v, i) => buildIndex(v, `${base}/${i}`, out));
    return out;
  }
  if (typeof doc === "object") {
    for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
      buildIndex(v, `${base}/${k.replace(/~/g, "~0").replace(/\//g, "~1")}`, out);
    }
    return out;
  }
  if (typeof doc === "string") {
    out.push(`${base} = ${JSON.stringify(trim(doc))}`);
  } else {
    out.push(`${base} = ${JSON.stringify(doc)}`);
  }
  return out;
}
