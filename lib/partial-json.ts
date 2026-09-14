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
 * Close a truncated fragment so JSON.parse succeeds.
 *
 * Closing at the exact cut point is not enough: a stream can die mid-escape
 * (`"...\\`), mid-number, or between a key and its value, and any of those
 * still fails to parse once braces are added. So the scan also records every
 * SAFE CUT POINT — an index where the parser sits outside a string, just after
 * a complete value — and the caller can retreat to the most recent one and
 * close from there. Retreating loses at most one array element or object
 * member, which salvage.ts then prunes anyway.
 */
function scan(s: string) {
  const stack: string[] = [];
  const safe: number[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (escaped) { escaped = false; continue; }
    if (c === "\\") { escaped = true; continue; }
    if (c === '"') {
      inString = !inString;
      if (!inString) safe.push(i + 1);      // a complete string just ended
      continue;
    }
    if (inString) continue;
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") { stack.pop(); safe.push(i + 1); }
    else if (c === ",") safe.push(i + 1);
    else if (/[\d]/.test(c) && !/[\d.eE+-]/.test(s[i + 1] ?? "")) safe.push(i + 1);
  }
  return { stack, safe, inString, escaped };
}

/** Close the fragment exactly where it stops, without retreating. */
export function repairPartial(fragment: string): string | null {
  const s = extract(fragment);
  if (!s.trim().startsWith("{")) return null;

  const { stack, inString, escaped } = scan(s);
  let out = s;

  // A trailing lone backslash would escape the quote we are about to add.
  if (escaped) out = out.slice(0, -1);

  if (inString) {
    // A cut inside an escape (`\u00`, `\`) leaves a sequence that stays invalid
    // however we close it, so drop back to before the backslash that opened it.
    const bs = out.lastIndexOf("\\");
    if (bs !== -1) {
      const tail = out.slice(bs);
      const complete = /^\\(?:u[0-9a-fA-F]{4}|["\\/bfnrt])/.test(tail);
      if (!complete) out = out.slice(0, bs);
    }
    out += '"';
  }

  // Drop a dangling comma, then a key with no value, then the comma before it.
  out = out
    .replace(/,\s*$/, "")
    .replace(/"(?:[^"\\]|\\.)*"\s*:\s*$/, "")
    .replace(/,\s*$/, "");

  // A bare key with no colon at all, e.g. `{"a"` — only inside an object.
  if (stack[stack.length - 1] === "{") {
    out = out.replace(/([{,])\s*"(?:[^"\\]|\\.)*"\s*$/, "$1");
  }
  out = out.replace(/([{[])\s*,\s*$/, "$1").replace(/,\s*$/, "");

  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === "{" ? "}" : "]";
  return out;
}

/**
 * Best-effort parse of a complete or in-flight response.
 *
 * Tries the text as-is, then closed at the cut point, then closed at each
 * earlier safe boundary. Cheap: one scan, then at most a few dozen parses of a
 * shrinking string, and it turns "the stream died" into a usable plan.
 */
export function parseLoose<T = unknown>(raw: string): T | null {
  const direct = extract(raw);
  if (!direct.trim().startsWith("{")) return null;

  try {
    return JSON.parse(direct) as T;
  } catch {
    /* truncated — repair below */
  }

  const closed = repairPartial(direct);
  if (closed) {
    try { return JSON.parse(closed) as T; } catch { /* retreat */ }
  }

  const { safe } = scan(direct);
  // Newest boundaries first: keep as much of the plan as possible.
  for (let i = safe.length - 1, tried = 0; i >= 0 && tried < 60; i--, tried++) {
    const candidate = repairPartial(direct.slice(0, safe[i]));
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* keep retreating */
    }
  }
  return null;
}
