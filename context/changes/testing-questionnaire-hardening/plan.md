# Questionnaire Hot-Spot Hardening Tests — Implementation Plan

## Overview

Implement **test-plan Phase 3** (`context/foundation/test-plan.md` §3 row 3): automated coverage for Risk **#6** (server/client validation parity on questionnaire payloads) and cross **#4** (questionnaire answers still feed a non-empty generation signal). Builds on archived Phases 1–2 (`testing-access-control-ownership`, `testing-generation-recalc-integrity`).

## Current State Analysis

- **Risk #6 (partial):** `questionnaire-inputs.test.ts` covers golden accept, bad enum, low `area`, invalid state order, missing `key_date`, string `floors`. Handler test: invalid `POST /api/plans` → **400**, no `$transaction`. **No** matching test for `POST .../recalculate`.
- **UI validation split** (`lessons.md`): `questionnaireFormSchema` for RHF (no `.refine()`); `questionnaireInputsSchema` on submit (`questionnaire-form.tsx:118`) and API routes; `investment-state.ts` filters options in `step-content.tsx`.
- **Stored answers:** `responsesToQuestionnaireInputs` (`src/lib/questionnaire/responses-to-inputs.ts`) parses DB rows with `questionnaireInputsSchema` — untested.
- **Cross #4:** Phase 2 proves HTTP create + `generatePlanResults` separately; no test chaining **questionnaire-shaped inputs** → engine output in one oracle.
- **Hot-spot:** `src/components/questionnaire/` (6 commits/30d per test-plan); `src/lib/investment-state.ts` has **no** unit tests.

### Key Discoveries

- Invalid recalculate body must expect **400**, not 404 on foreign `planId` (parse before ownership — same as Phase 1 research).
- `FOUNDATIONS` appears in both target and starting labels with different semantics; strict `<` must be tested on enum values, not labels.
- Do not add Playwright or `@testing-library` for `QuestionnaireForm` (AGENTS.md + test-plan §7).

## Desired End State

1. **Risk #6:** `investment-state.test.ts` documents allowed pairs and rejects `starting >= target` on enum values.
2. **Risk #6:** Expanded `questionnaire-inputs.test.ts` for independent invalid/boundary cases (optional fields, type coercion failures).
3. **Risk #6:** `responses-to-inputs.test.ts` — golden rows round-trip; invalid stored pair throws or fails parse.
4. **Cross #4:** `questionnaire-pipeline.test.ts` — `validQuestionnairePayload` passes `questionnaireInputsSchema`, maps to responses, `generatePlanResults` returns ≥1 positive-cost row with `minimalStagesForGeneration`.
5. **Risk #6 integration:** `POST .../recalculate` with invalid body → **400** + `details`; `$transaction` not called (mirror create test).
6. **`MANUAL-SMOKE.md`** in this change folder for step-1 state matrix (per `lessons.md`).
7. **`test-plan.md` §6.6** Phase 3 note; §3 row 3 status **complete** when shipped.
8. `pnpm test`, `pnpm lint`, CI green.

### Verification

```bash
pnpm test
pnpm lint
pnpm build:ci
```

## What We're NOT Doing

- Playwright or component tests for `QuestionnaireForm` / `step-content.tsx`.
- Changing the Zod/RHF split or adding `.refine()` to `questionnaireFormSchema`.
- Re-testing ownership, generation HTTP golden path, recalc delta, or rate limit (archived Phase 1–2).
- Live Postgres / seed-dependent CI tests.
- Extracting `filterStateQuestionOptions` to a new module unless implementer needs it for testability (prefer `investment-state` tests + manual smoke).
- Testing questionnaire hints/copy (`question-hints.ts`) — low risk signal.

## Implementation Approach

**Cost × signal:** pure `src/lib/` unit tests first (`investment-state`, schema, responses, pipeline), then one handler extension for recalculate **400**, then manual smoke doc.

**Fixtures:** reuse `validQuestionnairePayload` and `minimalStagesForGeneration` from Phase 2 archives.

