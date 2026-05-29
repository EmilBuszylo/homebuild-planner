<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Internet refinement (S-04)

- **Plan**: context/archive/2026-05-27-internet-refinement/plan.md
- **Scope**: Full plan (Phases 1–3)
- **Date**: 2026-05-28
- **Verdict**: APPROVED
- **Findings**: 0 critical, 1 warning, 2 observations

> Change is **archived** (`context/archive/2026-05-27-internet-refinement/`). This review does not modify archived `plan.md` Progress.

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Import script does not validate benchmark rows

- **Severity**: WARNING
- **Impact**: MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: scripts/import-market-benchmarks.ts:36-57
- **Detail**: `JSON.parse` rows are upserted without schema validation. A malformed `multiplier` (non-number) becomes `NaN` in DB; `applyMarketBenchmarks` can propagate `NaN` costs via `Math.round(local * NaN)`.
- **Fix**: Validate rows with Zod (or `Number.isFinite`) before upsert; reject file on invalid multipliers.
  - Strength: Fail-fast at owner import time, not at user plan generation.
  - Tradeoff: Small script addition; owner-only path.
  - Confidence: HIGH — standard pattern elsewhere in repo (`questionnaireInputsSchema`).
  - Blind spot: None significant.
- **Decision**: FIXED (Zod validation before upsert)

### F2 — No unit tests for refinement pure logic

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria / Pattern Consistency
- **Location**: src/lib/plan-refinement/apply-market-benchmarks.ts
- **Detail**: Plan phases pass lint/build; no `*.test.*` for clamp, empty benchmarks, category join, or `refinementApplied` when all multipliers are 1.0. Health-check already flagged repo-wide test gap.
- **Fix**: Add Vitest tests for `applyMarketBenchmarks` (3–4 cases).
- **Decision**: SKIPPED — deferred to Post-MVP reliability / test stack slice (user)

### F3 — `BENCHMARKS_JSON_URL` not documented in `.env.example`

- **Severity**: OBSERVATION
- **Impact**: LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: .env.example
- **Detail**: Phase 1 contract documents optional URL fetch; change notes mention it; `.env.example` has no commented `BENCHMARKS_JSON_URL`.
- **Fix**: Add commented env line next to DB vars.
- **Decision**: FIXED

## Plan drift summary (manual)

| Planned item | Verdict | Notes |
|--------------|---------|-------|
| `MarketBenchmark` + migration + seed/import | MATCH | `f6229d5`, migration `20260527143000_market_benchmark` |
| `applyMarketBenchmarks` + persist hook | MATCH | `70a3e97`, single integration in `persist-plan-version.ts` |
| No live HTTP in API path | MATCH | Only `findMany` at runtime |
| Results DTO + GET fields | MATCH | `02a741a` |
| UI banner + disclaimer | MATCH | `plan-cost-table.tsx` |
| `refinementApplied` only when costs change | MATCH* | Sensible UX; plan text also allows “no benchmarks → false” |
| No `baseEstimatedCost` column | MATCH | Per plan optional omission |
| No timeline refinement | MATCH | Unchanged |

## Success criteria verification

| Check | Result |
|-------|--------|
| `pnpm lint` | PASS (re-run 2026-05-28) |
| `pnpm build:ci` | PASS (verified during implementation) |
| Manual 1.3–3.5 | Marked `[x]` in archived plan; user confirmed testing in session |

## Commits reviewed

`f6229d5` → `02a741a` (+ epilogue `1c9586d`), feature branch merged to `master`.

## Summary

Implementation faithfully delivers S-04/FR-009: cached benchmarks, multiplicative overlay after local generation, metadata on `PlanVersion` and results API, Polish UI disclaimer, owner-operated import. Architecture matches infrastructure guidance (no live fetch in serverless hot path). One worthwhile hardening: validate import JSON before upsert. Tests would reduce regression risk for pure refinement logic.
