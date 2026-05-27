# Plan generation (S-02) Implementation Plan

## Overview

Implement local knowledge-base plan generation: after questionnaire submit, compute orientacyjny per-stage costs and a sequential construction timeline from seeded `ConstructionStage` + `StageCostModifier` data and user answers, persist `PlanStageResult`, expose results via GET API, and render a functional stacked results page (cost table + calendar timeline).

## Current State Analysis

- `POST /api/plans` (`src/app/api/plans/route.ts`) upserts user, creates `Plan` + `PlanVersion` v1, stores `QuestionnaireResponse` rows, returns `{ planId }`. No generation runs; `PlanStageResult` is never written.
- `/plan/[planId]` (`src/app/(app)/plan/[planId]/page.tsx`) is a placeholder success screen with auth + ownership check via Prisma.
- Knowledge base is seeded in `prisma/seed.ts`: ~18 stages, 24+ modifiers with `[PERCENT:N]`, `[PER_UNIT:slug]`, and plain fixed/`costAdjustmentPerM2` rows. `windows_doors` has zero base cost per m² (modifiers only).
- Questionnaire captures `investment_state` (target), `starting_state`, `build_standard`, counts, `key_date`, etc. (`src/lib/validations/questionnaire.ts`); `isStartingStateBeforeTarget` and `investmentStateOrder` exist for form validation.
- S-01b documented that stage skipping and modifier semantics are **engine** concerns, not UI (`context/changes/questionnaire-refinements/plan.md`).

### Key Discoveries:

- `PlanStageResult` schema is ready (`prisma/schema.prisma:149-161`) — no migration required for S-02.
- F-02 inclusion rule (`userState < completedByState`) is superseded for MVP by S-01b **starting** skip + agreed **target cap** (null `completedByState` only when target is `DEVELOPER`).
- `lessons.md` prefers domain reads via API; user chose `GET /api/plans/[planId]/results` even though other `(app)` pages use Prisma in RSC today.

## Desired End State

A logged-in user submits the questionnaire; the server atomically saves answers, generates stage costs and timeline offsets, and persists `PlanStageResult`. Visiting `/moj-plan/[planId]` loads results through the GET endpoint and shows:

- A table of included stages with point-estimate PLN costs (integer-rounded), category labels, and a total row with an orientacyjny disclaimer.
- A timeline anchored to `key_date` (calendar labels) with sequential stage bars using midpoint durations.

Generation completes within the existing ≤100s NFR (local DB only). Failed generation rolls back the entire plan creation transaction.

### Verification

- Submit a new questionnaire → redirect to plan page → table + timeline populated.
- `starting_state` = `OPEN_SHELL`, `investment_state` = `CLOSED_SHELL` → no foundation/walls stages; finishing-only-null stages still excluded until target `DEVELOPER`.
- `garage_spots` = 0 → no `garage_gate` row.
- `pnpm build` and `pnpm lint` pass.

## What We're NOT Doing

- Internet refinement (S-04), questionnaire re-submit / version bump recalc (S-05), calendar export (FR-010), notes on stages (FR-007).
- Parallel trade scheduling (electrical + plumbing concurrently).
- Min/max cost bands or duration ranges on the timeline (point cost + single duration per stage).
- Changing questionnaire POST contract beyond internal generation side effects.
- Prisma `migrate dev` (no schema changes expected).

## Implementation Approach

Introduce a pure, testable generation module under `src/lib/plan-generation/` that accepts normalized inputs (responses map + loaded stages with modifiers) and returns ordered stage result DTOs. The POST handler loads KB inside the transaction, calls the generator, and `createMany` on `PlanStageResult`. A dedicated GET route enforces auth/ownership and returns the same DTO shape for the UI.

The plan page becomes a Server Component that forwards session cookies to `GET /api/plans/[planId]/results` (no-store). Presentation components live under `src/components/plan/`.

## Critical Implementation Details

- **Stage filter (authoritative):** Exclude `garage_gate` when `garage_spots` is `"0"`. For other stages: let `c = completedByState` order, `s = starting_state`, `t = investment_state` (target). Exclude if `c !== null` and `order(c) ≤ order(s)`. Exclude if `c !== null` and `order(c) > order(t)`. Exclude if `c === null` and `t !== "DEVELOPER"`. Reuse the same ordering as `investmentStateOrder` in `questionnaire.ts` (export or move to shared `src/lib/investment-state.ts` to avoid drift).
- **Modifier matching:** Include modifier when `responses[triggerQuestionSlug] === triggerValue` (string compare; questionnaire stores numbers as strings). Sum **all** matching modifiers per stage. `[PERCENT:N]` → add `N%` of `(tier costPerM2 × area)`; ignore stored `costAdjustmentPerM2` for those rows. `[PER_UNIT:slug]` → add `fixedCostAdjustment × Number(responses[slug] ?? 0)`. Otherwise → add `costAdjustmentPerM2 × area + fixedCostAdjustment`.
- **Timeline:** Among included stages, process in `sortOrder` ascending; `startDay` = max end day of predecessors listed in `predecessorSlugs` that are also included (0 if none); `durationDays = round((durationMinDays + durationMaxDays) / 2)`; end = start + duration. Skip predecessors not in the included set when computing max (optional stage removed from graph).
- **POST failure:** Any generator/DB error → transaction rollback, 500 JSON (Polish), no partial plan.

