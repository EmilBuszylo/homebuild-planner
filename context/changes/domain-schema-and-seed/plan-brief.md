# Domain Schema & Seed Knowledge Base — Plan Brief

> Full plan: `context/changes/domain-schema-and-seed/plan.md`

## What & Why

Define the Prisma domain schema for the home-build-planner and populate it with a researched construction knowledge base (stages, costs, durations). This is the F-02 foundation from the roadmap — it unblocks S-01 (questionnaire flow) and S-02 (plan generation) by providing the data model and seed data they need.

## Starting Point

The Prisma schema contains only `DbHealth` (a connectivity check). No domain models, no seed script, no domain TypeScript types exist. The Prisma Client singleton, auth validation schemas, and local Docker Postgres are all wired and working.

## Desired End State

The database has tables for questionnaire definitions, construction stages with cost/duration data, cost modifiers, and user plans with versioning. The knowledge base is populated with ~15–20 construction stages and 8 question definitions using 2025–2026 Polish market data. Shared Zod schemas and TypeScript types are available for downstream slices to import.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|---|---|---|---|
| Questionnaire model | Generic KV (QuestionDefinition + QuestionResponse) | Flexibility to add/modify questions without schema migrations — questions are data, not columns. | Plan |
| User linkage | String userId, app-level enforcement | Standard Supabase + Prisma pattern; avoids cross-schema FK fragility. | Plan |
| Stage dependencies | predecessorSlugs String[] array | Expresses real DAG without junction table overhead for ~20 rows. | Plan |
| Cost structure | Cost per m² by standard tier (3 columns) | Simple, maps directly to 3 build standards; final cost = rate × area. | Plan |
| Cost modifiers | StageCostModifier table | Data-driven adjustments (insulation, garage gate, etc.) without code changes. | Plan |
| Investment state filtering | completedByState enum on each stage | Captures the linear investment state progression; simple comparison filter. | Plan |
| Plan versioning | PlanVersion with versionNumber | Enables before/after comparison on recalculation (S-05); audit trail. | Plan |
| Question metadata | Rich — options JSONB + validation JSONB | S-01 can render questionnaire from DB alone without hardcoded enums. | Plan |
| Seed format | TypeScript via `prisma db seed` | Type-safe, idempotent with upsert, standard Prisma convention. | Plan |
| Seed accuracy | Researched 2025–2026 Polish market data | Credible "orientacyjne" output — useful but not binding. | Plan |
| Duration model | Min/max range in days per stage | Acknowledges uncertainty; S-02 can interpolate or use midpoint. | Plan |

## Scope

**In scope:**
- All domain models in `prisma/schema.prisma` (7 models, 4 enums)
- Migration SQL under `prisma/migrations/`
- TypeScript seed script (`prisma/seed.ts`) with knowledge-base data
- `db:seed` script in `package.json` + `tsx` devDependency
- Shared Zod schemas in `src/lib/validations/questionnaire.ts`
- Domain enum re-exports in `src/lib/types/domain.ts`

**Out of scope:**
- API routes (S-01, S-02)
- UI components (S-01)
- Cost calculation / generation logic (S-02)
- Internet data refinement (S-04)
- RLS policies, test suite

## Architecture / Approach

The schema splits into two layers: **knowledge-base** models (seeded, read-only at runtime: `QuestionDefinition`, `ConstructionStage`, `StageCostModifier`) and **user-data** models (written at runtime: `Plan`, `PlanVersion`, `QuestionnaireResponse`, `PlanStageResult`). The generic KV questionnaire model decouples question definitions from the schema — adding a question is a seed insert, not a migration. Cost modifiers are a separate table enabling data-driven adjustments per stage per questionnaire input without code changes.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Prisma Schema | All domain models + migration | Owner must run `migrate dev` — agent cannot |
| 2. Seed Script | Knowledge base populated with market data | Cost/duration values need research accuracy |
| 3. Shared Types | Zod schemas + enum re-exports | Must stay in sync with Prisma enums |

**Prerequisites:** F-01 (Supabase Auth wiring) — done. Local Postgres running (`pnpm db:docker:up`).
**Estimated effort:** ~1–2 sessions across 3 phases.

## Open Risks & Assumptions

- Seed cost values are approximate (orientacyjne) — they will need iteration after the north star (S-03) when real users provide feedback.
- The generic KV model trades type safety for flexibility — app-layer validation (Zod) compensates, but DB can't enforce value types natively.
- Investment state progression is assumed strictly linear (FROM_SCRATCH → ... → DEVELOPER). If a non-linear case surfaces, the filtering logic must change.

## Success Criteria (Summary)

- `pnpm db:migrate` applies cleanly; all tables visible in Prisma Studio.
- `pnpm db:seed` populates ~15–20 stages, 8 questions, and modifiers with realistic PLN values.
- `pnpm build:ci` passes with all new models and shared types compiling.
