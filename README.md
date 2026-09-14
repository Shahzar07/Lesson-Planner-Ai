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

Two chains, because the best free model for English is not the best for Urdu. Qwen3 is
markedly stronger in Urdu script; DeepSeek V3 is faster and tighter on structured JSON
in English. Each chain fails over left to right when a model is rate-limited or cold.

```
English:  deepseek-chat-v3 → llama-3.3-70b → glm-4.5-air → mistral-small-3.2 → gemini-2.0-flash
Urdu:     qwen3-235b → deepseek-chat-v3 → gemini-2.0-flash → llama-3.3-70b
```

Free-model availability changes week to week, so trust `npm run doctor` over any list:
it probes your key against every candidate and prints a chain built from the ones that
actually answered.

```bash
SABAQ_MODELS_EN=deepseek/deepseek-chat-v3-0324:free,...   # in .env.local
SABAQ_MODELS_UR=qwen/qwen3-235b-a22b:free,...
```

## Typography

Two self-hosted variable fonts, wired through `next/font/local` in `app/layout.tsx`:

| Role | Face | Why |
|---|---|---|
| Display | **Bricolage Grotesque** 800 | Tight, heavy, optically sized. Holds its density at 72px where a neutral UI face goes limp. |
| Text / UI | **Plus Jakarta Sans** 400–800 | Legible at 11–16px, which Bricolage is not. |
| Urdu | **Noto Nastaliq Urdu** | Proper Nastaliq for the سبقی خاکہ, not a naskh fallback. |

Self-hosted rather than linked, which matters here: there is no render-blocking request
to a font CDN, no third-party DNS lookup on a slow Pakistani mobile connection, and no
flash of fallback text. `next/font/local` fingerprints the files, preloads them and
derives fallback metrics so nothing shifts when they swap in. The Urdu face carries
`preload: false`, so its 239 KB only downloads on a page that actually renders Urdu.

Three CSS classes carry the system: `.display` (hero and section headings),
`.display-sm` (card and panel headings) and `.wordmark` (the brand lockups). The
`--ff-*` variables injected by `next/font` are deliberately named apart from Tailwind's
`--font-*` theme tokens, which are defined in `@theme` and cannot reference themselves.

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