**Oracle discipline (#6):** Invalid expectations come from PRD ranges and `STATE_ORDER_ERROR_MESSAGE` — not from copying handler JSON shapes as the only assert.

## Critical Implementation Details

**Recalculate parse order:** Auth → `questionnaireInputsSchema` → `plan.findUnique` → transaction. Invalid body tests use `asUser` + own plan mock but must assert **400** and `prismaTransaction` not called (same pattern as create invalid test in `plans-route-handlers.test.ts`).

**Cross #4 scope:** Lib pipeline test documents that **valid questionnaire inputs** still produce generation output; it does not replace Phase 2 handler create tests.

## Phase 1: Investment-state unit tests

### Overview

Risk **#6** foundation — same helpers the questionnaire UI uses to filter radio options.

### Changes Required

#### 1. State order and allowed-pairs tests

**File**: `src/lib/investment-state.test.ts` (new)

**Intent**: Unit-test `isStartingStateBeforeTarget`, `getAllowedTargetStates`, `getAllowedStartingStates`, `pickDefaultTargetForStarting`, `pickDefaultStartingForTarget`.

**Contract**: Cases include: `FROM_SCRATCH` → `DEVELOPER` allowed; `CLOSED_SHELL` → `OPEN_SHELL` rejected by `isStartingStateBeforeTarget`; `FOUNDATIONS` + `FOUNDATIONS` rejected (strict `<`); allowed lists never include values that violate order when paired with a fixed opposite state; defaults land in allowed set.

### Success Criteria

#### Automated Verification

- `pnpm test` passes new file
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 2: Schema and stored-response validation

### Overview

Extend Risk **#6** at Zod boundary and edit-mode reload path.

### Changes Required

#### 1. Expand questionnaire schema tests

**File**: `src/lib/validations/questionnaire-inputs.test.ts` (extend)

**Intent**: Add independent invalid cases not yet covered.

**Contract**: At least: `garage_spots` as string; `window_count` above max; `key_date` invalid format; optional field boundary (`terrace_door_count: -1` if schema rejects). Keep golden accept test.

#### 2. Responses round-trip tests

**File**: `src/lib/questionnaire/responses-to-inputs.test.ts` (new)

**Intent**: Test `responsesToQuestionnaireInputs`.

**Contract**: Build row array from `validQuestionnairePayload` (string values per slug); parse succeeds and matches shape. Rows with invalid state order or bad `area` cause `safeParse` failure (thrown `Error` with PL message per implementation).

**Fixture helper:** local `payloadToStoredRows(payload)` in test file or `test-fixtures/stored-responses.ts` under `src/lib/questionnaire/test-fixtures/`.

### Success Criteria

#### Automated Verification

- `pnpm test` passes extended/new files
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 3: Questionnaire → generation pipeline (cross #4)

### Overview

Prove valid questionnaire data still yields non-empty generation at the lib layer (complements Phase 2 HTTP tests).

### Changes Required

#### 1. Pipeline unit test

**File**: `src/lib/questionnaire/questionnaire-pipeline.test.ts` (new)

**Intent**: Chain validation + engine without HTTP/Prisma.

**Contract**: `questionnaireInputsSchema.safeParse(validQuestionnairePayload)` succeeds; `toQuestionnaireResponsesMap(parsed.data)`; `generatePlanResults(minimalStagesForGeneration, map)` returns `length >= 1` and all `estimatedCost > 0`. Comment links to test-plan cross #4 — not a substitute for handler create test.

### Success Criteria

#### Automated Verification

- `pnpm test` passes new file
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 4: Recalculate handler validation parity

### Overview

Risk **#6** at HTTP — recalculate must reject invalid bodies like create.

### Changes Required

#### 1. Invalid POST recalculate tests

**File**: `src/lib/api/plans-route-handlers.test.ts` (extend)

**Intent**: Mirror existing create **400** test for recalculate route.

**Contract**: `asUser`, `planFindUnique` returns own plan; invalid payloads (`area: 1`, invalid state order) → **400**, `error: "Nieprawidłowe dane ankiety"`, `details` present, `prismaTransaction` not called. At least two distinct invalid cases.

### Success Criteria

#### Automated Verification

- `pnpm test` passes handler extensions
- `pnpm lint` passes

#### Manual Verification

- None

---

## Phase 5: Manual smoke and test-plan cookbook

### Overview

Document UI state matrix and stamp Phase 3 in test-plan.

### Changes Required

#### 1. Manual smoke checklist

**File**: `context/changes/testing-questionnaire-hardening/MANUAL-SMOKE.md` (new)

**Intent**: Human verification for step 1 state filtering and submit (per `lessons.md` merge checklist).

**Contract**: Checklist includes: `FROM_SCRATCH` → `DEVELOPER` submit succeeds; impossible pairs not selectable; after changing start, target auto-corrects; edit mode reload shows consistent states.

#### 2. test-plan updates

**File**: `context/foundation/test-plan.md`

**Intent**: §3 row 3 → `complete` and change folder `testing-questionnaire-hardening` when implementation lands; §6.6 append **Phase 3** note referencing `investment-state.test.ts`, `responses-to-inputs.test.ts`, `questionnaire-pipeline.test.ts`, recalculate **400** tests, and `MANUAL-SMOKE.md`.

**Contract**: Do not add file:line anchors in §2 risk map.

### Success Criteria

#### Automated Verification

- `pnpm test` and `pnpm lint` still pass (no code change required in this phase if prior phases done)

#### Manual Verification

- Owner runs `MANUAL-SMOKE.md` steps in dev before deploy (recommended)

---

## Testing Strategy

### Unit Tests

- `investment-state.test.ts` — allowed states, strict ordering
- `questionnaire-inputs.test.ts` — API schema edge cases
- `responses-to-inputs.test.ts` — stored row parse
- `questionnaire-pipeline.test.ts` — cross #4 lib oracle

### Integration Tests (handler-level)

- `plans-route-handlers.test.ts` — recalculate **400** cases

### Manual Testing Steps

1. Follow `MANUAL-SMOKE.md` on local `pnpm dev` questionnaire (new + edit if plan exists).
2. Confirm step 1 cannot select invalid start/target pairs.
3. Confirm submit still reaches plan page with stages (sanity; not automated here).

## Performance Considerations

None.

## Migration Notes

Not applicable.

## References

- `context/foundation/test-plan.md` §2 rows #4, #6; §3 row 3
- `context/foundation/lessons.md` (questionnaire Zod/RHF rule)
- `context/archive/2026-06-02-testing-access-control-ownership/`
- `context/archive/2026-06-02-testing-generation-recalc-integrity/`
- `src/lib/validations/questionnaire.ts`
- `src/lib/investment-state.ts`
- `src/components/questionnaire/questionnaire-form.tsx`
- `src/components/questionnaire/step-content.tsx`
- `src/lib/questionnaire/responses-to-inputs.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Investment-state unit tests

#### Automated

- [x] 1.1 `pnpm test` passes `investment-state.test.ts`
- [x] 1.2 `pnpm lint` passes

### Phase 2: Schema and stored-response validation

#### Automated

- [x] 2.1 `pnpm test` passes schema and `responses-to-inputs` tests
- [x] 2.2 `pnpm lint` passes

### Phase 3: Questionnaire → generation pipeline (cross #4)

#### Automated

- [x] 3.1 `pnpm test` passes `questionnaire-pipeline.test.ts`
- [x] 3.2 `pnpm lint` passes

### Phase 4: Recalculate handler validation parity

#### Automated

- [x] 4.1 `pnpm test` passes recalculate **400** handler tests
- [x] 4.2 `pnpm lint` passes

### Phase 5: Manual smoke and test-plan cookbook

#### Automated

- [x] 5.1 `test-plan.md` §3 row 3 and §6.6 updated when rollout complete

#### Manual

- [ ] 5.2 `MANUAL-SMOKE.md` checklist executed in dev (recommended before deploy)
