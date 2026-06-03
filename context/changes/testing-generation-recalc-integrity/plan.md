# Generation & Recalc Integrity Tests — Implementation Plan

## Overview

Implement **test-plan Phase 2** (`context/foundation/test-plan.md` §3 row 2): automated coverage for Risks **#3** (benchmark/cost sanity), **#4** (generate path non-empty or explicit failure), **#5** (recalc reflects new answers), and **#7** (rate limit enforcement at API). Builds on Phase 1 (`context/archive/2026-06-02-testing-access-control-ownership/`) handler mocks and `validQuestionnairePayload`.

## Current State Analysis

- `POST /api/plans` → `persistPlanVersionWithResults` → `generatePlanResults` → `planStageResult.createMany` with **no** `results.length` guard before **201** (`research.md`).
- `apply-market-benchmarks.test.ts` covers refinement multipliers; **no** tests on `generatePlanResults`, `computeStageCost`, `filterStages`, or `persistPlanVersionWithResults`.
- `plan-recalc.test.ts` covers `getPlanRecalcPolicy` env only — **`checkPlanRecalcLimit`** untested at API boundary.
- Phase 1 left `plans-route-handlers.test.ts` with auth/ownership/validation; generation cases belong in same file or `plan-generation/` unit tests.

### Key Discoveries

- Cheapest signal: unit oracles in `src/lib/plan-generation/` + extend handler mocks with transaction stubs that record `createMany` data (`research.md`).
- Happy-path GET must use non-empty `stageResults` mocks (avoid conflating with empty-results 404).
- Rate limit: mock `checkPlanRecalcLimit` or `tx.planVersion.count` in recalculate handler test.

## Desired End State

1. **Risk #3:** Unit test(s) prove increasing `area` or higher `build_standard` increases total estimated cost on a **fixed minimal stage fixture** (directional oracle).
2. **Risk #4:** Mocked persistence or handler test proves valid `POST /api/plans` path calls `createMany` with **≥1** row; separate test documents empty `filterStages` → `createMany` with 0 rows (regression oracle for current behavior).
3. **Risk #5:** Recalculate with two payloads differing in `area` yields **different** `estimatedCost` sums in captured `createMany` data.
4. **Risk #7:** `POST .../recalculate` returns **429** with PL error when `checkPlanRecalcLimit` returns `allowed: false`.
5. **`test-plan.md` §6.1 and §6.5** filled with generation/recalc patterns.
6. `pnpm test`, `pnpm lint`, CI green.

### Verification

```bash
pnpm test
pnpm lint
pnpm build:ci
```

## What We're NOT Doing

- Playwright or full questionnaire E2E.
- Live Postgres / seed-dependent CI tests (mocks only).
- Product fix to reject POST when `localResults.length === 0` (note in test comments + §6.6 optional).
- Re-testing ownership/IDOR (Phase 1 archived).
- Extending `checkPlanRecalcLimit` with real Prisma transaction history in CI.

## Implementation Approach

**Cost × signal:** pure generation unit tests first (no HTTP), then mocked `persistPlanVersionWithResults`, then extend `plans-route-handlers.test.ts` for POST create/recalc/rate-limit.

**Fixtures:** add `src/lib/plan-generation/test-fixtures/minimal-stages.ts` — one or two `StageWithModifiers` rows with known `costPerM2*` and slugs compatible with `validQuestionnairePayload` (`FROM_SCRATCH` → `DEVELOPER`). Derive expected **direction** from fixture constants (e.g. `120 m² × rate`), not from calling `computeStageCost` as oracle.

**Handler tests:** reuse Phase 1 mock pattern; add `vi.mock("@/lib/plan/persist-plan-version")` or deep mock `$transaction` callback that invokes logic with fake `tx` object.

## Critical Implementation Details

