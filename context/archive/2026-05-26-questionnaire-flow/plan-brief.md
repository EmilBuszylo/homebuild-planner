# Questionnaire Flow — Plan Brief

> Full plan: `context/changes/questionnaire-flow/plan.md`

## What & Why

Build a multi-step questionnaire form that lets a logged-in user answer 11 construction-planning questions (grouped into 3 themed steps + summary) and submit them to create a Plan. This is S-01 from the roadmap — the user-facing entry point into the app's core value loop. Without a completed questionnaire, S-02 (cost estimate generation) and S-03 (north star) have no input data.

## Starting Point

F-02 delivered the full data model: 11 seeded `QuestionDefinition` rows, Prisma models for Plan → PlanVersion → QuestionnaireResponse, and Zod validation schemas for all inputs. Auth (F-01) and User model (F-01b) are in place. The auth form pattern (RHF + createZodResolver + shadcn Field) is established. No questionnaire UI, plan page, or domain API endpoint exists yet.

## Desired End State

A logged-in user navigates to `/ankieta`, walks through a 3-step questionnaire with a progress bar, reviews answers on a summary step, and submits. One API call atomically creates the Plan + PlanVersion + all responses. The user is redirected to `/moj-plan/[planId]` (stub page for S-02). Revisiting `/ankieta` redirects to the existing plan.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
|---|---|---|
| Step layout | Grouped by theme (3 steps + summary) | Fewer clicks, logical grouping reduces cognitive load — PRD says keep it minimal. |
| Persistence | On final submit only | Simplest API, no partial plans in DB; 11 inputs take ~2 min. |
| Navigation | Linear with back + progress bar | Standard wizard UX, matches PRD "step by step" language. |
| Post-submit | Redirect to /plan/[planId] | Sets up URL structure S-02 needs; user gets a permanent link. |
| API design | Single POST /api/plans | Atomic — everything saves or nothing does. |
| Question source | Fetch from DB via RSC | Single source of truth; seed changes reflected automatically. |
| Optional handling | Show with defaults + "(opcjonalne)" | No extra UI mechanism; defaults produce valid data for S-02. |
| Existing plan | One plan per user; redirect if exists | Prevents duplicates; edit flow is S-05 scope. |

## Scope

**In scope:** Questionnaire page route + Polish rewrite, multi-step form with 4 question types, progress bar, summary step, POST /api/plans endpoint, plan results stub page, existing-plan redirect.

**Out of scope:** Edit/recalculate (S-05), cost estimate generation (S-02), internet refinement (S-04), schema migrations, tests, localStorage drafts.

## Architecture / Approach

RSC (`questionnaire/page.tsx`) fetches questions from Prisma + checks for existing plan → passes props to client `QuestionnaireForm` component → RHF manages multi-step state with per-step validation → on submit, `fetch("POST /api/plans")` → Route Handler creates Plan + PlanVersion + Responses in a Prisma transaction → returns planId → client redirects to `/plan/[planId]`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Routing & scaffolding | Page routes, Polish rewrites, middleware, shadcn components, stub pages | Low — mechanical setup. |
| 2. Questionnaire form UI | Multi-step form, question renderers, navigation, progress, summary | Medium — most code; question type renderers must handle all 4 types cleanly. |
| 3. API & persistence | POST /api/plans, Prisma transaction, submit wiring, existing-plan redirect | Low — single endpoint, well-defined contract. |

**Prerequisites:** F-01 (done), F-01b (done), F-02 (impl_reviewed), seed data present in DB.
**Estimated effort:** ~2-3 sessions across 3 phases.

## Open Risks & Assumptions

- Assumes seed data (11 questions) is present in the DB. If not, questionnaire page renders empty.
- PRD Open Question #4 (which date is obligatory) — we use `key_date` as a single required date field (planned start date). Can add a second optional date later.
- Step grouping (3+summary) may feel light on step 3 (4 fields) — acceptable; can rebalance later.

## Success Criteria (Summary)

- User completes the questionnaire end-to-end and sees their plan created.
- Revisiting the questionnaire redirects to the existing plan (no duplicates).
- `pnpm build` passes with all new files; no schema changes needed.
