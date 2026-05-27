# Edit and recalculate (S-05) Implementation Plan

## Overview

Enable iterative planning: users with an existing plan edit questionnaire answers and trigger recalculation. Each submit creates a new `PlanVersion` with fresh `QuestionnaireResponse` and `PlanStageResult` rows; the results UI continues to show the latest version. First-time plan creation stays on `POST /api/plans`.

## Current State Analysis

- **Schema supports versioning** — `PlanVersion.versionNumber` unique per `planId`; `QuestionnaireResponse` and `PlanStageResult` cascade per version (`prisma/schema.prisma:125-161`).
- **Create-only API** — `POST /api/plans` returns 409 when `findFirst` finds a plan; generation runs only on initial create (`src/app/api/plans/route.ts:41-95`).
- **Questionnaire blocks edits** — `/ankieta` redirects to plan if `existingPlan` (`src/app/(app)/questionnaire/page.tsx:18-24`).
- **Form hardcoded defaults** — `QuestionnaireForm` does not accept prior answers (`src/components/questionnaire/questionnaire-form.tsx:37-47`).
- **GET results ready** — latest version only (`src/app/api/plans/[planId]/results/route.ts:28-30`).
- **F-02 design intent** — versioning documented for S-05 before/after (`context/changes/domain-schema-and-seed/plan-brief.md`).

### Key Discoveries:

- No migration required if recalc only adds versions.
- `toQuestionnaireResponsesMap` exists for engine input; inverse mapping (DB strings → `QuestionnaireInputs`) is missing and needed for prefill.
- S-06 rate limits explicitly blocked on roadmap — do not implement counters in this change.

## Desired End State

1. User with a plan clicks **„Edytuj odpowiedzi”** on `/panel` or plan page → `/ankieta` with fields prefilled from latest `QuestionnaireResponse` values.
2. User changes answers, reaches summary, clicks **„Przelicz ponownie”** → `POST /api/plans/[planId]/recalculate` → redirect `/moj-plan/[planId]`.
3. Plan page shows updated costs and timeline (same GET contract; latest version).
4. User without a plan: unchanged flow — `/ankieta` empty defaults → `POST /api/plans` → 201.
5. Recalculation completes within ≤100s (local KB).

### Verification

- Manual: edit area on existing plan → totals change; create path still works for new account.
- `pnpm lint` and `pnpm build` pass each phase.

## What We're NOT Doing

- Version history UI, diff, or rollback to older versions.
- Rate-limit enforcement (S-06).
- Internet refinement (S-04).
- Allowing multiple `Plan` rows per user.
- Backfill/migration of legacy plans missing `PlanStageResult`.
- Prisma `migrate dev` (no schema change expected).

## Implementation Approach

Extract shared transaction logic for “persist responses + run generator + write `PlanStageResult`”. Wire a new recalculate route that increments `versionNumber`. Switch questionnaire to edit mode when a plan exists. Add navigation CTAs on panel and plan page.

## Phase 1: Recalculate API & shared generation transaction

### Overview

Add `POST /api/plans/[planId]/recalculate` and deduplicate generation persistence used by create.

### Changes Required:

#### 1. Shared plan-version persistence

**File**: `src/lib/plan/persist-plan-version.ts` (new)

**Intent**: Single place for “save responses + generate stage results” inside a Prisma transaction.

**Contract**: Export async function, e.g. `persistPlanVersionWithResults(tx, { planId, versionNumber, inputs: QuestionnaireInputs })` that: `createMany` `QuestionnaireResponse` from stringified values; loads `constructionStage` with modifiers; calls `generatePlanResults`; `createMany` `PlanStageResult`. Returns created `planVersionId`. No plan creation inside — caller supplies `planId` and `versionNumber`.

#### 2. Response → form prefill helper (used in Phase 2; define here for API tests)

**File**: `src/lib/questionnaire/responses-to-inputs.ts` (new)

**Intent**: Convert stored KV rows to typed `QuestionnaireInputs` for RHF defaults.

**Contract**: `responsesToQuestionnaireInputs(rows: { questionSlug, value }[]): QuestionnaireInputs` — parse numbers (`area`, `floors`, `garage_spots`, `balcony_count`, `terrace_door_count`), booleans (`has_attic`), dates (`key_date`), enums as strings; use `questionnaireInputsSchema.safeParse` and throw or return partial defaults on failure (prefer safeParse + fallback only for optional fields).

#### 3. Refactor create handler

**File**: `src/app/api/plans/route.ts`

**Intent**: Use shared helper; keep 409 when plan exists.

**Contract**: Transaction: upsert user → if plan exists return `{ created: false }` → else create `Plan`, call `persistPlanVersionWithResults` with `versionNumber: 1`. 201 `{ planId }` unchanged.

#### 4. Recalculate route

**File**: `src/app/api/plans/[planId]/recalculate/route.ts` (new)

**Intent**: FR-005 backend entry point.

