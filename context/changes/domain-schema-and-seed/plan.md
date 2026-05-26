# Domain Schema & Seed Knowledge Base — Implementation Plan

## Overview

Design the Prisma domain schema for the home-build-planner (questionnaire definitions, construction stages, cost structure, user plans) and populate the knowledge base with researched 2025–2026 Polish construction market data via a TypeScript seed script. Also export shared Zod schemas and TypeScript types so downstream slices (S-01 questionnaire, S-02 generation) get validated domain types out of the box.

## Current State Analysis

The Prisma schema contains only a `DbHealth` model used for connectivity checks. No domain models, no seed infrastructure, and no domain TypeScript types exist. The Prisma Client singleton (`src/lib/prisma.ts`) and auth validation schemas (`src/lib/validations/auth.ts`) establish patterns to follow.

## Desired End State

After this plan is complete:

- `prisma/schema.prisma` defines all domain models: `QuestionDefinition`, `ConstructionStage`, `StageCostModifier`, `Plan`, `PlanVersion`, `QuestionnaireResponse`, `PlanStageResult`.
- Running `pnpm db:migrate` applies a clean migration creating all tables and enums.
- Running `pnpm db:seed` populates the knowledge base: ~15–20 construction stages, 8 question definitions, and stage cost modifiers — all with researched 2025–2026 PLN values.
- `src/lib/validations/questionnaire.ts` exports Zod schemas and TypeScript types for the questionnaire domain.
- `pnpm build:ci` passes with the new schema and types.

### Key Discoveries:

- `prisma/schema.prisma:1-16` — Only `DbHealth` model exists; all domain models are net-new.
- `src/lib/prisma.ts:1-16` — Singleton pattern established; domain queries will use this instance.
- `src/lib/validations/auth.ts` — Pattern for Zod schemas with Polish messages; domain schemas follow the same convention.
- `package.json:13` — `db:migrate` script exists (owner-only); no `db:seed` script yet.
- Business Logic (PRD) defines 8 questionnaire inputs: stan inwestycji, ocieplenie, standard, metraż, kluczowa data, kondygnacje, poddasze, garaż.
- Lessons.md: "Version database schema in repo with Prisma" and "Local Prisma migrate dev is owner-only" — both directly applicable.

## What We're NOT Doing

- **No API routes** — CRUD endpoints come in S-01 and S-02.
- **No UI components** — questionnaire rendering is S-01's scope.
- **No generation logic** — cost calculation and timeline algorithms are S-02's scope.
- **No internet data refinement** — that's S-04.
- **No RLS policies** — access control is handled at the app layer via middleware + userId filtering.
- **No test suite** — no test runner is configured yet; tests are out of scope unless requested.

## Implementation Approach

Three sequential phases, each with an owner-verification gate:

1. **Schema first** — define all models and enums in `schema.prisma`. The owner runs `migrate dev` to create the migration and apply it.
2. **Seed second** — create a TypeScript seed script using Prisma Client, wire it into `package.json`, and populate the knowledge base. The owner runs `db seed`.
3. **Types last** — export shared Zod schemas and TypeScript types derived from the domain. Verify with `prisma generate` + `build:ci`.

This ordering ensures each phase builds on a verified foundation: schema is applied before seed data is inserted, and types are exported after the Prisma Client is regenerated with the new models.

## Critical Implementation Details

### Investment state progression

The `InvestmentState` enum represents what the user has already built. Stages are filtered out when the user's state is at or past the point where that stage would be completed. The enum ordering is:

```
FROM_SCRATCH → FOUNDATIONS → OPEN_SHELL → CLOSED_SHELL → DEVELOPER
```

Each `ConstructionStage` carries a `completedByState` field (nullable `InvestmentState`). A stage is **included** in the plan when `userState < stage.completedByState` (using enum ordering). A `null` value means the stage is always needed regardless of investment state (e.g., painting, flooring).

### User linkage without cross-schema FK

