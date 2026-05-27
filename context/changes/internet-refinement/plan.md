# Internet refinement (S-04) Implementation Plan

## Overview

Implement FR-009 by refining locally generated stage costs using **cached market benchmarks** stored in Postgres, refreshed outside the user request path. Local KB remains the anchor; internet-sourced indices adjust costs per stage category with clear orientacyjny disclaimers.

## Current State Analysis

- **Local generation** — `persistPlanVersionWithResults` calls `generatePlanResults` and writes `PlanStageResult.estimatedCost` from seed rates/modifiers only (`src/lib/plan/persist-plan-version.ts`).
- **No external data model** — Prisma has knowledge-base stages/modifiers but no market benchmark table.
- **Results API** — `PlanResultsDto` exposes `totalCost` and stages without refinement metadata (`src/lib/plan-results.ts`).
- **NFR** — ≤100s end-to-end on submit/recalculate (`context/foundation/prd.md`).
- **Infrastructure guidance** — Pre-mortem warns against synchronous live web enrichment in serverless handlers; recommends pre-seeded/cache read (`context/foundation/infrastructure.md`).

### Key Discoveries:

- Stage `category` values in seed are a stable join key (`STRUCTURE`, `INSTALLATIONS`, `ENVELOPE`, `FINISHING`, …) — `prisma/seed.ts`.
- Questionnaire lacks region/voivodeship — national benchmarks avoid new questions for S-04.
- S-05 recalculate reuses `persistPlanVersionWithResults` — single integration point covers create + edit.

## Desired End State

1. `MarketBenchmark` rows exist (category → multiplier, source metadata, `fetchedAt`).
2. On every plan version persist, after local `generatePlanResults`, costs pass through `applyMarketBenchmarks` before `createMany` `PlanStageResult`.
3. `PlanVersion` records whether refinement ran (`refinementApplied`) and which benchmark snapshot (`benchmarkFetchedAt` = max/min `fetchedAt` used).
4. `GET /api/plans/[planId]/results` returns `refinementApplied`, `benchmarkAsOf`, `benchmarkSource` (Polish-safe string).
5. Plan UI shows disclaimer when refined (e.g. „Koszty doprecyzowane wg orientacyjnych indeksów rynkowych, stan na … — nie stanowią oferty.”).
6. If no benchmarks in DB → local costs only, `refinementApplied: false`, no user-visible error.
7. Owner can refresh benchmarks: `pnpm benchmarks:import` (reads bundled JSON or env-configured URL), **not** triggered by end users.

### Verification

- With multipliers ≠ 1.0, totals differ from pre-S-04 local-only run for same answers.
- `pnpm lint` / `pnpm build` pass each phase.
- Recalculate still completes within ≤100s on local DB.

## What We're NOT Doing

- Live HTTP calls to third-party sites during `POST /api/plans` or recalculate.
- LLM/agent browsing per user session.
- New questionnaire field (voivodeship) or per-user geography.
- Refining timeline `durationDays` (costs only).
- Automated Vercel cron / scheduled scrape (optional future; MVP = manual import).
- Binding quotes, contractor APIs, permit data.
- Changing local KB seed rates (benchmark layer is multiplicative overlay).

## Implementation Approach

Add a thin refinement layer between generation and persistence. Benchmarks are **read-only at runtime** (Prisma `findMany`). Import script is owner-operated. Clamp multipliers to prevent absurd swings. Document FR-009 interpretation in UI copy.

## Critical Implementation Details

- **Category join:** Map each `PlanStageResultInput` / stage slug → `ConstructionStage.category` via the loaded stages list (same query as generation). Missing benchmark for category → multiplier `1.0` (no-op).
- **Clamp:** `multiplier = clamp(row.multiplier, 0.85, 1.25)` unless product decides otherwise in implement — document in code constant.
- **Transaction:** Benchmark reads inside existing `persistPlanVersionWithResults` transaction are fine (short `findMany` on tiny table).
- **Migration gate:** Agent writes `schema.prisma` + `prisma/migrations/*`; **owner runs** `pnpm db:migrate` before integration testing.

