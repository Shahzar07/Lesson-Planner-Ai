/**
 * tsc resolves the "@/..." path alias for type checking but does not rewrite it
 * on emit, so a VALUE import (like zod schemas) survives into .test-build and
 * Node cannot resolve it. Type-only imports are erased, which is why this was
 * not needed until lib/salvage.ts imported a schema rather than a type.
 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".test-build");
if (!fs.existsSync(dir)) process.exit(0);

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
  const p = path.join(dir, file);
  const before = fs.readFileSync(p, "utf8");
  const after = before.replace(/(["'])@\/lib\/([A-Za-z0-9_-]+)\1/g, "$1./$2.js$1").replace(/(["'])@\/lib\//g, "$1./");
  if (after !== before) fs.writeFileSync(p, after);
}
