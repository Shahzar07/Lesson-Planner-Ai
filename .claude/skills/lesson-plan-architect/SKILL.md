---
name: lesson-plan-architect
description: Write or review a Pakistani school lesson plan to B.Ed / ADE teaching-practice standard, for Cambridge, the Sindh Board, Oxford (OUP Pakistan), FBISE or AKU-EB, in English or Urdu (سبقی خاکہ). Use when asked to write, draft, fix, grade or review a lesson plan, سبقی خاکہ, scheme of work, learning objectives, SLOs, a starter or plenary, differentiation, or assessment for a school lesson. Also use when checking whether objectives are measurable, whether stage timings add up, or whether a plan would pass a teaching-practice supervisor.
---

# Lesson Plan Architect

The authoring contract and the knowledge packs live in `lib/skill/` in this
repository. Read them before writing or reviewing anything:

| File | What it gives you |
|---|---|
| `lib/skill/SKILL.md` | The non-negotiables, stage anatomy, style rules, self-check |
| `lib/skill/knowledge/cambridge.md` | CAIE stages, strands, command words, the six pillars |
| `lib/skill/knowledge/sindh-board.md` | STBB, BSEK/BISE, SLOs, exam stems, real classroom conditions |
| `lib/skill/knowledge/oxford-pakistan.md` | OUP Pakistan series and how their units shape a lesson |
| `lib/skill/knowledge/bed-pedagogy.md` | Methods, Herbart, 5E, management, AfL, differentiation |
| `lib/skill/knowledge/blooms.md` | Verb tables, banned verbs, question stems |
| `lib/skill/knowledge/urdu-format.md` | سبقی خاکہ field names, Urdu objective grammar |
| `lib/skill/knowledge/quality-rubric.md` | The eleven checks and how each one is failed |

Load only the packs the task needs. A Cambridge maths plan does not need the Urdu pack.

## Writing a plan

1. Read `SKILL.md` plus the packs for the named curriculum.
2. Ask for anything missing that materially changes the plan: class/stage, subject,
   topic, duration, and which format. Everything else has a sane default.
3. Write to the format the teacher named. The three supported shapes are defined in
   `lib/formats.ts` with their required stage titles.
4. Before presenting it, run the self-check at the end of `SKILL.md`.

## Reviewing or grading a plan

Score it against `quality-rubric.md`. The same eleven checks are implemented
deterministically in `lib/validator.ts`, so read that file for the exact pass
conditions rather than guessing them. Report the score, then the failures in
weight order, each with the concrete fix.

## The rules that matter most

- **Never invent a page number, chapter number, exercise number or Cambridge
  objective code.** If the teacher did not supply it, refer to "the unit named in the
  brief". A supervisor will check a code, and a wrong one is worse than none.
- **Stage minutes must sum to the lesson duration exactly.** Count them.
- **No objective may use** understand, know, learn, appreciate, be aware of, be
  familiar with. Use the Bloom tables.
- **Every objective needs a condition and a degree**, not just a verb.
- **The procedure is a script**, with the exact questions and the answers to listen for.
- **Differentiation is concrete.** "Help weak students" is not a strategy.
- **Assume 40+ students, fixed benches, a blackboard and possible load-shedding.**
  Prices in rupees, names and contexts local.

## Conversational editing

`app/api/edit/route.ts` turns a teacher's chat message into JSON Pointer edits against
an existing plan, rather than regenerating it. `lib/patch.ts` applies them and is
deliberately hostile to its input: a path that does not already exist is rejected, not
created, and prototype-chain segments are refused. If you change the plan schema, the
addressable index in `buildIndex` follows automatically, but check that
`scripts/engine.test.mjs` still covers the new shape.

Never loosen `applyEdits` to create missing paths. The whole point is that a
hallucinated field cannot reach a teacher's lesson plan.

## Working on the app itself

- `npm test` runs the accuracy engine suite (no network needed) — 50 checks covering
  every rubric rule, the tolerant JSON parser and the patch layer. Add a case here
  whenever you add or change a rubric check.
- `lib/sample-plan.ts` is a complete plan that must score 100. If a rubric change makes
  it score lower, fix the sample, not the check.
- `npm run doctor` probes the configured OpenRouter key and prints a model chain built
  from whatever actually answered.
- Changing a rubric check means changing three places in step: `lib/validator.ts`,
  `lib/skill/knowledge/quality-rubric.md`, and `scripts/engine.test.mjs`.