Domain models reference Supabase Auth users via a plain `String` `userId` column (storing the Supabase `auth.users.id` UUID). No database-level foreign key to `auth.users` — referential integrity is enforced at the application layer by reading the session. This is the standard Supabase + Prisma pattern; it avoids cross-schema FK fragility.

---

## Phase 1: Prisma Schema — Domain Models

### Overview

Add all domain models and enums to `prisma/schema.prisma`. This phase produces a migration file that the owner applies.

### Changes Required:

#### 1. Domain Enums

**File**: `prisma/schema.prisma`

**Intent**: Define four enums that model the core domain dimensions: investment state progression, construction standard tiers, insulation levels, and questionnaire question types.

**Contract**:

- `InvestmentState` enum: `FROM_SCRATCH`, `FOUNDATIONS`, `OPEN_SHELL`, `CLOSED_SHELL`, `DEVELOPER`
- `BuildStandard` enum: `ECONOMY`, `STANDARD`, `PREMIUM`
- `InsulationLevel` enum: `STANDARD`, `ENHANCED`, `PASSIVE`
- `QuestionType` enum: `TEXT`, `NUMBER`, `DATE`, `SINGLE_CHOICE`, `BOOLEAN`

#### 2. Knowledge-Base Models (Seeded, Read-Only at Runtime)

**File**: `prisma/schema.prisma`

**Intent**: Define the three seed-populated models that represent the construction knowledge base: question definitions, construction stages, and per-stage cost modifiers.

**Contract**:

`QuestionDefinition` — Defines each questionnaire input:
- `id` String PK (cuid)
- `slug` String unique — stable key used in responses (e.g., `"investment_state"`, `"area"`)
- `label` String — Polish display label
- `type` QuestionType enum
- `required` Boolean
- `sortOrder` Int
- `options` Json? — for SINGLE_CHOICE: array of `{value: string, label: string}`
- `validation` Json? — constraints: `{min?, max?}` for NUMBER, etc.
- `unit` String? — display unit (e.g., `"m²"`, `"szt."`)

`ConstructionStage` — Defines a construction phase in the knowledge base:
- `id` String PK (cuid)
- `slug` String unique — stable key (e.g., `"foundations"`, `"walls"`)
- `name` String — Polish display name
- `description` String? — short explanation
- `category` String — grouping label (e.g., `"STRUCTURE"`, `"INSTALLATIONS"`, `"FINISHING"`)
- `sortOrder` Int
- `completedByState` InvestmentState? — nullable; the investment state at which this stage is already done. `null` = always needed.
- `predecessorSlugs` String[] — slugs of stages that must finish before this one starts
- `costPerM2Economy` Float — PLN/m² for economy standard
- `costPerM2Standard` Float — PLN/m² for standard
- `costPerM2Premium` Float — PLN/m² for premium
- `durationMinDays` Int — minimum duration
- `durationMaxDays` Int — maximum duration
- Relations: `costModifiers` → StageCostModifier[]

`StageCostModifier` — Per-stage cost adjustments triggered by specific questionnaire answers:
- `id` String PK (cuid)
- `stageId` String FK → ConstructionStage
- `triggerQuestionSlug` String — which question triggers this modifier
- `triggerValue` String — the answer value that activates it
- `costAdjustmentPerM2` Float default 0 — additional PLN/m²
- `fixedCostAdjustment` Float default 0 — fixed PLN addition
- `description` String? — human-readable explanation (e.g., "Brama garażowa — pasywna")
- Relations: `stage` → ConstructionStage

#### 3. User-Data Models

**File**: `prisma/schema.prisma`

**Intent**: Define the models that store user-generated data: plans, versioned snapshots, questionnaire responses, and generated stage results.

**Contract**:

`Plan` — A user's construction plan (one per project):
- `id` String PK (cuid)
- `userId` String — Supabase Auth UUID (no DB FK, app-level enforcement)
- `name` String? — optional user-given name
- `createdAt` DateTime default now()
- `updatedAt` DateTime @updatedAt
- Relations: `versions` → PlanVersion[]
- Index on `userId`