**Contract**: `POST` — auth required; `questionnaireInputsSchema` body; load `plan` by `planId`, 404 if missing, 403/404 if `userId` mismatch; in transaction: `maxVersion = max(versionNumber)`, `next = maxVersion + 1`, create `PlanVersion` row, call `persistPlanVersionWithResults`; update `plan.updatedAt` optional; return `200 { planId }`. 500 + rollback on generator failure. Runtime `nodejs`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- `POST /api/plans/[planId]/recalculate` with valid session creates `PlanVersion` v2+ in DB (Prisma Studio) with new responses and `PlanStageResult` rows
- `POST /api/plans` still 409 when plan exists
- `GET /api/plans/[planId]/results` reflects values from latest version after recalc

**Implementation Note**: Pause for human confirmation before Phase 2.

---

## Phase 2: Questionnaire edit mode

### Overview

Allow `/ankieta` when user has a plan; prefill and submit to recalculate endpoint.

### Changes Required:

#### 1. Questionnaire page loader

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Remove redirect-to-plan block; load edit context.

**Contract**: If user has `plan` (with `id`): fetch latest `PlanVersion` (`orderBy versionNumber desc`, `take 1`, include `responses`). Pass `planId` and `initialValues` from `responsesToQuestionnaireInputs` to form. If no plan: pass `planId: undefined`, form uses existing hardcoded defaults. Page title/helper copy in Polish: edit vs first-time (e.g. „Zmień odpowiedzi i przelicz plan”).

#### 2. Questionnaire form dual mode

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Support create vs recalculate submit.

**Contract**: Props: `questions`, optional `planId`, optional `initialValues: Partial<QuestionnaireInputs>`. `useForm` `defaultValues` merge `initialValues` over current defaults when `planId` set. `onSubmit`: if `planId` → `POST /api/plans/${planId}/recalculate`; else `POST /api/plans`. On 200/201 → `router.push(routes.plan(planId))`. Keep 401 → login. Summary step primary button label: **„Przelicz ponownie”** when `planId`, else **„Zatwierdź”** (or existing label).

#### 3. Layout height

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Match app header offset used on dashboard.

**Contract**: Use `min-h-[calc(100svh-3.5rem)]` on wrapper (consistent with S-03).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- User with plan opens `/ankieta` — fields match last saved answers (spot-check area, states)
- Submit after edit redirects to plan page with updated totals
- User without plan — empty/new defaults and create POST still work

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Entry points & end-to-end verification

### Overview

Expose edit affordances and verify full US-01 recalculate path.

### Changes Required:

#### 1. Panel CTA

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Second action when plan exists.

**Contract**: Below „Zobacz kosztorys…”, add outline/secondary `Link` to `routes.questionnaire` — label **„Edytuj odpowiedzi”**.

#### 2. Plan page CTA

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Edit from results view.

**Contract**: In header area, `Link` to `routes.questionnaire` — **„Edytuj odpowiedzi”** (same Polish label).

#### 3. Change notes

**File**: `context/changes/edit-and-recalculate/change.md`

**Intent**: Record scope and deferred items for reviewers.

**Contract**: Replace placeholder Notes with S-05 summary (versioning, no S-06 limits).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Panel → Edytuj → change answer → Przelicz → plan updates
- Plan page → Edytuj → same flow
- New account: panel → Rozpocznij ankietę → create still works
- Recalc ≤100s on typical seed data

**Implementation Note**: Final phase — human sign-off closes S-05.

---

## Testing Strategy

### Manual Testing Steps

1. **Recalculate** — existing user: edit `area` or `build_standard` → confirm total changes, stage set consistent with target/start states.
2. **Regression create** — new user completes first plan.
3. **Auth** — recalculate without session → 401; wrong `planId` → 404.
4. **DB** — after two recalculations, three `PlanVersion` rows, GET shows v3 results only.
5. **409 unchanged** — `POST /api/plans` with existing plan returns 409 (client should not hit this from UI).

## Performance Considerations

Same generation cost as initial create; version rows grow O(recalculations) — acceptable until S-06. No N+1 beyond existing stage load.

## Migration Notes

None. Optional: owner may delete test plans with orphaned v1 — not required.

## References

- PRD FR-005, US-01: `context/foundation/prd.md`
- Roadmap S-05: `context/foundation/roadmap.md`
- Domain versioning: `context/changes/domain-schema-and-seed/plan-brief.md`
- Generation: `src/lib/plan-generation/`, `context/changes/plan-generation/plan.md`
- Questionnaire patterns: `context/foundation/lessons.md` (Zod refine split)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Recalculate API & shared generation transaction

#### Automated

- [x] 1.1 `pnpm lint` passes
- [x] 1.2 `pnpm build` passes

#### Manual

- [x] 1.3 Recalculate POST creates new PlanVersion with results in DB
- [x] 1.4 Create POST still 409 when plan exists
- [x] 1.5 GET results returns latest version after recalc

### Phase 2: Questionnaire edit mode

#### Automated

- [x] 2.1 `pnpm lint` passes
- [x] 2.2 `pnpm build` passes

#### Manual

- [x] 2.3 `/ankieta` prefills latest answers when plan exists
- [x] 2.4 Submit recalc updates plan page totals
- [x] 2.5 First-time user create path still works

### Phase 3: Entry points & end-to-end verification

#### Automated

- [x] 3.1 `pnpm lint` passes
- [x] 3.2 `pnpm build` passes

#### Manual

- [x] 3.3 Panel and plan page edit links work end-to-end
- [x] 3.4 New user create regression passes
- [x] 3.5 Recalc completes within 100s