## Phase 1: Benchmark model, migration & import

### Overview

Introduce `MarketBenchmark` and a way to populate it without touching the hot request path.

### Changes Required:

#### 1. Prisma model

**File**: `prisma/schema.prisma`

**Intent**: Persist cached market multipliers per stage category.

**Contract**: Model `MarketBenchmark`: `id`, `stageCategory` (String, unique, matches `ConstructionStage.category`), `multiplier` (Float), `sourceName` (String), `sourceUrl` (String?), `fetchedAt` (DateTime). Optional index on `stageCategory`.

#### 2. Migration

**File**: `prisma/migrations/<timestamp>_market_benchmark/migration.sql`

**Intent**: Versioned DDL for owner to apply.

**Contract**: Create table; no changes to existing domain tables yet (Phase 2 adds `PlanVersion` flags).

**Owner action (document in plan notes):** run `pnpm db:migrate` after review.

#### 3. Default benchmark seed

**Files**: `prisma/seed.ts` and/or `prisma/data/market-benchmarks.json`

**Intent**: Dev/staging always has benchmarks so refinement is testable without import.

**Contract**: Upsert rows for each distinct `category` used in construction stages — default `multiplier: 1.0`, `sourceName: "Wewnętrzna baza (MVP)"`, `fetchedAt: now`. Allows toggling test multipliers in JSON without code change.

#### 4. Import script

**File**: `scripts/import-market-benchmarks.ts` + `package.json` script `benchmarks:import`

**Intent**: Owner refreshes benchmarks from external snapshot (FR-009 operational path).

**Contract**: Read JSON file `prisma/data/market-benchmarks.json` (or path arg); upsert by `stageCategory`; set `fetchedAt` to import time. Optional: if `BENCHMARKS_JSON_URL` env set, fetch once then upsert (timeout 10s, fail with message). No import from Route Handlers.

#### 5. PlanVersion refinement flags (schema)

**File**: `prisma/schema.prisma` — extend `PlanVersion`

**Intent**: Record whether refinement affected this version.

**Contract**: `refinementApplied` Boolean `@default(false)`; `benchmarkFetchedAt` DateTime? (nullable); `benchmarkSourceName` String? (nullable summary for API).

Include in same migration as `MarketBenchmark`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes (after owner confirms migration applied — if not applied, note agent stops at integration per AGENTS.md)

#### Manual Verification:

- Owner ran `pnpm db:migrate` successfully
- `pnpm db:seed` or `pnpm benchmarks:import` leaves rows in `MarketBenchmark`
- Prisma Studio shows one row per category

**Implementation Note**: Pause until owner confirms migration before Phase 2 code that queries new tables.

---

## Phase 2: Refinement engine & persistence hook

### Overview

Apply benchmarks during plan version persist; fallback to local-only.

### Changes Required:

#### 1. Refinement module

**File**: `src/lib/plan-refinement/apply-market-benchmarks.ts` (new)

**Intent**: Pure function + async loader: local results + benchmarks → refined results.

**Contract**: `applyMarketBenchmarks(localResults, stages, benchmarks[]):` for each result, resolve category from stage slug, find benchmark, `estimatedCost = Math.round(localCost * clamp(multiplier))`. Return `{ results, refinementApplied, benchmarkFetchedAt, benchmarkSourceName }` metadata. If `benchmarks` empty → pass-through, `refinementApplied: false`.

#### 2. Persist integration

**File**: `src/lib/plan/persist-plan-version.ts`

**Intent**: Single hook for create and recalculate.

**Contract**: After `generatePlanResults`, `findMany` `MarketBenchmark`; call `applyMarketBenchmarks`; write refined costs to `PlanStageResult`; update `planVersion` with refinement flags.

#### 3. Store local cost (optional transparency)

**Decision:** MVP stores only refined cost in `estimatedCost` to avoid schema churn on `PlanStageResult`. If implementer adds `baseEstimatedCost` column in migration, optional — **default: omit** unless product wants side-by-side in API later.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes (requires migrated DB)

