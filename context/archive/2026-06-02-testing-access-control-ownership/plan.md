# Access Control & Ownership Tests — Implementation Plan

## Overview

Implement **test-plan Phase 1** (`context/foundation/test-plan.md` §3 row 1): automated coverage for Risks **#1** (plan IDOR), **#2** (API auth), and **#6** (server questionnaire validation). No production behavior changes unless a test reveals a defect — default is test-only.

## Current State Analysis

- Ownership enforced only in `GET /api/plans/[planId]/results` and `POST .../recalculate` via `plan.userId !== user.id` → **404** (`results/route.ts:39-40`, `recalculate/route.ts:42-43`).
- All plan routes use `createClient().auth.getUser()` → **401** `"Brak autoryzacji"` when absent.
- `POST /api/plans` binds `userId` from session; no `planId` in path (no IDOR on create).
- `questionnaireInputsSchema` on API; **no** `questionnaire*.test.ts`.
- Vitest: `src/**/*.test.ts`, `environment: node` (`vitest.config.mts`); existing tests use pure logic only (no `vi.mock` yet).

### Key Discoveries

- Plan RSC page delegates to API — handler tests are sufficient for #1 (`research.md`).
- Invalid body returns **400** before ownership on recalculate — tests must not expect 404 for malformed JSON on foreign IDs (`research.md`).
- Happy-path GET must use mocks with **non-empty** `stageResults` so failures are not confused with Phase 2 empty-generation (`testing-generation-recalc-integrity/research.md`).

## Desired End State

1. **Risk #6:** `src/lib/validations/questionnaire-inputs.test.ts` (or equivalent) with independent invalid cases + one golden valid payload (requirements-based enums/ranges, not copied from `generatePlanResults`).
2. **Risk #1:** Handler tests prove User A + User B’s `planId` → **404**, JSON without cost/timeline fields; own plan → **200** with `stages` array length ≥ 1 (mocked).
3. **Risk #2:** Unauthenticated calls to `POST /api/plans`, `GET .../results`, `POST .../recalculate` → **401**.
4. **Risk #6 integration:** `POST /api/plans` with invalid body → **400**; `prisma.$transaction` not invoked.
5. **`context/foundation/test-plan.md` §6.2** filled with ownership-denial recipe; `MANUAL-SMOKE.md` in this change folder for middleware checks.
6. `pnpm test`, `pnpm lint`, CI green.

### Verification

```bash
pnpm test
pnpm lint
pnpm build:ci
```

## What We're NOT Doing

