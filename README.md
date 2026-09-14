<div align="center">

# Sabaq AI

**Lesson plans that pass inspection.**

Authentic B.Ed-standard lesson planning for Pakistani teachers.
Cambridge · Sindh Board · Oxford · FBISE · AKU-EB — in English and اردو.

</div>

---

## What this is

A teacher types a topic. Sabaq writes a complete lesson plan in their school's exact
format, then **checks its own work against eleven quality rules** and repairs whatever
failed before the teacher ever sees it.

The formats are not approximations. They are built field for field from the two sheets
Pakistani teacher-training programmes actually use:

- **B.Ed Standard (English)** — Specific Objectives, Skills/Attitude, Teaching Resources,
  Classroom Management Rules & Strategy, Teaching Methodology, Procedure (Initiation
  Activity → Development → Board Summary → Recapitulation → Evaluation), Homework, and
  the Supervisor Feedback block left blank for a signature.
- **سبقی خاکہ (Urdu)** — مقاصدِ تدریس، اصول و ضوابط، حکمتِ عمل، سمعی و بصری اعانات،
  طریقۂِ تدریس، ترسیلِ مواد، سبق کا بنیادی تصور، اہم اسباقی مدارج، خلاصۂِ تختۂِ سیاہ،
  جانچ، تفویض، and both feedback blocks.
- **Cambridge 5E** — Engage/Explore/Explain/Elaborate/Evaluate with learner-facing
  success criteria and anticipated misconceptions.

## Quick start

```bash
npm install
cp .env.example .env.local        # add your OpenRouter key
npm run doctor                    # check the key and find working free models
npm run dev                       # http://localhost:3000
```

Get a free key at **https://openrouter.ai/keys**. Nothing in this project costs money to
run: it routes between free models only.

No key yet? Open the planner and click **See a finished sample plan** to view a complete,
rubric-clean lesson plan without calling a model.

## The accuracy engine

This is the part that makes the output usable rather than merely plausible.

Most AI lesson planners write something that *looks* like a plan. Sabaq writes the plan
and then runs it through eleven checks that live **in code, not in a prompt** — so they
cannot be talked out of. Arithmetic decides whether the timings add up. A verb list
decides whether "understand" slipped into an objective. A regular expression catches a
page number the teacher never supplied.

| # | Check | Weight |
|---|---|---|
| 1 | Stage minutes total the lesson duration **exactly** | 15 |
| 2 | Every objective uses a measurable Bloom verb (no *understand / know / appreciate*) | 15 |
| 3 | Every objective carries a condition and a degree (ABCD) | 10 |
| 4 | Bloom levels are spread: ≥2 levels, ≥1 at Apply+, ≤2 at Remember | 10 |
| 5 | A recognised teaching method is named | 5 |
| 6 | The procedure is script-level, with what the teacher says and does | 10 |
| 7 | Every scripted question lists the expected answer | 5 |
| 8 | Support **and** extension are both concrete | 10 |
| 9 | At least two in-lesson AfL checkpoints naming a real technique | 5 |
| 10 | **No invented page, chapter, exercise or objective code** | 10 |
| 11 | Written for a Pakistani classroom: rupees, local names, no-tech fallbacks | 5 |

Anything that fails is sent back to the model with **only the failures attached**, and
the repaired plan has to score *higher* than the first one to replace it. The score and
every check are shown to the teacher — nothing is hidden.

```bash
npm test     # 26 cases, no network required
```

### Why "no invented citations" matters most

A fabricated Cambridge objective code, or a page number for a book edition that shifted
last year, is worse than a missing one — a supervisor will check it. So if the teacher
leaves the page field blank, the validator **rejects any plan containing a page,
chapter or code**, and the model is told to write "the unit named in the brief" instead.

## Conversational editing

Once a plan exists, a composer sits pinned at the bottom of the page. Type what should
change, in English or Urdu, and only that part changes:

> *make the starter a pair activity* · *objectives thodi aasaan kardo* ·
> *add one more extension task* · *shorten the development by 5 minutes*

The model does **not** return a rewritten plan. It returns a list of edits addressed by
JSON Pointer:

```json
{ "summary": "Made the starter a pair activity.",
  "edits": [ { "op": "replace", "path": "/procedure/0/teacherDoes", "value": "..." } ] }
```

That choice is what makes it usable. A whole-plan rewrite drifts in the 95% of fields
you did not mention; a pointer edit cannot. It also means every change can be shown as
a before/after diff, highlighted in the sheet, scored again, and undone.

**The paths come from a language model, so they are treated as untrusted input.**
`lib/patch.ts` rejects rather than creates: a path that does not already exist on the
plan is dropped, not added, so a hallucinated field cannot appear in your lesson plan.
`__proto__`, `constructor` and `prototype` segments are refused outright. Bad edits in a
batch are dropped individually while the good ones still apply, and the result is
re-parsed against the same zod schema the generator answers to — if an edit would break
the plan's structure, nothing is applied at all.