`PlanVersion` — A snapshot of questionnaire answers + generated results:
- `id` String PK (cuid)
- `planId` String FK → Plan
- `versionNumber` Int
- `createdAt` DateTime default now()
- Relations: `plan` → Plan, `responses` → QuestionnaireResponse[], `stageResults` → PlanStageResult[]
- Unique constraint on `(planId, versionNumber)`

`QuestionnaireResponse` — A single answer within a plan version:
- `id` String PK (cuid)
- `planVersionId` String FK → PlanVersion
- `questionSlug` String — matches QuestionDefinition.slug (app-level validation)
- `value` String — stored as string, parsed per question type at app layer
- Relations: `planVersion` → PlanVersion
- Unique constraint on `(planVersionId, questionSlug)`

`PlanStageResult` — A generated cost/timeline entry for one stage within a plan version:
- `id` String PK (cuid)
- `planVersionId` String FK → PlanVersion
- `stageSlug` String — matches ConstructionStage.slug
- `estimatedCost` Float — calculated PLN amount
- `startDay` Int — day offset from plan start date
- `durationDays` Int — estimated duration for this specific plan
- `sortOrder` Int — display order
- Relations: `planVersion` → PlanVersion

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` completes without errors
- `pnpm build:ci` passes (Prisma Client types are valid)

#### Manual Verification:

- Owner runs `pnpm db:migrate` — migration applies cleanly, creates all tables and enums
- Owner runs `pnpm db:studio` — all tables are visible with correct columns and relations

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the migration was applied successfully before proceeding to Phase 2.

---

## Phase 2: Seed Script & Construction Knowledge Base

### Overview

Create a TypeScript seed script that populates the knowledge base with researched 2025–2026 Polish construction market data: ~15–20 construction stages, 8 question definitions, and stage-specific cost modifiers.

### Changes Required:

#### 1. Seed Script Infrastructure

**File**: `prisma/seed.ts`

**Intent**: Create the seed entry point using Prisma Client. Use `upsert` operations keyed on `slug` to make the script idempotent — safe to re-run after data updates.

**Contract**: The script imports `PrismaClient`, calls seed functions for each knowledge-base model in order (questions first, then stages, then modifiers), and handles errors with a clean exit. Uses `upsert` with `slug` as the unique key for `QuestionDefinition` and `ConstructionStage`, and a compound lookup for `StageCostModifier`.

#### 2. Seed Tooling

**File**: `package.json`

**Intent**: Add `tsx` as a devDependency for running TypeScript seed files, and configure Prisma's seed command.

**Contract**: Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to `package.json`. Add `"db:seed": "prisma db seed"` to the scripts section. Add `tsx` to devDependencies.

#### 3. Question Definitions Seed Data

**File**: `prisma/seed.ts`

**Intent**: Seed the 8 questionnaire inputs defined in PRD Business Logic, with Polish labels, correct types, options for enum questions, and validation constraints.

**Contract**: The 8 questions to seed (slugs and types):

| slug | type | required | notes |
|---|---|---|---|
| `investment_state` | SINGLE_CHOICE | yes | options: FROM_SCRATCH, FOUNDATIONS, OPEN_SHELL, CLOSED_SHELL, DEVELOPER with Polish labels |
| `insulation_level` | SINGLE_CHOICE | yes | options: STANDARD, ENHANCED, PASSIVE |
| `build_standard` | SINGLE_CHOICE | yes | options: ECONOMY, STANDARD, PREMIUM |
| `area` | NUMBER | yes | validation: {min: 50, max: 500}, unit: "m²" |
| `key_date` | DATE | yes | the planned construction start date |
| `floors` | NUMBER | yes | validation: {min: 1, max: 3} |
| `has_attic` | BOOLEAN | no | default rendering as toggle |
| `garage_spots` | NUMBER | no | validation: {min: 0, max: 3}, unit: "szt." |

#### 4. Construction Stages Seed Data

**File**: `prisma/seed.ts`

**Intent**: Seed the construction stages knowledge base with researched 2025–2026 Polish market data. Each stage has cost-per-m² by standard tier, duration range, dependency predecessors, and the investment state filter.

**Contract**: The implementer should research and populate approximately 15–20 stages covering the full construction lifecycle. Required stage groups:

**Structure** (completedByState varies):
- Fundamenty (foundations) — completedByState: FOUNDATIONS
- Ściany nośne (load-bearing walls) — completedByState: OPEN_SHELL
- Stropy i nadproża (floor slabs & lintels) — completedByState: OPEN_SHELL
- Konstrukcja dachu (roof structure) — completedByState: OPEN_SHELL
- Pokrycie dachu (roof covering) — completedByState: CLOSED_SHELL
- Okna i drzwi zewnętrzne (windows & exterior doors) — completedByState: CLOSED_SHELL

**Installations** (completedByState: DEVELOPER or null):
- Instalacja elektryczna – stan surowy (electrical rough-in)
- Instalacja wodno-kanalizacyjna (plumbing rough-in)
- Instalacja centralnego ogrzewania (heating system)

**Envelope** (completedByState: null — always needed in some form):
- Ocieplenie (insulation/thermal envelope)
- Elewacja (facade)

**Interior finishing** (completedByState: null):
- Tynki wewnętrzne (interior plaster)
- Wylewki podłogowe (floor screeds)
- Podłogi i posadzki (flooring)
- Malowanie (painting)
- Biały montaż (bathroom fixtures)
- Drzwi wewnętrzne (interior doors)

**Optional/conditional:**
- Brama garażowa (garage gate) — only when garage_spots > 0

Cost values should reflect 2025–2026 Polish market ranges (PLN per m² of usable floor area). Use web research for current approximate rates. These are orientacyjne values — directionally correct, not binding quotes.

Duration ranges (min/max days) should reflect typical timeframes for a ~120–150 m² single-family house.

#### 5. Cost Modifiers Seed Data

**File**: `prisma/seed.ts`

**Intent**: Seed the `StageCostModifier` entries for input-specific cost adjustments. Key modifiers based on user's domain knowledge:

**Contract**: At minimum, seed modifiers for:

- **Insulation level → ocieplenie stage**: PASSIVE adds significant cost/m² vs STANDARD; ENHANCED is in between.
- **Insulation level → brama garażowa**: PASSIVE ~13k PLN, STANDARD ~10k PLN, no-insulation ~7k PLN (fixed cost adjustments, not per-m²).
- **Insulation level → okna**: passive-grade windows cost more per m².
- **has_attic → stropy**: usable attic increases floor slab complexity/cost.
- **floors > 1 → ściany, stropy**: multi-story adds to structural costs.

The implementer should identify other natural modifier candidates during seed data research.

### Success Criteria:

#### Automated Verification:

- `pnpm build:ci` passes
- TypeScript compilation of `prisma/seed.ts` succeeds (no type errors)

#### Manual Verification:

- Owner runs `pnpm db:seed` — script completes without errors
- Owner runs `pnpm db:studio` — QuestionDefinition has 8 rows, ConstructionStage has ~15–20 rows, StageCostModifier has the expected modifier entries
- Spot-check: cost values are in a realistic PLN range (e.g., foundations 250–600 PLN/m² depending on standard)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the seed ran successfully before proceeding to Phase 3.

---

## Phase 3: Shared Domain Types & Validation Schemas

### Overview

Export Zod schemas and TypeScript types for the questionnaire domain so S-01 (form rendering) and S-02 (generation) get validated types without duplicating definitions.

### Changes Required:

#### 1. Questionnaire Domain Types

**File**: `src/lib/validations/questionnaire.ts`

**Intent**: Define Zod schemas and TypeScript types for questionnaire inputs, mirroring the enums and constraints from the Prisma schema and seed data. These are the app-layer validation schemas that S-01 forms and S-02 generation logic will use.

**Contract**: Export:

- `investmentStateSchema` — Zod enum matching `InvestmentState`
- `buildStandardSchema` — Zod enum matching `BuildStandard`
- `insulationLevelSchema` — Zod enum matching `InsulationLevel`
- `questionnaireResponseSchema` — Zod schema for a single response `{questionSlug: string, value: string}`
- `questionnaireInputsSchema` — Zod object with all 8 typed fields (convenience schema for when S-02 needs to parse the full set of responses into a typed object for calculation)
- Corresponding TypeScript types via `z.infer<>`

Polish validation messages, following the pattern in `src/lib/validations/auth.ts`.

#### 2. Domain Enum Re-exports

**File**: `src/lib/types/domain.ts`

**Intent**: Re-export Prisma-generated enums and create lightweight TypeScript types for domain concepts that don't need Zod validation (e.g., plan summary shapes for API responses).

**Contract**: Re-export `InvestmentState`, `BuildStandard`, `InsulationLevel`, `QuestionType` from `@prisma/client`. Define utility types as needed (e.g., `PlanSummary`, `StageEstimate`) that S-01 and S-02 will use for API payloads.

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` completes without errors
- `pnpm build:ci` passes — all new files compile, no type errors
- `pnpm lint` passes