- Playwright or full questionnaire E2E (test-plan §7, AGENTS.md).
- Live Postgres / `pnpm db:migrate` in tests (owner-only; no CI DB assumed).
- Testing `checkPlanRecalcLimit` persistence or rate-limit integration (Risk #7 → Phase 2).
- Testing empty `stageResults` / generate path (Risk #4 → Phase 2).
- Changing API status codes (404 vs 403) or middleware implementation.
- Unit-testing `middleware.ts` in this change (manual smoke only).

## Implementation Approach

**Cost × signal:** unit schema tests first (cheapest, no mocks), then handler tests with **`vi.mock('@/lib/supabase/server')`** and **`vi.mock('@/lib/prisma')`** importing route `POST`/`GET` functions and calling them with `new Request(...)`.

Place handler tests in **`src/lib/api/plans-route-handlers.test.ts`** (keeps `src/app/api` free of bracket-path test files; still under `src/**/*.test.ts`).

Shared fixtures in **`src/lib/api/test-fixtures/questionnaire-payload.ts`** — export `validQuestionnairePayload` satisfying `questionnaireInputsSchema` (e.g. `starting_state: 'FROM_SCRATCH'`, `investment_state: 'DEVELOPER'`, `area: 120`, valid `key_date`, required counts).

## Critical Implementation Details

**Handler invocation (App Router):** Routes use `context.params` as `Promise<{ planId: string }>`. Tests must pass `{ params: Promise.resolve({ planId }) }` for dynamic segments.

**Mock order on recalculate:** Auth → parse → ownership → transaction. Tests for invalid body should stub `getUser` as authenticated but expect **400** before `findUnique` if implementation parses first (current code: parse at lines 27–34 before ownership at 37–43 — invalid body never hits ownership).

**Oracle discipline (Risk #6):** Invalid cases use **independent** expectations: wrong enum, `area: 10`, `starting_state` not before `investment_state` (e.g. both `DEVELOPER`), missing `key_date`. Do not assert against production handler error strings as the only oracle.

**GET results mock shape:** When testing 200, `findUnique` include must return `versions[0].stageResults` with at least one row and matching `userId` on `plan`.

## Phase 1: Questionnaire API schema unit tests

### Overview

Prove Risk **#6** at the Zod boundary without HTTP or Prisma.

### Changes Required

#### 1. Valid fixture module

**File**: `src/lib/api/test-fixtures/questionnaire-payload.ts` (new)

**Intent**: Single golden payload reused by unit and handler tests.

**Contract**: Export `validQuestionnairePayload` typed as input to `questionnaireInputsSchema`; must pass `questionnaireInputsSchema.safeParse` (assert once in tests).

#### 2. Schema test file

**File**: `src/lib/validations/questionnaire-inputs.test.ts` (new)

**Intent**: Matrix of invalid payloads → `safeParse.success === false`; golden payload → success; cross-field refine failure sets path `starting_state`.

**Contract**: Import `questionnaireInputsSchema` only (not `questionnaireFormSchema`). Minimum cases: invalid `investment_state` enum; `area` below 50; inverted start/target order; missing `key_date`; wrong type for `floors` (string).

### Success Criteria

#### Automated Verification

- `pnpm test` runs new file and passes
- `pnpm lint` passes

#### Manual Verification

- Skim failures — messages are Zod defaults (no production change required)

---

## Phase 2: Route handler test harness

### Overview

Introduce shared mocks and helpers so Phases 3–4 do not duplicate boilerplate.

### Changes Required

#### 1. Handler test module

**File**: `src/lib/api/plans-route-handlers.test.ts` (new)

**Intent**: Central `vi.mock` for `@/lib/supabase/server` and `@/lib/prisma`; helpers `asUser(id)`, `asAnonymous()`, `invokeGetResults(planId)`, `invokePostPlans(body)`, `invokeRecalculate(planId, body)`.

**Contract**: `createClient` mock returns `{ auth: { getUser: vi.fn() } } }`; document reset in `beforeEach`.

#### 2. Prisma mock contract

**Intent**: Stub `prisma.plan.findUnique`, `prisma.$transaction` as `vi.fn()`; ownership tests configure return values per case.

**Contract**: Do not import real `prisma` in tests — always mocked.

### Success Criteria

#### Automated Verification

- `pnpm test` — harness file may include one smoke test (e.g. 401 when anonymous on GET) or stay empty until Phase 3; **Phase 2 + 3 should land in one implement session** if harness has no assertions yet
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 3: Ownership and API authentication

### Overview

Cover Risk **#1** and **#2** on all three plan routes.

### Changes Required

#### 1. IDOR — GET results

**File**: `src/lib/api/plans-route-handlers.test.ts`

**Intent**: User A session, plan row owned by User B → **404**, body `error` matches `"Nie znaleziono planu"`, no `stages` / `totalCost` keys in success shape.

**Contract**: `GET` handler from `src/app/api/plans/[planId]/results/route.ts`.

#### 2. IDOR — POST recalculate

**Intent**: Same user/plan mismatch → **404**, `persistPlanVersionWithResults` / `$transaction` not called.

**Contract**: Mock `findUnique` before transaction; use `validQuestionnairePayload` body.

#### 3. Happy path — GET own plan

**Intent**: User A, `plan.userId === A`, one `stageResult` → **200**, `stages.length >= 1`.

**Contract**: Oracle is structural (array non-empty), not numeric costs from engine.

#### 4. Unauthenticated — three routes

**Intent**: `getUser` returns null → **401** on POST `/api/plans`, GET results, POST recalculate.

**Contract**: Response `{ error: "Brak autoryzacji" }`.

#### 5. Missing plan

**Intent**: `findUnique` returns null → **404** (same message as foreign owner — do not assert distinguishable).

### Success Criteria

#### Automated Verification

- `pnpm test` — all cases in Phase 3 pass
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 4: Invalid create body (no DB write)

### Overview

Risk **#6** at HTTP boundary for `POST /api/plans`.

### Changes Required

#### 1. Invalid POST /api/plans

**File**: `src/lib/api/plans-route-handlers.test.ts`

**Intent**: Authenticated user, body failing `questionnaireInputsSchema` → **400**, `details` present in JSON; `prisma.$transaction` **not** called.

**Contract**: Use clearly invalid payload (e.g. `area: 1`); mock `getUser` with valid user id.

### Success Criteria

#### Automated Verification

- `pnpm test` passes
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 5: Cookbook and manual smoke

### Overview

Close rollout deliverables for Phase 1 in test-plan §6 and document middleware checks test-plan cannot automate cheaply.

### Changes Required

#### 1. Test-plan cookbook §6.2

**File**: `context/foundation/test-plan.md`

**Intent**: Replace §6.2 TBD with pattern: where tests live, how to mock auth, ownership denial assertion (404, no payload), commands `pnpm test`.

**Contract**: No file:line anchors in §2 style — behavior-level recipe only; reference `plans-route-handlers.test.ts` as canonical example.

#### 2. Manual smoke checklist

**File**: `context/changes/testing-access-control-ownership/MANUAL-SMOKE.md` (new)

**Intent**: Short checklist: logged out → `/panel` redirects to `/logowanie`; logged in → `/moj-plan/<own-id>` loads; API without cookie → 401 (curl or DevTools).

**Contract**: Polish labels for UI paths per `routes.ts`.

#### 3. Optional AGENTS.md note

**Intent**: Only if implementer finds AGENTS still says “tests only in src/lib pure logic” without mentioning handler tests — add one line that API handler tests live under `src/lib/api/*.test.ts` with mocks. **Skip if current AGENTS wording already allows.**

### Success Criteria

#### Automated Verification

- `pnpm test` and `pnpm lint` still pass (no regressions from doc-only if skipped code)

#### Manual Verification

- Human runs `MANUAL-SMOKE.md` once after Phase 3 lands; sign off in PR or change Notes

---

## Testing Strategy

### Unit Tests

- `questionnaireInputsSchema` invalid/valid matrix (Phase 1)
- Independent oracles from Zod/PRD constraints

### Integration Tests (handler-level)

- Mocked Supabase + Prisma; real route handler imports (Phases 3–4)
- Regressions: IDOR, 401, 400 without write

### Manual Testing Steps

1. Logged out: open `/panel` → login page
2. Logged in: open own `/moj-plan/<id>` → results visible
3. DevTools: `fetch('/api/plans/<foreign-uuid>/results')` while logged in as A → 404

## Performance Considerations

None — tests are in-memory mocks; no additional CI services.

## Migration Notes

Not applicable.

## References

- `context/changes/testing-access-control-ownership/research.md`
- `context/foundation/test-plan.md` §2–§3, §6.2, §7
- `context/foundation/lessons.md` — questionnaire schema split
- `context/changes/testing-generation-recalc-integrity/research.md` — empty results vs `not_found`
- `src/app/api/plans/[planId]/results/route.ts`
- `src/app/api/plans/[planId]/recalculate/route.ts`
- `src/app/api/plans/route.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Questionnaire API schema unit tests

#### Automated

- [x] 1.1 `pnpm test` runs new schema tests and passes
- [x] 1.2 `pnpm lint` passes

#### Manual

- [ ] 1.3 Skim Zod failure cases — no production change required

### Phase 2: Route handler test harness

#### Automated

- [x] 2.1 `pnpm test` passes (harness + Phase 3 may ship together)
- [x] 2.2 `pnpm lint` passes

### Phase 3: Ownership and API authentication

#### Automated

- [x] 3.1 `pnpm test` — IDOR and 401 cases pass
- [x] 3.2 `pnpm lint` passes

#### Manual

- [ ] 3.3 None

### Phase 4: Invalid create body (no DB write)

#### Automated

- [x] 4.1 `pnpm test` — invalid POST `/api/plans` passes
- [x] 4.2 `pnpm lint` passes

### Phase 5: Cookbook and manual smoke

#### Automated

- [x] 5.1 `pnpm test` and `pnpm lint` still pass

#### Manual

- [ ] 5.2 Complete `MANUAL-SMOKE.md` checklist once
