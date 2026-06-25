<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Cost Calibration (S-01)

- **Plan**: context/changes/cost-calibration/plan.md
- **Scope**: Full plan (Phases 1–4)
- **Date**: 2026-06-08
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 5 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | PASS |
| Architecture | WARNING |
| Pattern Consistency | WARNING |
| Success Criteria | WARNING |

## Findings

### F1 — Golden total below original SDW band (4 997 PLN/m²)

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: context/changes/cost-calibration/calibration-rates.md:118-119
- **Detail**: Plan Desired End State and Phase 1.2 require golden **5 000–6 500 PLN/m²**. After owner epilogs (plumbing −10%, heating −15%), workbook documents **599 650 PLN / 4 997 PLN/m²** — slightly below 5k. Progress 1.2 remains `[x]`. Workbook notes S-05 przyłącza may lift totals for some users.
- **Fix A ⭐ Recommended**: Accept documented epilog + update plan Desired End State / 1.2 note to “~4 950–6 500 after epilogs; S-05 may restore ≥5k”
  - Strength: Preserves owner-validated plumbing/heating realism without re-tuning 18 stages.
  - Tradeoff: Original north-star band wording becomes stale.
  - Confidence: HIGH — epilogs were explicit owner decisions.
  - Blind spot: Owner manual 2.4/4.2 not confirmed on live DB.
- **Fix B**: Bump one low-impact stage (e.g. +50 PLN/m² on `painting`) to cross 5 000/m² exactly
  - Strength: Restores literal plan band without large CO/plumbing rework.
  - Tradeoff: Arbitrary tweak; re-sync seed, fixture, oracle, workbook.
  - Confidence: MED — cosmetic alignment only.
  - Blind spot: May re-inflate stages owner just lowered.
- **Decision**: FIXED via Fix A (plan Desired End State + Progress 1.2)

### F2 — `research.md` stale golden figures

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: context/changes/cost-calibration/research.md (resolved Q#1, recommended next step)
- **Detail**: Still cites **5 050 PLN/m² / 606 040 PLN** and “→ phase 2”. Current workbook: **4 997 / 599 650**; phases 1–4 implemented.
- **Fix**: Update resolved questions and recommended next step to match workbook epilog + archive/S-05 handoff.
- **Decision**: FIXED

### F3 — Triple rate/modifier maintenance without parity guard

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Architecture
- **Location**: prisma/seed.ts; src/lib/plan-generation/test-fixtures/full-stages-calibration.ts; calibration-modifier-defs.ts
- **Detail**: 18 stage rates + 31 modifiers duplicated in seed and test fixtures. Oracle tests pass today but nothing enforces seed ↔ fixture parity (plan forbids importing seed in Vitest).
- **Fix A ⭐ Recommended**: Add `calibration-rates-parity.test.ts` that diffs exported JSON constants shared by seed script + fixtures (or a one-off `pnpm` script in CI)
  - Strength: Catches drift on next rate edit without coupling test to Prisma seed runtime.
  - Tradeoff: One more artifact to maintain.
  - Confidence: MED — needs design choice (JSON vs codegen).
  - Blind spot: Haven't scoped CI integration.
- **Fix B**: Document “edit workbook → seed → 3 fixture files” checklist in calibration-rates.md only
  - Strength: Zero code now.
  - Tradeoff: Human error likely on next calibration.
  - Confidence: LOW for long-term safety.
  - Blind spot: None.
- **Decision**: FIXED via Fix A (`calibration-seed-parity.test.ts` + `parse-seed-calibration.ts`)

### F4 — Stale comment on `minimal-stages.ts`

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/plan-generation/test-fixtures/minimal-stages.ts:6-8
- **Detail**: Comment claims rates align with `prisma/seed.ts` but foundations/walls are pre-calibration (690/500). Plan Phase 3 allows keeping minimal fixture for directional tests only.
- **Fix**: Replace comment with “directional-only; calibrated oracle uses `fullStagesForCalibration`”.
- **Decision**: FIXED

### F5 — Oracle tests skip `applyMarketBenchmarks` layer

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Reliability
- **Location**: src/lib/plan-generation/generate-plan-results.test.ts; persist path in production
- **Detail**: Oracle asserts pre-benchmark costs. Production applies category multipliers from DB. Safe while all multipliers are 1.0; regresses if benchmarks diverge again.
- **Fix**: Document invariant in `calibrated-golden-expectations.ts` + optional test that `market-benchmarks.json` rows are all 1.0 (contract test).
- **Decision**: FIXED

### F6 — Out-of-plan `roadmap.md` S-05 slice

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: context/foundation/roadmap.md
- **Detail**: S-05 `utility-connections` added in commit `09a7ac1` with plumbing epilog — not in S-01 plan scope but logically coupled.
- **Fix**: Treat as accepted scope expansion; no S-01 code change required. Reference in plan epilogue or archive notes.
- **Decision**: FIXED (plan Epilog section)

### F7 — Manual gates 2.4 and 4.2 still open

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Success Criteria
- **Location**: context/changes/cost-calibration/plan.md Progress
- **Detail**: `change.md` status is `implemented` but owner smoke (db:seed + UI sum ~600k) not checked off. E2E and unit oracle green.
- **Fix**: Owner completes 2.4/4.2 before `/10x-archive`; do not mark implemented→archived until confirmed.
- **Decision**: FIXED (archive blocker noted in change.md)

### F8 — Redundant ±2% band after exact total assertion

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/plan-generation/generate-plan-results.test.ts:106-114
- **Detail**: `expect(total).toBe(CALIBRATED_GOLDEN_TOTAL)` makes min/max band assertion tautological in same test.
- **Fix**: Keep band only in `questionnaire-pipeline.test.ts`; drop redundant band in generate-plan-results test.
- **Decision**: FIXED
