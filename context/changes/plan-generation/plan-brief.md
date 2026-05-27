# Plan generation (S-02) — Plan Brief

> Full plan: `context/changes/plan-generation/plan.md`

## What & Why

After the questionnaire (S-01/S-01b), the product must deliver its core value: an orientacyjny stage cost breakdown and construction timeline derived from the local knowledge base (FR-008), presented clearly to the user (FR-006). Today answers are saved but no costs or schedule are computed.

## Starting Point

`POST /api/plans` persists `PlanVersion` + `QuestionnaireResponse` only. `PlanStageResult` exists in Prisma but is empty. Seed data defines stages, `completedByState`, predecessors, and modifiers (`[PERCENT:N]`, `[PER_UNIT:slug]`). The plan page at `/moj-plan/[id]` is a placeholder.

## Desired End State

Submitting the questionnaire atomically generates and stores per-stage costs and timeline offsets, then the user sees a functional results page: cost table (integer PLN, total + disclaimer) and a timeline anchored to their `key_date`. Reads go through `GET /api/plans/[planId]/results`; generation runs inside the POST transaction.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| When to generate | Inside `POST /api/plans` transaction | Results exist before redirect; atomic create+generate | Plan |
| Results layout | Stacked table then timeline | Matches PRD dual output; easy to scan costs first | Plan |
| Target cap | Exclude `completedByState > target`; null stages only at `DEVELOPER` | Partial targets avoid full-house finishing costs | Plan |
| Cost display | Single integer PLN per stage | Orientacyjny MVP simplicity | Plan |
| Garage | Omit `garage_gate` when `garage_spots = 0` | Matches seed intent | Plan |
| Duration | Midpoint of min/max days | Stable sequential schedule | Plan |
| Scheduling | Topological predecessors, sequential days | Respects seed DAG without parallel trades | Plan |
| `[PERCENT:N]` | Recompute % from user's `build_standard` base | Correct for STANDARD/PREMIUM tiers | Plan |
| POST failure | Full transaction rollback | No orphan plans without results | Plan |
| Read path | `GET /api/plans/[planId]/results` | Aligns with lessons.md for domain reads | Plan |
| Rounding | Whole PLN | Clean orientacyjne display | Plan |
| Summary | Total + Polish disclaimer | Sets non-binding expectations | Plan |
| Timeline dates | Calendar labels from `key_date` + `startDay` | User connects plan to real schedule | Plan |
| Modifiers | Sum all matching triggers per stage | Matches stacked seed modifiers | Plan |
| S-02 UI scope | Functional results page | Verifiable FR-006 before S-03 polish | Plan |

## Scope

**In scope:**

- `src/lib/plan-generation/` engine (filter, costs, timeline)
- POST integration + `PlanStageResult` persistence
- `GET /api/plans/[planId]/results`
- Plan page UI (table, timeline, total, disclaimer)

**Out of scope:**

- Recalculation / new plan versions (S-05), internet refinement (S-04), calendar export, stage notes
- Parallel scheduling, cost/duration ranges
- Schema migrations (none expected)

## Architecture / Approach

```
Questionnaire POST → [tx: save responses → load KB → generatePlanResults → createMany PlanStageResult]
Plan page (RSC) → fetch GET /api/plans/:id/results (cookies) → PlanCostTable + PlanTimeline
```

Engine is pure logic over loaded Prisma entities; API layer owns auth and persistence.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Generation engine | Filter, cost, schedule modules | Target/null `completedByState` edge cases |
| 2. API & persistence | POST generates rows; GET exposes DTO | Transaction failure handling / cookie fetch base URL |
| 3. Results UI | Table + calendar timeline | RSC→API cookie forwarding in dev/prod |

**Prerequisites:** S-01, S-01b done; F-02 seed applied (`pnpm db:seed` — owner).

**Estimated effort:** ~3 implementation sessions (one per phase), after-hours MVP scale.

## Open Risks & Assumptions

- Existing plans created before S-02 have no results; MVP relies on 409 single-plan flow — no backfill.
- `windows_doors` zero base cost relies entirely on modifiers; wrong triggers produce 0 PLN stage.
- RSC calling own API needs reliable absolute base URL in local and Vercel environments.
- `completedByState: null` only at `DEVELOPER` is a product rule not enforced in DB — engine must implement exactly.

## Success Criteria (Summary)

- User submits questionnaire and sees stage costs + timeline on `/moj-plan/[id]` without manual DB steps.
- Stage list respects `starting_state`, `investment_state`, and garage count.
- `pnpm build` / `pnpm lint` pass; generation stays well under 100s NFR.
