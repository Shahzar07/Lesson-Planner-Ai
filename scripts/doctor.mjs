#!/usr/bin/env node
/**
 * Sabaq AI — connection doctor.
 *
 * Probes your OpenRouter key against every model in the catalogue and prints
 * a ready-to-paste .env.local chain built from the ones that actually answered.
 * Free-model availability changes week to week, so trust this over any list.
 *
 *   npm run doctor
 */
import fs from "node:fs";
import path from "node:path";

/* --- load .env.local without a dependency --- */
for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const KEY = process.env.OPENROUTER_API_KEY;
const c = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", d: "\x1b[2m", b: "\x1b[1m", x: "\x1b[0m" };

if (!KEY) {
  console.error(`${c.r}✗ OPENROUTER_API_KEY is not set.${c.x}\n  cp .env.example .env.local  and add your key from https://openrouter.ai/keys`);
  process.exit(1);
}
console.log(`${c.b}Sabaq AI — connection doctor${c.x}\n${c.d}key ${KEY.slice(0, 12)}…${KEY.slice(-4)}${c.x}\n`);

const CANDIDATES = [
  "deepseek/deepseek-chat-v3-0324:free",
  "qwen/qwen3-235b-a22b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "z-ai/glm-4.5-air:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "moonshotai/kimi-k2:free",
  "deepseek/deepseek-r1-0528:free",
  "openai/gpt-oss-20b:free",
];

/* --- 1. can we see the catalogue at all? --- */
let live = null;
try {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (res.ok) {
    const data = (await res.json()).data ?? [];
    live = new Set(data.filter((m) => m.id.endsWith(":free")).map((m) => m.id));
    console.log(`${c.g}✓${c.x} reached openrouter.ai — ${live.size} free models listed right now\n`);
  }
} catch {
  console.log(`${c.y}!${c.x} could not list models (network or proxy). Probing directly.\n`);
}

/* --- 2. probe each candidate with a real completion --- */
const ok = [];
for (const model of CANDIDATES) {
  if (live && !live.has(model)) {
    console.log(`${c.d}—  ${model.padEnd(50)} not in the current free list${c.x}`);
    continue;
  }
  const t0 = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000",
        "X-Title": "Sabaq AI doctor",
      },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: 'Reply with only this JSON: {"ok":true}' }],
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const ms = Date.now() - t0;
    const raw = await res.text();
    if (!res.ok) {
      const reason = res.status === 401 ? "bad key" : res.status === 429 ? "rate limited" : `HTTP ${res.status}`;
      console.log(`${c.r}✗${c.x}  ${model.padEnd(50)} ${reason}`);
      if (res.status === 401) { console.error(`\n${c.r}Your key was rejected. Generate a new one at https://openrouter.ai/keys${c.x}`); process.exit(1); }
      continue;
    }
    const content = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "";
    const valid = content.includes("ok");
    console.log(`${valid ? c.g + "✓" : c.y + "~"}${c.x}  ${model.padEnd(50)} ${String(ms).padStart(6)} ms  ${c.d}${content.trim().slice(0, 30).replace(/\s+/g, " ")}${c.x}`);
    if (valid) ok.push({ model, ms });
  } catch (e) {
    console.log(`${c.r}✗${c.x}  ${model.padEnd(50)} ${e.name === "TimeoutError" ? "timed out" : e.message.slice(0, 40)}`);
  }
}

/* --- 3. recommend a chain --- */
if (!ok.length) {
  console.error(`\n${c.r}No model answered.${c.x} Check your network, or that your OpenRouter account has free-tier access enabled.`);
  process.exit(1);
}
ok.sort((a, b) => a.ms - b.ms);
const ids = ok.map((o) => o.model);
const prefer = (want) => [...ids].sort((a, b) => (b.includes(want) ? 1 : 0) - (a.includes(want) ? 1 : 0));

console.log(`\n${c.g}${c.b}${ok.length} model(s) working.${c.x} Fastest: ${c.b}${ok[0].model}${c.x} (${ok[0].ms} ms)\n`);
console.log(`${c.d}Paste into .env.local to pin the chain to what your key can actually reach:${c.x}\n`);
console.log(`SABAQ_MODELS_EN=${prefer("deepseek").slice(0, 4).join(",")}`);
console.log(`SABAQ_MODELS_UR=${prefer("qwen").slice(0, 4).join(",")}\n`);