## Phase 1: Generation engine

### Overview

Build the core calculation and scheduling logic with no UI changes.

### Changes Required:

#### 1. Shared investment-state ordering

**File**: `src/lib/investment-state.ts` (new) or extend `src/lib/validations/questionnaire.ts`

**Intent**: Single source for `InvestmentState` ordering used by filter and (optionally) questionnaire validation.

**Contract**: Export `investmentStateOrder` and `compareInvestmentState(a, b)` used by stage filter; questionnaire imports from here to avoid duplicate maps.

#### 2. Modifier tag parsing

**File**: `src/lib/plan-generation/parse-modifier.ts` (new)

**Intent**: Classify modifier rows by description prefix for cost application.

**Contract**: Functions return kind `percent | per_unit | flat` with `{ percent?: number, unitSlug?: string }` parsed from `[PERCENT:N]` and `[PER_UNIT:slug]`; absent tag → `flat`.

#### 3. Stage inclusion filter

**File**: `src/lib/plan-generation/stage-filter.ts` (new)

**Intent**: Apply starting/target/garage rules to loaded `ConstructionStage` list.

**Contract**: `filterStages(stages, responses): ConstructionStage[]` implementing rules in Critical Implementation Details.

#### 4. Cost calculator

**File**: `src/lib/plan-generation/compute-costs.ts` (new)

**Intent**: Compute per-stage PLN estimate from base tier rate, area, and stacked modifiers.

**Contract**: `computeStageCost(stage, modifiers, responses): number` → integer PLN via `Math.round`; handle zero base (e.g. `windows_doors`) when modifiers supply all cost.

#### 5. Timeline scheduler

**File**: `src/lib/plan-generation/schedule-timeline.ts` (new)

**Intent**: Assign `startDay` and `durationDays` for each included stage.

**Contract**: Input ordered included stages + slug→index map; output aligned `startDay`, `durationDays` per stage.

#### 6. Orchestrator

**File**: `src/lib/plan-generation/generate-plan-results.ts` (new)

**Intent**: Wire filter → cost → schedule into `PlanStageResultInput[]` (stageSlug, estimatedCost, startDay, durationDays, sortOrder).

**Contract**: `generatePlanResults(stagesWithModifiers, responses): PlanStageResultInput[]`; exported types for API layer.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Import/call generator in a temporary script or `node -e` with fixture responses against seeded data (owner runs seed) — spot-check one FOUNDATIONS-only and one DEVELOPER full path totals are non-zero and stage counts match expectations
- `garage_spots: 0` fixture excludes `garage_gate`
- ENHANCED insulation on STANDARD build uses 15% of STANDARD base, not seed ECONOMY constant

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: API & persistence

### Overview

Run generation inside plan creation and expose read API for results.

### Changes Required:

#### 1. Extend POST /api/plans

**File**: `src/app/api/plans/route.ts`

**Intent**: After `questionnaireResponse.createMany`, load all `constructionStage` with `costModifiers`, run `generatePlanResults`, persist via `planStageResult.createMany` on the new `planVersionId` in the same transaction.

**Contract**: Transaction still returns 201 `{ planId }` on success; 409 unchanged for existing plan; 500 on generation/DB errors with rollback.

#### 2. GET plan results

**File**: `src/app/api/plans/[planId]/results/route.ts` (new)

**Intent**: Lesson-aligned read path for domain results.

**Contract**: `GET` — auth required; verify `plan.userId === session user`; load latest `planVersion` (max `versionNumber`) with `stageResults` ordered by `sortOrder`; join stage `name`/`category` from `ConstructionStage` by slug for display; include `keyDate` from responses, `totalCost` sum, stages array `{ stageSlug, name, category, estimatedCost, startDay, durationDays }`; 404 if plan missing/forbidden; 404 or 409 if no `stageResults` yet (should not happen after successful POST).

#### 3. Server fetch helper (optional)

**File**: `src/lib/api/plan-results.ts` (new)

**Intent**: Encapsulate cookie-forwarding `fetch` to GET results from RSC.

