#!/usr/bin/env node
/**
 * Sabaq AI — connection doctor.
 *
 * Reads the LIVE OpenRouter catalogue, then actually calls the best free
 * models with your key. Free-tier ids change constantly, so this is the only
 * trustworthy list — never a hardcoded one, including the one in lib/models.ts.
 *
 *   npm run doctor
 *
 * NOTE: this tests the machine you run it on. For a DEPLOYED app, open
 * https://your-app/api/doctor instead, or click "Run diagnosis on the server"
 * in the planner's error panel. A key in .env.local never reaches production.
 */
import fs from "node:fs";
import path from "node:path";

for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const KEY = process.env.OPENROUTER_API_KEY;
const c = { g:"\x1b[32m", r:"\x1b[31m", y:"\x1b[33m", d:"\x1b[2m", b:"\x1b[1m", x:"\x1b[0m" };
const die = (msg, fix) => { console.error(`\n${c.r}${msg}${c.x}\n${fix ? "  " + fix + "\n" : ""}`); process.exit(1); };

if (!KEY) die("OPENROUTER_API_KEY is not set.", "cp .env.example .env.local and add your key from https://openrouter.ai/keys");
console.log(`${c.b}Sabaq AI — connection doctor${c.x}\n${c.d}key ${KEY.slice(0,12)}…${KEY.slice(-4)}${c.x}\n`);

/* --- 1. the live catalogue is the source of truth --- */
let free = [];
try {
  const res = await fetch("https://openrouter.ai/api/v1/models");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()).data ?? [];
  const zero = v => v === "0" || Number(v) === 0;
  free = data.filter(m =>
    (m.id?.endsWith(":free") || (zero(m.pricing?.prompt) && zero(m.pricing?.completion))) &&
    !/guard|embed|rerank|whisper|tts|moderation|ocr/i.test(m.id) &&
    (m.context_length ?? 0) >= 16000);
  console.log(`${c.g}✓${c.x} reached openrouter.ai — ${c.b}${free.length}${c.x} usable free models right now\n`);
} catch (e) {
  die(`Could not read the model catalogue: ${e.message}`, "Check your network, proxy, or firewall rules for openrouter.ai.");
}

/* --- 2. rank by family, same order the app uses --- */
const PREFER = ["deepseek-chat","deepseek-v3","glm-4","glm","qwen3","qwen","llama-3.3","nemotron","mistral-small","gpt-oss","kimi","deepseek-r1","gemma","mistral"];
const score = id => { const i = PREFER.findIndex(f => id.toLowerCase().includes(f)); return i === -1 ? PREFER.length : i; };
const ranked = [...free].sort((a,b) => score(a.id) - score(b.id) || (b.context_length??0) - (a.context_length??0));
const candidates = ranked.slice(0, 8).map(m => m.id);

console.log(`${c.d}Probing the top ${candidates.length} by family preference…${c.x}\n`);

/* --- 3. a listed model is not a working model --- */
const ok = [];
let policyBlocked = false;
for (const model of candidates) {
  const t0 = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`, "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL ?? "http://localhost:3000", "X-Title": "Sabaq AI doctor",
      },
      body: JSON.stringify({ model, max_tokens: 40, temperature: 0,
        messages: [{ role: "user", content: 'Reply with only this JSON: {"ok":true}' }] }),
      signal: AbortSignal.timeout(45_000),
    });
    const ms = Date.now() - t0;
    const raw = await res.text();
    if (!res.ok) {
      const low = raw.toLowerCase();
      if (res.status === 401) die("Your API key was rejected.", "Generate a new one at https://openrouter.ai/keys");
      if (low.includes("data policy")) policyBlocked = true;
      const why = res.status === 402 ? "out of credits"
        : low.includes("data policy") ? "blocked by privacy settings"
        : res.status === 404 ? "no longer exists"
        : res.status === 429 ? "rate limited" : `HTTP ${res.status}`;
      console.log(`${c.r}✗${c.x}  ${model.padEnd(48)} ${why}`);
      continue;
    }
    const content = JSON.parse(raw)?.choices?.[0]?.message?.content ?? "";
    console.log(`${c.g}✓${c.x}  ${model.padEnd(48)} ${String(ms).padStart(6)} ms  ${c.d}${content.trim().slice(0,24).replace(/\s+/g," ")}${c.x}`);
    ok.push({ model, ms });
  } catch (e) {
    console.log(`${c.r}✗${c.x}  ${model.padEnd(48)} ${e.name === "TimeoutError" ? "timed out" : e.message.slice(0,36)}`);
  }
}

/* --- 4. verdict --- */
if (policyBlocked && !ok.length) {
  die("Free models are blocked by your OpenRouter privacy settings.",
      "Open https://openrouter.ai/settings/privacy and enable the free-model training/publication option, then run this again.");
}
if (!ok.length) {
  die("No model answered.", "Free models are shared and go busy. Wait a minute and retry.");
}

ok.sort((a,b) => a.ms - b.ms);
const ids = ok.map(o => o.model);
const preferFamily = want => [...ids].sort((a,b) => (b.includes(want)?1:0) - (a.includes(want)?1:0));

console.log(`\n${c.g}${c.b}${ok.length} model(s) working.${c.x} Fastest: ${c.b}${ok[0].model}${c.x} (${ok[0].ms} ms)`);
console.log(`\n${c.d}The app discovers these automatically, so you do not need to set anything.`);
console.log(`To pin them anyway (skips probing dead ids), add to .env.local:${c.x}\n`);
console.log(`SABAQ_MODELS_EN=${preferFamily("deepseek").slice(0,4).join(",")}`);
console.log(`SABAQ_MODELS_UR=${preferFamily("qwen").slice(0,4).join(",")}\n`);
console.log(`${c.d}Deployed app? This tested your laptop. Open https://your-app/api/doctor for the server.${c.x}\n`);