#### Manual Verification:

- Create plan with benchmark `STRUCTURE` multiplier 1.1 → structure stages ~10% higher vs multiplier 1.0
- Empty `MarketBenchmark` table → identical to pre-S-04 behavior
- Recalculate path applies same refinement

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: Results API, UI & E2E verification

### Overview

Expose refinement metadata to the client and set user expectations.

### Changes Required:

#### 1. Results DTO

**Files**: `src/lib/plan-results.ts`, `src/app/api/plans/[planId]/results/route.ts`

**Intent**: Client can show disclaimer when refinement applied.

**Contract**: Extend `PlanResultsDto` with `refinementApplied: boolean`, `benchmarkAsOf: string | null` (ISO date), `benchmarkSource: string | null`. Populate from latest `PlanVersion` flags.

#### 2. Plan page UI

**Files**: `src/components/plan/plan-cost-table.tsx` and/or `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Polish copy for orientacyjny refined estimate.

**Contract**: When `refinementApplied`, show muted alert/banner above table with date and source; extend existing disclaimer footnote. No binding-offer language beyond current disclaimer.

#### 3. Change notes

**File**: `context/changes/internet-refinement/change.md`

**Intent**: Document FR-009 MVP interpretation and owner import workflow.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Plan page shows refinement banner when benchmarks used
- Create + recalculate both show refined metadata
- Full path ≤100s with default seed benchmarks
- README or change notes mention `pnpm benchmarks:import`

**Implementation Note**: Final sign-off closes S-04.

---

## Testing Strategy

### Manual Testing Steps

1. Set `ENVELOPE` multiplier to `1.15` in JSON → import → create plan → envelope-related stages increase vs local-only baseline (temporarily set all to 1.0 for A/B).
2. Truncate `MarketBenchmark` → create plan → no banner, costs match old local engine.
3. Recalculate after import → new version flagged refined.
4. Check `GET` JSON fields match UI.
5. Regression: questionnaire validation, auth, S-05 edit flow unchanged.

### Owner-only commands

```bash
pnpm db:migrate          # after Phase 1 migration lands
pnpm db:seed             # includes default benchmarks
pnpm benchmarks:import   # refresh from prisma/data/market-benchmarks.json
```

## Performance Considerations

One extra `findMany` on small benchmark table + O(stages) multiply — negligible vs generation. Import script may use network; keep out of API.

## Migration Notes

Forward-only. Existing `PlanStageResult` rows are not backfilled; only new versions get refinement flags.

## References

- PRD FR-009: `context/foundation/prd.md`
- Shape-notes forward: `context/foundation/shape-notes.md` (local KB before internet)
- Infrastructure risks: `context/foundation/infrastructure.md`
- Generation: `src/lib/plan-generation/`, `src/lib/plan/persist-plan-version.ts`
- Roadmap S-04: `context/foundation/roadmap.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Benchmark model, migration & import

#### Automated

- [x] 1.1 `pnpm lint` passes
- [x] 1.2 `pnpm build` passes

#### Manual

- [x] 1.3 Owner applied `pnpm db:migrate`
- [x] 1.4 `MarketBenchmark` rows present after seed/import
- [x] 1.5 `pnpm benchmarks:import` upserts from JSON

### Phase 2: Refinement engine & persistence hook

#### Automated

- [ ] 2.1 `pnpm lint` passes
- [ ] 2.2 `pnpm build` passes

#### Manual

- [ ] 2.3 Multiplier ≠ 1.0 changes stage costs vs baseline
- [ ] 2.4 Empty benchmark table → local-only fallback
- [ ] 2.5 Recalculate applies refinement

### Phase 3: Results API, UI & E2E verification

#### Automated

- [ ] 3.1 `pnpm lint` passes
- [ ] 3.2 `pnpm build` passes

#### Manual

- [ ] 3.3 Plan UI shows refinement disclaimer when applied
- [ ] 3.4 GET results JSON includes refinement fields
- [ ] 3.5 End-to-end create/recalc ≤100s with benchmarks
