# Generation & recalc integrity tests — Plan Brief

> Full plan: `context/changes/testing-generation-recalc-integrity/plan.md`  
> Research: `context/changes/testing-generation-recalc-integrity/research.md`  
> Test plan: `context/foundation/test-plan.md` (Phase 2)

## What & Why

Rollout **Phase 2** adds tests for the core product path: questionnaire → generated costs/timeline → recalc. Today `POST /api/plans` can return **201** while persisting **zero** stage results; benchmark math and recalc deltas are only covered partially. Risks **#3, #4, #5, #7** need oracle-backed tests without Playwright.

## Starting Point

- Phase 1 shipped: mocked handler tests in `plans-route-handlers.test.ts`, `validQuestionnairePayload` fixture.
- Generation pipeline: `persistPlanVersionWithResults` → `generatePlanResults` → `applyMarketBenchmarks`.
- Existing unit tests: `apply-market-benchmarks.test.ts`, `getPlanRecalcPolicy` env only (not `checkPlanRecalcLimit`).

## Desired End State

- Unit tests prove **directional** cost changes (area, standard) from independent fixtures — not copied formulas.
- Mocked persistence/handler tests prove **non-empty** `planStageResult` on valid create and document empty-generation regression.
- Recalc test proves output **changes** when inputs change (Risk #5).
- Handler test proves **429** when rate limit denies (Risk #7).
- `test-plan.md` §6.1 / §6.5 updated with generation cookbook patterns.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Test harness | Extend `plans-route-handlers.test.ts` + new `src/lib/plan-generation/*.test.ts` | Reuse Phase 1 mocks; keep pure logic colocated | Research + archive Phase 1 |
| DB in CI | Mocks only (no Docker Postgres in CI) | Matches Phase 1; `pnpm test` stays DB-free | Research open Q1 |
| Empty POST behavior | Test **current** contract (201 + GET 404) as regression oracle | Product fix out of scope unless test forces it | Research |
| Oracle for #3 | Directional: larger area → higher total; PREMIUM > ECONOMY on same fixture | Independent of implementation constants | Test-plan #3 |
| E2E | None | AGENTS + test-plan §7 | Test-plan |

## Scope

**In scope:** Risks #3–#5, #7; unit + mocked integration; §6.1/§6.5 cookbook.

**Out of scope:** Playwright; live DB/seed in CI; product change to reject empty `createMany`; Risk #1 (archived Phase 1); full `checkPlanRecalcLimit` Prisma integration without mocks.

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Generation oracles | Unit tests on `generatePlanResults` / costs | #3 |
| 2. Persist + empty edge | Mocked `persistPlanVersionWithResults` | #4 |
| 3. POST create contract | Handler golden path + empty regression | #4 |
| 4. Recalc delta | Recalculate changes stored results | #5 |
| 5. Rate limit + cookbook | 429 handler + §6.1/§6.5 | #7 |

**Prerequisites:** Phase 1 archived; `pnpm test` green.  
**Estimated effort:** ~3 sessions, 5 phases.

## Open Risks & Assumptions

- Minimal stage fixture must mirror seed slugs/order enough for `filterStages` to include ≥1 stage with valid payload.
- Mocked transaction may drift from real `persistPlanVersionWithResults` — mitigate by testing pure `generatePlanResults` separately.

## Success Criteria (Summary)

- `pnpm test` / CI pass with new tests.
- Valid create path asserts `stageResults` count ≥ 1 at persistence boundary.
- Recalc with changed `area` produces different summed costs in mocked `createMany` payload.
