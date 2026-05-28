<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Questionnaire Flow

- **Plan**: context/changes/questionnaire-flow/plan.md
- **Scope**: All Phases (1-3 of 3)
- **Date**: 2026-05-26
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|---|---|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Race condition: duplicate plans possible

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/api/plans/route.ts:29-38
- **Detail**: The "one plan per user" check (findFirst) ran outside the Prisma transaction. Two concurrent POST requests could both pass the check and create duplicate plans. No @@unique([userId]) constraint on Plan.
- **Fix A ⭐ Recommended**: Move findFirst inside the transaction. Serializes the read+write within the tx boundary.
  - Strength: Minimal code change; transaction serializes the read+write.
  - Tradeoff: Slightly longer transaction hold time.
  - Confidence: HIGH — standard pattern for check-then-create.
  - Blind spot: Without @@unique([userId]) on Plan, full DB-level enforcement requires a migration.
- **Fix B**: Accept risk for MVP.
  - Strength: Zero code change; submit button already disabled.
  - Tradeoff: Orphan plan if triggered.
  - Confidence: HIGH — single-user MVP.
  - Blind spot: None.
- **Decision**: FIXED via Fix A — findFirst moved inside $transaction

### F2 — Missing try/catch around Prisma transaction

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/api/plans/route.ts:40-67
- **Detail**: The Prisma $transaction was unwrapped. If it throws, Next.js returns a 500 with non-JSON body. Existing api/health/db route uses try/catch.
- **Fix**: Wrap the transaction in try/catch, return JSON 500 with Polish error message.
- **Decision**: FIXED

### F3 — Defensive user upsert added (positive drift)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: src/app/api/plans/route.ts:30-34
- **Detail**: Not in the plan, but needed at runtime for pre-F-01b users lacking a Prisma User row. Safe and correct inside the transaction.
- **Decision**: ACKNOWLEDGED

### F4 — Unplanned dev utility (reset-plans)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: prisma/reset-plans.ts, package.json
- **Detail**: Dev-only script requested by user during testing. Does not affect production.
- **Decision**: ACKNOWLEDGED

### F5 — Form submit bug required button type fix

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: src/components/questionnaire/questionnaire-form.tsx:86, src/components/questionnaire/step-navigation.tsx
- **Detail**: Plan specified type="submit" for Zatwierdź button but browser implicit submission caused auto-submit on step transition. Fixed by making all buttons type="button" and calling handleSubmit programmatically.
- **Decision**: ACKNOWLEDGED