**Contract**: `getPlanResultsForPage(planId): Promise<PlanResultsDto | null>` using `headers().get('cookie')`, base URL from `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL` / localhost fallback, `cache: 'no-store'`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- New user flow: submit questionnaire → 201 → DB has `PlanStageResult` rows for version 1
- GET results returns JSON matching persisted rows; second user's GET returns 404/403 for another user's planId
- Simulated generator throw inside transaction leaves no orphan plan (owner verifies DB or repeat submit)

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Results UI

### Overview

Replace placeholder plan page with stacked cost table + calendar timeline fed by GET API.

### Changes Required:

#### 1. Cost table component

**File**: `src/components/plan/plan-cost-table.tsx` (new)

**Intent**: Render stage rows (Polish labels), category grouping optional as single table with category column, integer PLN formatting (`pl-PL`), footer total + disclaimer copy.

**Contract**: Props from GET DTO; disclaimer states orientacyjny character (not binding quote) — copy in Polish, concise.

#### 2. Timeline component

**File**: `src/components/plan/plan-timeline.tsx` (new)

**Intent**: Visualize sequential stages on a calendar axis from `key_date` + `startDay`.

**Contract**: Compute calendar date per stage as `key_date + startDay`; show stage name and duration; use existing Tailwind/shadcn patterns (no new chart library unless already in repo).

#### 3. Plan page

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Auth check (keep redirect behavior), fetch GET results via helper, handle loading/error states (Polish messages), render table then timeline, link back to `routes.dashboard`.

**Contract**: Remove debug plan ID–only placeholder; 404/empty results → friendly message suggesting dashboard.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- E2E happy path: login → questionnaire → submit → `/moj-plan/[id]` shows table + timeline with calendar dates
- Partial target (e.g. FOUNDATIONS): few stages, plausible total
- Full DEVELOPER target: includes finishing stages with null `completedByState`
- Total row matches sum of displayed stages
- Page meets perceived ≤100s after submit (generation in POST)

---

## Testing Strategy

### Unit Tests:

- None in repo per AGENTS.md — defer unless user requests. Engine functions are structured for future unit tests (pure inputs/outputs).

### Integration Tests:

- Manual API + UI flows above.

### Manual Testing Steps:

1. Seed DB (`pnpm db:seed` — owner) with latest questionnaire modifiers.
2. Register/login, complete questionnaire with `starting_state=FROM_SCRATCH`, `investment_state=DEVELOPER`, note `key_date`.
3. Confirm POST 201, GET results JSON, UI table/timeline.
4. Repeat with `investment_state=FOUNDATIONS`, `starting_state=FROM_SCRATCH` — verify truncated stage list.
5. Set `garage_spots=0` — no garage row.
6. `pnpm build` on Vercel-like env if applicable.

## Performance Considerations

- Single transaction loads all stages + modifiers once (~18 stages, O(modifiers)) — well under 100s.
- GET results: one plan lookup + version + stageResults; optional batch load of stage names by slug `in` query.

## Migration Notes

- None. Existing plans created before S-02 have no `stageResults`; MVP assumes one plan per user via 409 on re-submit. No backfill required for MVP.

## References

- Roadmap S-02: `context/foundation/roadmap.md`
- PRD FR-006, FR-008: `context/foundation/prd.md`
- Domain rules: `context/changes/domain-schema-and-seed/plan.md`
- Modifier conventions: `context/changes/questionnaire-refinements/plan.md`
- POST handler: `src/app/api/plans/route.ts`
- Schema: `prisma/schema.prisma`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Generation engine

#### Automated

- [x] 1.1 `pnpm lint` passes — f964e1f
- [x] 1.2 `pnpm build` passes — f964e1f

#### Manual

- [x] 1.3 Generator fixtures: FOUNDATIONS-only and DEVELOPER paths — stage sets and insulation % behave as specified — f964e1f
- [x] 1.4 `garage_spots: 0` excludes `garage_gate` — f964e1f

### Phase 2: API & persistence

#### Automated

- [x] 2.1 `pnpm lint` passes — e63064a
- [x] 2.2 `pnpm build` passes — e63064a

#### Manual

- [x] 2.3 POST questionnaire creates `PlanStageResult` rows in same transaction — e63064a
- [x] 2.4 GET `/api/plans/[planId]/results` returns correct payload; forbidden for other users — e63064a
- [x] 2.5 Generation failure rolls back plan creation — e63064a

### Phase 3: Results UI

#### Automated

- [ ] 3.1 `pnpm lint` passes
- [ ] 3.2 `pnpm build` passes

#### Manual

- [ ] 3.3 Plan page shows stacked table + calendar timeline after submit
- [ ] 3.4 Partial target and full DEVELOPER scenarios display expected stages
- [ ] 3.5 Total row and disclaimer visible; sum matches stages