#### Manual Verification:

- Verify that importing `questionnaireInputsSchema` from a hypothetical test file type-checks correctly
- Confirm enums from `@/lib/types/domain` match Prisma schema enums

**Implementation Note**: This phase has no manual DB steps — all verification is automated.

---

## Testing Strategy

### Unit Tests:

- No test runner configured yet — no unit tests in this change.

### Integration Tests:

- Not in scope. Seed idempotency verified manually by running `pnpm db:seed` twice.

### Manual Testing Steps:

1. Owner starts local Postgres: `pnpm db:docker:up`
2. Owner applies migration: `pnpm db:migrate`
3. Owner runs seed: `pnpm db:seed`
4. Owner opens studio: `pnpm db:studio` — verify all tables, rows, and relations
5. Owner re-runs seed: `pnpm db:seed` — verify idempotency (no errors, same row count)
6. Verify `pnpm build:ci` passes with all new types

## Performance Considerations

- Seed data is small (~50 rows total) — no performance concerns.
- `predecessorSlugs` String[] is denormalized but avoids joins for a ~20-row table.
- `userId` index on `Plan` ensures efficient lookups by user.

## Migration Notes

- This is the first domain migration — no existing data to preserve.
- Migration is purely additive (`CREATE TABLE`, `CREATE TYPE`); no destructive changes.
- `DbHealth` table remains untouched.
- The seed script uses `upsert` — safe to re-run after updating cost data.

