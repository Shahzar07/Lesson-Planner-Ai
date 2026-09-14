/**
 * Integration test for the bug that broke the deployed app.
 *
 * A reasoning model (Nemotron, R1, QwQ) streams its thinking on delta.reasoning
 * before it writes a single delta.content token. The client used to watch only
 * delta.content, saw silence, and killed a perfectly healthy model with
 * "sent nothing within 14s" — while the doctor's non-streaming probe reported
 * the same model green in 300ms.
 *
 * This stands up a fake OpenRouter that behaves exactly that way.
 */
import http from "node:http";

const c = { g:"\x1b[32m", r:"\x1b[31m", b:"\x1b[1m", d:"\x1b[2m", x:"\x1b[0m" };
let pass = 0, fail = 0;
const ok = (n, cond, extra="") => {
  if (cond) { pass++; console.log(`  ${c.g}✓${c.x} ${n}`); }
  else { fail++; console.log(`  ${c.r}✗ ${n}${c.x} ${extra}`); }
};

const PLAN = {
  coreConcept: "Two fractions can name the same amount.",
  objectives: [{ text: "Students will be able to generate two equivalent fractions using a wall, 4 of 5.", verb: "generate", bloomLevel: "Apply", condition: "using a wall", degree: "4 of 5" }],
  procedure: [{ title: "Initiation Activity", minutes: 40, teacherDoes: "Draw a roti and cut it in two, then ask who got more.", studentsDo: "Answer on slates", questions: [{ q: "Same or different?", expected: "Same", bloomLevel: "Understand" }], checkpoint: "Most slates agree" }],
};

/** mode: how the fake model misbehaves */
function server(mode) {
  return http.createServer((req, res) => {
    if (req.url.endsWith("/models")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ data: [
        { id: "fake/thinker:free", context_length: 64000, pricing: { prompt: "0", completion: "0" },
          architecture: { output_modalities: ["text"] } },
      ]}));
    }
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      const parsed = JSON.parse(body || "{}");
      if (mode === "reject-json" && parsed.response_format) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "response_format is not supported", code: 400 } }));
      }
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      const send = o => res.write(`data: ${JSON.stringify(o)}\n\n`);

      // Think for ~8s: longer than the client's 6s first-token floor, which is
      // the whole point. A shorter think would pass with or without the fix.
      for (let i = 0; i < 80; i++) {
        send({ choices: [{ delta: { reasoning: "considering the fraction wall... " } }] });
        await new Promise(r => setTimeout(r, 100));
      }
      if (mode === "reasoning-only") { res.write("data: [DONE]\n\n"); return res.end(); }

      const json = JSON.stringify(PLAN);
      for (let i = 0; i < json.length; i += 120) {
        send({ choices: [{ delta: { content: json.slice(i, i + 120) } }] });
        await new Promise(r => setTimeout(r, 10));
      }
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
}

const listen = (s) => new Promise(r => s.listen(0, "127.0.0.1", () => r(s.address().port)));

async function run(mode, opts = {}) {
  const s = server(mode);
  const port = await listen(s);
  process.env.OPENROUTER_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.OPENROUTER_API_KEY = "sk-or-v1-test";
  process.env.SABAQ_MODELS_EN = "fake/thinker:free";
  const { streamChat } = await import(`../.test-build/openrouter.js?bust=${Math.random()}`);
  let text = "";
  let err = null;
  try {
    for await (const ev of streamChat({
      system: "s", user: "u", language: "en",
      ttftMs: opts.ttftMs ?? 6_000,      // the client floors this at 6s; the model thinks for ~8s
      timeoutMs: opts.timeoutMs ?? 20_000,
      maxModels: 1,
    })) {
      if (ev.type === "delta") text += ev.text;
    }
  } catch (e) { err = e; }
  s.close();
  return { text, err };
}

console.log(`\n${c.b}Reasoning-model streaming${c.x}`);

{
  const { text, err } = await run("normal");
  ok("survives a model that thinks for ~8s before writing, past the 6s first-token limit",
     !err && text.length > 0, err?.message ?? "");
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  ok("receives the complete answer after the thinking phase",
     parsed?.objectives?.length === 1 && parsed?.procedure?.[0]?.minutes === 40);
}

{
  const { text, err } = await run("reasoning-only");
  ok("reports a model that only ever thinks, instead of hanging", !text && !!err);
  ok("says plainly that it thought without answering",
     /thinking|thought/i.test(err?.message ?? ""), err?.message ?? "");
}

{
  // The other half of the fix: retry the same model plainly when forced JSON is refused.
  const { text, err } = await run("reject-json");
  ok("retries without forced JSON when a provider rejects it", !err && text.length > 0, err?.message ?? "");
}

console.log(`\n${c.b}${pass} passed, ${fail} failed${c.x}\n`);
process.exit(fail ? 1 : 0);