After every edit the eleven checks run again and the transcript shows the movement, so
`Accuracy 100 → 96` tells you immediately that your instruction cost something. The
`meta` section is locked: class, date and duration are edited in the form, not by chat,
because those are facts about your timetable rather than judgements about the lesson.

The **Precise** toggle controls how far the model may reach: on, it makes the smallest
change that satisfies the request; off, it may restructure. The scope selector limits an
edit to one section.

## The Skill

`lib/skill/` is the system's brain, and it is plain Markdown so a teacher-educator can
edit it without touching code.

```
lib/skill/
├── SKILL.md                    the authoring contract: non-negotiables, stage
│                               anatomy, style rules, a ten-point self-check
└── knowledge/
    ├── cambridge.md            CAIE stages, strands, TWM/TWS, command words,
    │                           the six Approaches to Teaching and Learning
    ├── sindh-board.md          STBB, BSEK/BISE, AKU-EB, SLOs, board exam stems,
    │                           and what a 50-student government classroom is like
    ├── oxford-pakistan.md      NOME, New Countdown, Oxford Progressive English,
    │                           and how OUP unit structure shapes one period
    ├── bed-pedagogy.md         methods, Herbartian steps, 5E, gradual release,
    │                           management techniques, AfL, differentiation
    ├── blooms.md               verb tables per level, banned verbs, question stems
    ├── urdu-format.md          سبقی خاکہ fields, Urdu objective grammar, register
    └── quality-rubric.md       the eleven checks, and how each one is failed
```

Packs are loaded **selectively per request** — a Cambridge maths plan never pays the
token cost of the Urdu grammar pack. That selectivity is the main optimisation: a
focused context beats a kitchen-sink one on a free model, and it keeps generation fast.

The same rules are mirrored as a Claude Code skill in
`.claude/skills/lesson-plan-architect/`.

## Model routing

**Nothing here hardcodes a model id as gospel.** OpenRouter's free tier churns
constantly: ids get renamed and withdrawn, and a withdrawn model answers
`404 No endpoints found`, which looks exactly like a broken key to the teacher staring
at the screen.

So the app asks OpenRouter what is actually free right now, then ranks whatever comes
back by **family** rather than exact id:

```
English:  glm → deepseek-chat → qwen3 → nemotron → llama-3.3 → mistral → gpt-oss
Urdu:     qwen3 → glm → deepseek-chat → gemini → nemotron → llama-3.3
```

Because the match is a substring, a version bump from `qwen3-235b` to `qwen4-400b` needs
no code change at all. Qwen and GLM lead the Urdu chain because they handle Urdu script
noticeably better than the Llama family.

The catalogue is filtered on the way in: paid models, safety classifiers, embedding and
rerank models, image-only models, and anything with a context window too small to hold
the skill plus a full plan are all dropped. Free is detected by **price**, not by the
`:free` suffix alone.

Each request then walks that chain, and a model that 404s, rate-limits or times out
hands off to the next one. A model that rejects `response_format: json_object` is
retried once without it, since the tolerant parser copes either way.

If you want to pin exact ids anyway, an environment override always wins:

```bash
SABAQ_MODELS_EN=z-ai/glm-4.6:free,qwen/qwen3-max:free
SABAQ_MODELS_UR=qwen/qwen3-max:free,z-ai/glm-4.6:free
```

### Speed

A free model writes roughly 25-60 tokens a second, so the only lever that
matters is how much it is asked to write. Two numbers decided the design:

| | before | now |
|---|---|---|
| System prompt | ~5,300 tokens | **~1,600** |
| Output required for one plan | ~3,885 tokens | **~1,800** |
| Repair pass | on by default (doubled the wait) | opt-in |
| Typical wall clock | 90-180s, usually killed by the host | **~30-45s** |

Four changes got there:

- **Compact context by default.** The knowledge packs are the source of truth for
  humans, but the request only carries the rules that change the output: the
  non-negotiables, the verb tables, and four to six lines about the curriculum in hand.
  Set `SABAQ_FULL_CONTEXT=1` to send everything when latency does not matter.
- **A format-aware schema.** A B.Ed plan is no longer asked for the fields only the
  Cambridge 5E view renders. Every omitted key has a zod default, so a shorter answer
  is still a valid one.
- **Two clocks per model.** A cold or queued free model sends *nothing*, and waiting 90
  seconds for it used to burn the entire budget. The first-token clock is short and
  aggressive (14s); once tokens are flowing the model has proved it is alive and earns
  the longer one. The whole request is bounded by a single deadline, sliced across at
  most four models.