## References

- PRD Business Logic: `context/foundation/prd.md` (lines 109–115)
- Shape Notes — seed idea: `context/foundation/shape-notes.md` (lines 47–49)
- Roadmap F-02: `context/foundation/roadmap.md` (lines 75–87)
- Lessons — Prisma schema in repo: `context/foundation/lessons.md` (lines 19–24)
- Lessons — migrate dev owner-only: `context/foundation/lessons.md` (lines 26–31)
- Existing Prisma singleton: `src/lib/prisma.ts`
- Auth validation pattern: `src/lib/validations/auth.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Prisma Schema — Domain Models

#### Automated

- [x] 1.1 `pnpm db:generate` completes without errors
- [x] 1.2 `pnpm build:ci` passes

#### Manual

- [x] 1.3 Owner runs `pnpm db:migrate` — migration applies cleanly
- [x] 1.4 Owner verifies tables in `pnpm db:studio`

### Phase 2: Seed Script & Construction Knowledge Base

#### Automated

- [x] 2.1 `pnpm build:ci` passes
- [x] 2.2 TypeScript compilation of `prisma/seed.ts` succeeds

#### Manual

- [x] 2.3 Owner runs `pnpm db:seed` — completes without errors
- [x] 2.4 Owner verifies row counts in `pnpm db:studio`
- [x] 2.5 Owner re-runs `pnpm db:seed` — idempotency verified

### Phase 3: Shared Domain Types & Validation Schemas

#### Automated

- [ ] 3.1 `pnpm db:generate` completes without errors
- [ ] 3.2 `pnpm build:ci` passes
- [ ] 3.3 `pnpm lint` passes

#### Manual

- [ ] 3.4 Verify enum re-exports match Prisma schema