**Oracle discipline (#3):** Assert `totalB > totalA` when `areaB > areaA` with same standard; assert `PREMIUM > ECONOMY` with same area. Do not snapshot full numeric output from production unless computed from fixture constants in the test file.

**Risk #4 empty edge:** Use inputs that yield `filterStages([])` (e.g. mock `constructionStage.findMany` returning stages all filtered out, or unit test `filterStages` with incompatible states if API-valid pair always includes stages — prefer **mock empty `localResults`** at persist boundary to assert `createMany({ data: [] })`).

**Risk #5:** Capture `createMany` argument on two `invokeRecalculate` calls with different `area` in payload; compare sum of `estimatedCost`.

**Risk #7:** `vi.mock("@/lib/rate-limit/plan-recalc")` returning `{ allowed: false, retryAfterSeconds: 3600, limit: 3, windowHours: 24 }` — assert **429** and transaction not completing persist.

## Phase 1: Generation engine unit oracles

### Overview

Risk **#3** at `src/lib/plan-generation/` without Prisma.

### Changes Required

#### 1. Minimal stage fixture

**File**: `src/lib/plan-generation/test-fixtures/minimal-stages.ts` (new)

**Intent**: Export `minimalStagesForGeneration` compatible with `validQuestionnairePayload` (slugs, `completedByState`, `sortOrder`, `costPerM2*`).

**Contract**: At least one stage survives `filterStages` for golden payload; document slug choice in comment referencing seed categories.

#### 2. Generation results tests

**File**: `src/lib/plan-generation/generate-plan-results.test.ts` (new)

**Intent**: Call `generatePlanResults` + `toQuestionnaireResponsesMap` with varied inputs.

**Contract**: Tests: (a) larger `area` → strictly greater sum of `estimatedCost`; (b) `PREMIUM` vs `ECONOMY` → greater sum; (c) result array non-empty for golden payload + fixture.

### Success Criteria

#### Automated Verification

- `pnpm test` passes new file
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 2: Persist boundary (mocked transaction)

### Overview

Risk **#4** at `persistPlanVersionWithResults` without HTTP.

### Changes Required

#### 1. Persist unit test

**File**: `src/lib/plan/persist-plan-version.test.ts` (new)

**Intent**: Build fake `tx` with `vi.fn()` methods: `planVersion.create`, `questionnaireResponse.createMany`, `constructionStage.findMany` (returns minimal fixture), `marketBenchmark.findMany` (returns `[]`), `planStageResult.createMany`, optional `planVersion.update`.

**Contract**: After `persistPlanVersionWithResults`, assert `createMany` called once with `data.length >= 1` and each row has `estimatedCost > 0` for golden inputs.

#### 2. Empty persist regression

**Intent**: When `constructionStage.findMany` returns stages that filter to zero (or empty array from `generatePlanResults`), assert `createMany` receives `data: []` — documents current behavior.

**Contract**: Comment links to research Risk #4; no production change in this change unless product explicitly requests.

### Success Criteria

#### Automated Verification

- `pnpm test` passes
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 3: POST create handler contract

### Overview

Risk **#4** at HTTP layer — complements Phase 2.

### Changes Required

#### 1. Golden POST /api/plans

**File**: `src/lib/api/plans-route-handlers.test.ts` (extend)

**Intent**: `asUser`, mock `$transaction` to run simplified callback or spy `persistPlanVersionWithResults` via mock module.

**Contract**: Successful path: **201**, `{ planId }`, and persistence layer received ≥1 stage result (spy/mock assertion). Use `validQuestionnairePayload`.

#### 2. POST empty-generation regression (optional merge with Phase 2)

**Intent**: If handler test can trigger empty `createMany`, assert **201** today + document follow-up GET would 404 — or assert only persist spy with zero rows.

**Contract**: Test name references Risk #4 regression oracle.

### Success Criteria

#### Automated Verification

- `pnpm test` passes
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 4: Recalc reflects input changes

### Overview

Risk **#5**.

### Changes Required

#### 1. Recalc delta test

**File**: `src/lib/api/plans-route-handlers.test.ts` (extend)

**Intent**: Mock ownership OK, mock `$transaction` to capture both `createMany` payloads from two `invokeRecalculate` calls with `area: 120` vs `area: 200` (other fields equal).

**Contract**: Sum of `estimatedCost` in second capture **≠** first (strict inequality). Mock `checkPlanRecalcLimit` to allow both.

### Success Criteria

#### Automated Verification

- `pnpm test` passes
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 5: Rate limit + cookbook

### Overview

Risk **#7** and test-plan §6 updates.

### Changes Required

#### 1. Recalculate 429 test

**File**: `src/lib/api/plans-route-handlers.test.ts` (extend)

**Intent**: `vi.mock("@/lib/rate-limit/plan-recalc")` with `checkPlanRecalcLimit` resolving `{ allowed: false, retryAfterSeconds: 60, limit: 3, windowHours: 24 }`.

**Contract**: **429**, body contains PL rate-limit message; `persistPlanVersionWithResults` not called (if mocked).

#### 2. test-plan §6.1 and §6.5

**File**: `context/foundation/test-plan.md`

**Intent**: §6.1 — colocated unit tests in `plan-generation/`, fixture pattern, directional oracle. §6.5 — benchmark/generation pattern referencing `generate-plan-results.test.ts` and `persist-plan-version.test.ts`.

#### 3. §6.6 note

**Intent**: Append Phase 2 note: empty POST behavior documented; product fix optional.

### Success Criteria

#### Automated Verification

- `pnpm test` and `pnpm lint` pass

#### Manual Verification

- None

---

## Testing Strategy

### Unit Tests

- `generate-plan-results.test.ts` — directional oracles (#3)
- `persist-plan-version.test.ts` — non-empty createMany (#4)

### Integration Tests (handler-level)

- Extended `plans-route-handlers.test.ts` — create golden, recalc delta, 429 (#4, #5, #7)

### Manual Testing Steps

1. Dev smoke: submit questionnaire → plan page shows stages (unchanged; Phase 1 MANUAL-SMOKE still valid).

## Performance Considerations

None.

## Migration Notes

Not applicable.

## References

- `context/changes/testing-generation-recalc-integrity/research.md`
- `context/archive/2026-06-02-testing-access-control-ownership/plan.md`
- `context/foundation/test-plan.md` §2 rows #3–#5, #7
- `src/lib/plan/persist-plan-version.ts`
- `src/lib/plan-generation/generate-plan-results.ts`
- `src/app/api/plans/route.ts`
- `src/app/api/plans/[planId]/recalculate/route.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Generation engine unit oracles

#### Automated

- [x] 1.1 `pnpm test` passes new generation unit tests
- [x] 1.2 `pnpm lint` passes

### Phase 2: Persist boundary (mocked transaction)

#### Automated

- [x] 2.1 `pnpm test` passes persist tests
- [x] 2.2 `pnpm lint` passes

### Phase 3: POST create handler contract

#### Automated

- [x] 3.1 `pnpm test` passes create handler tests
- [x] 3.2 `pnpm lint` passes

### Phase 4: Recalc reflects input changes

#### Automated

- [x] 4.1 `pnpm test` passes recalc delta test
- [x] 4.2 `pnpm lint` passes

### Phase 5: Rate limit + cookbook

#### Automated

- [x] 5.1 `pnpm test` and `pnpm lint` pass

#### Manual

- [x] 5.2 None
