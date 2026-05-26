<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Domain Schema & Seed Knowledge Base

- **Plan**: context/changes/domain-schema-and-seed/plan.md
- **Scope**: All phases (1–3 of 3)
- **Date**: 2026-05-26
- **Verdict**: NEEDS ATTENTION
- **Findings**: 1 critical  2 warnings  2 observations

## Verdicts

| Dimension | Verdict |
|---|---|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Seed modifier collision: findFirst can't distinguish same-trigger modifiers

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: prisma/seed.ts:684-712
- **Detail**: seedModifiers() uses findFirst({stageId, triggerQuestionSlug, triggerValue}) to detect existing rows for upsert. Multiple modifiers share the same triplet: windows_doors + build_standard + ECONOMY (window 1200 AND door 2500), same for STANDARD and PREMIUM, and windows_doors + has_terrace_doors + true (3 entries: 3000, 8000, 15000). On first seed run 12 modifiers in 4 collision groups produce only 4 rows (last-write-wins). Window per-unit pricing is lost; only 1 of 3 terrace door variants survives.
- **Fix A ⭐ Recommended**: Add description to the findFirst lookup so each modifier is uniquely identified.
  - Strength: Minimal change — one extra field in the where clause.
  - Tradeoff: Ties idempotency to description text; edit creates duplicate.
  - Confidence: HIGH — description is unique per modifier entry.
  - Blind spot: None significant.
- **Fix B**: Add a slug/key field to StageCostModifier and use it as upsert discriminator.
  - Strength: Clean, DB-enforced uniqueness. Future-proof.
  - Tradeoff: Schema change + migration + owner-only migrate dev.
  - Confidence: HIGH — follows slug pattern of other seed models.
  - Blind spot: Requires naming convention for modifier slugs.
- **Decision**: FIXED (Fix A — added description to findFirst where clause)

### F2 — FK field ordering violates lesson in 4 of 5 models

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: prisma/schema.prisma:84-96, 125-136, 138-147, 149-161
- **Detail**: Lesson requires relation first, FK scalar below. Only Plan (L114-115) follows. StageCostModifier (stageId L86, stage L93), PlanVersion (planId L127, plan L131), QuestionnaireResponse (planVersionId L140, planVersion L144), PlanStageResult (planVersionId L152, planVersion L158) all place FK above relation.
- **Fix**: Reorder each model so @relation line comes first, FK scalar directly below. Run prisma format after.
- **Decision**: FIXED — reordered FK fields in StageCostModifier, PlanVersion, QuestionnaireResponse, PlanStageResult

### F3 — QuestionnaireResponse type name exported from two modules

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/validations/questionnaire.ts:66 and src/lib/types/domain.ts:14
- **Detail**: Both modules export QuestionnaireResponse. Zod version is {questionSlug, value}. Prisma re-export is the full DB model. Import collision when S-01/S-02 use both.
- **Fix**: Rename Zod type to QuestionnaireResponseInput in questionnaire.ts.
- **Decision**: FIXED — renamed to QuestionnaireResponseInput

### F4 — Plan.userId upgraded to proper User relation (positive drift)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: prisma/schema.prisma:114
- **Detail**: Plan specified "userId String — no DB FK". Implementation uses proper relation to User (F-01b). Stronger than planned. No action needed.
- **Decision**: ACKNOWLEDGED

### F5 — 11 questions seeded instead of planned 8

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: prisma/seed.ts:108-137
- **Detail**: 3 extra questions (window_count, exterior_door_count, has_terrace_doors) added per owner request for unit-based pricing. Zod schema includes all 11. No action needed.
- **Decision**: ACKNOWLEDGED
