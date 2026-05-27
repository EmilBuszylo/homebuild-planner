# Internet refinement (S-04) — Plan Brief

> Full plan: `context/changes/internet-refinement/plan.md`

## What & Why

FR-009 requires refining orientacyjne estimates using external market data, while keeping the local knowledge base (S-02) as the anchor. Shape-notes and infrastructure research warn against live web scraping inside the ≤100s generate/recalculate request on Vercel — volatility and latency risk.

## Starting Point

- Generation: `generatePlanResults` + `persistPlanVersionWithResults` produce local `PlanStageResult` rows (S-02/S-05).
- GET results returns latest version costs; no external data layer exists.
- Questionnaire has no geography field; seed stages use categories (`STRUCTURE`, `ENVELOPE`, etc.).

## Desired End State

After create or recalculate, stage costs are **locally computed then adjusted** by cached market multipliers read from Postgres (`MarketBenchmark`). Plan page shows refined totals with a Polish disclaimer citing benchmark date/source. Owner refreshes benchmarks offline via `pnpm benchmarks:import` (not in user request path). If cache empty, behavior falls back to local-only (no failure).

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Complexity | MEDIUM–HIGH | New schema + refinement layer + import script; bounded by no live fetch in API | Plan |
| Internet in request path | **No** — read DB cache only | Meets FR-009 intent without blowing NFR/Vercel limits (`infrastructure.md` pre-mortem) | Plan |
| Benchmark storage | `MarketBenchmark` per `stageCategory` | Matches seed categories; few rows, easy seed/import | Plan |
| Adjustment formula | `refined = round(local × multiplier)` clamped e.g. 0.85–1.25 | Simple, explainable; local stays source of truth | Plan |
| Geography | National cache first (no new question) | Avoids questionnaire scope creep; regional later | Plan |
| Timeline | Unchanged in S-04 | FR-009 ambiguity; costs-only MVP reduces risk | Plan |
| Population | Owner script `pnpm benchmarks:import` + seed defaults | Agent-friendly; no Hobby cron dependency | Plan |
| Integration point | Inside `persistPlanVersionWithResults` after local generate | Every create/recalc gets same pipeline | Plan |
| UI | Disclaimer + `refinementApplied` / `benchmarkAsOf` on results | Sets orientacyjny expectations per PRD | Plan |

## Scope

**In scope:**

- Prisma `MarketBenchmark` + migration (owner applies)
- Seed/import path for multipliers + metadata (`sourceName`, `fetchedAt`)
- `applyMarketBenchmarks()` refinement module
- Hook in `persist-plan-version.ts`; flag on `PlanVersion`
- Extend `PlanResultsDto` + plan UI disclaimer

**Out of scope:**

- Live HTTP fetch during `POST /api/plans` or recalculate
- LLM browsing / scraping pipeline
- Voivodeship question + regional tables
- Timeline duration refinement
- S-06 rate limits
- Version history compare

## Architecture / Approach

```
generatePlanResults (local KB)
  → applyMarketBenchmarks (read MarketBenchmark by category)
  → persist PlanStageResult (refined costs)
  → GET results includes refinement metadata

Offline: pnpm benchmarks:import → upsert MarketBenchmark (optional external JSON/API)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Benchmark model & seed | Schema, migration SQL, default benchmarks, import script | Owner must run `pnpm db:migrate` |
| 2. Refinement engine | Apply multipliers in persist path; fallback if empty | Wrong category mapping → flat wrong adjust |
| 3. Results UX & verify | API fields, disclaimer, manual E2E | User thinks numbers are binding |

**Prerequisites:** S-03, S-05 (or at least S-02 generation on branch).

**Estimated effort:** ~3 sessions (schema owner gate + 2 implementation phases).

## Open Risks & Assumptions

- FR-009 “browsing” is satisfied MVP-wise by **periodically imported** market data, not per-user live browse — document in disclaimer.
- Benchmarks need credible placeholder values until owner wires a real source.
- Recalculate still must stay ≤100s (cache read is cheap).

## Success Criteria (Summary)

- Create/recalculate produces different totals when benchmark multipliers ≠ 1.0.
- Empty benchmark table → same as today (local only), no error.
- Plan page states orientacyjny charakter + benchmark date.
