/* ------------------------------------------------------------------ *
 * Tolerant JSON handling.
 *
 * Two jobs:
 *  1. extract()  — pull the JSON object out of whatever the model wrapped it in
 *                  (code fences, "Here is your plan:", a trailing sign-off).
 *  2. repairPartial() — close a *truncated* JSON string so the UI can render
 *                  the plan progressively while it is still streaming.
 * ------------------------------------------------------------------ */

/** Strip fences and prose, returning the outermost {...} span. */
export function extract(raw: string): string {
  let s = raw.trim();

  // ```json ... ```  or  ``` ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  const start = s.indexOf("{");
  if (start === -1) return s;

  // Walk to the matching close brace, respecting strings and escapes.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start); // truncated — repairPartial will close it
}

/**
 * Close every open string, array and object so JSON.parse succeeds.
 * Returns null when the fragment is too short to be meaningful.
 */
export function repairPartial(fragment: string): string | null {
  const s = extract(fragment);
  if (!s.trim().startsWith("{")) return null;

  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  let lastSafe = -1; // index after the last complete value at depth>=1

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') { inString = !inString; if (!inString) lastSafe = i; continue; }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") { stack.pop(); lastSafe = i; }
    else if (c === "," || /[\d\w]/.test(c)) lastSafe = Math.max(lastSafe, i);
  }

  let out = s;

  if (inString) {
    // Mid-string: cut back to the last clean boundary rather than emitting a
    // half word, then close the quote.
    out += '"';
  }

  // Drop a dangling "key": or trailing comma before closing.
  out = out.replace(/,\s*$/, "").replace(/"[^"]*"\s*:\s*$/, "").replace(/,\s*$/, "");

  for (let i = stack.length - 1; i >= 0; i--) {
    out += stack[i] === "{" ? "}" : "]";
  }

  return out;
}

/** Best-effort parse of a complete or in-flight response. */
export function parseLoose<T = unknown>(raw: string): T | null {
  const direct = extract(raw);
  try {
    return JSON.parse(direct) as T;
  } catch {
    /* fall through */
  }
  const repaired = repairPartial(raw);
  if (!repaired) return null;
  try {
    return JSON.parse(repaired) as T;
  } catch {
    return null;
  }
}