- **The repair pass is opt-in**, because it is a second full generation.

### When the stream is cut

Serverless functions have a wall clock — **Vercel Hobby kills a function at 60 seconds**,
mid-stream, without ceremony. `maxDuration` is set to 60 and the internal budget to 52s
so the request finishes first, but a slow provider can still be truncated.

Rather than throw that away, `lib/salvage.ts` keeps it. The tolerant parser closes the
JSON wherever it stopped — retreating past a cut mid-escape or mid-number to the last
clean boundary — and salvage prunes the individual half-written entries until the plan
validates. A plan missing its last evaluation item is still a plan; an error message is
not. The test suite sweeps **every cut point from 40% to 99% and recovers a usable plan
from 100% of them.**

The teacher also sees this happening: the planner parses the partial JSON as it arrives
and fills the objectives, stages and timings in live, so the wait reads as progress
rather than a frozen screen.

### Reasoning models

Nemotron, DeepSeek R1, QwQ and their kin **think before they write**, and they stream
that thinking on a different field: `delta.reasoning`, not `delta.content`. A client that
watches only `content` sees total silence for however long the model reasons, concludes
it is dead, and kills it.

That is a real failure this app shipped with, and it produced a genuinely confusing pair
of symptoms: the doctor reported the model healthy in 300ms while generation failed on
the same model with *"sent nothing within 14s"*. The doctor was probing non-streaming
with `max_tokens: 40`, so it never reached the reasoning phase at all.

Both halves are fixed:

- The stream reader counts `delta.reasoning` and `delta.reasoning_content` as proof of
  life, so the first-token clock stops when the model starts thinking, while only
  `content` is collected as the answer.
- The doctor now probes exactly the way generation runs — streaming, forced JSON, a real
  writing task — and reports **time to first word of answer**, not time to HTTP response.
  A model that only ever thinks is reported as such instead of being called healthy.

Reasoning models are also ranked last rather than dropped. They burn most of a free-tier
budget before writing a word, but a slow plan beats no plan, so they stay as a fallback.

`scripts/reasoning.test.mjs` stands up a fake OpenRouter that thinks for eight seconds
before writing, which is longer than the client's first-token floor. Revert the fix and
that suite fails with the production error verbatim.

### When it breaks

Two diagnoses, because they answer different questions:

| | What it tests |
|---|---|
| `npm run doctor` | the machine you run it on |
| `https://your-app/api/doctor` | **the deployed server** — its key, its network, the account's privacy setting |

A key in `.env.local` never reaches production, so for a deployed app always use the
endpoint (or click **Run diagnosis on the server** in the planner's error panel). Both
read the live catalogue, probe the top models with a real completion, and print a
ready-to-paste `SABAQ_MODELS_*` chain built from whatever actually answered.

The error panel names the cause rather than saying "failed", and the three that account
for nearly everything are:

- **`404 No endpoints found` on every model** — usually not the models. Free models
  require prompt logging to be permitted: open
  <https://openrouter.ai/settings/privacy> and enable the free-model training and
  publication option.
- **`401`** — the key is wrong or was rotated. Update `OPENROUTER_API_KEY` in your
  host's environment variables and **redeploy**; editing `.env.local` changes nothing in
  production.
- **`429` on everything** — free models are shared and go busy. Wait a minute, or pin a
  chain with `SABAQ_MODELS_EN`.

## Project layout

```
app/
  page.tsx                landing page
  plan/page.tsx           the planner
  api/generate/route.ts   streaming generation + validation + repair pass
  api/refine/route.ts     rewrite one section without disturbing the rest
  api/doctor/route.ts     key and chain health
lib/
  skill/                  the Skill (above)
  types.ts                one canonical LessonPlan schema (zod)
  formats.ts              the three formats as views over that schema
  curricula.ts            stages, subjects, textbook series per system
  validator.ts            the eleven checks + deterministic timing rebalance
  partial-json.ts         tolerant parsing so a truncated stream still renders
  openrouter.ts           streaming client with per-model timeout and failover
  export/docx.ts          Word export, lazily imported
components/planner/       the app UI
scripts/
  doctor.mjs              key + model probe
  engine.test.mjs         the accuracy suite
```

## Commands

| | |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build |
| `npm test` | accuracy engine suite, no network needed |
| `npm run doctor` | probe your OpenRouter key, print a working model chain |
| `npm run typecheck` | TypeScript, no emit |

## Notes

- **Keep your API key out of git.** It belongs in `.env.local`, which is gitignored. If a
  key has ever been pasted into a chat, an issue or a screenshot, rotate it at
  https://openrouter.ai/keys.
- Output is a first draft for a professional, not a replacement for one. The supervisor
  feedback block is deliberately left blank: a human signs the plan.
