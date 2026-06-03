---
date: 2026-06-02T14:00:00+02:00
researcher: Cursor Agent
git_commit: 0724c8ab2b0c3315d2e05285200808970e846e06
branch: master
repository: home-build-planner
topic: "Test-plan Risk #4 — generate plan path (empty/incomplete result without clear user error)"
tags: [research, codebase, test-plan, risk-4, plan-generation, api-plans, questionnaire]
status: complete
last_updated: 2026-06-02
last_updated_by: Cursor Agent
---

# Research: Test-plan Risk #4 — generate plan path

**Date**: 2026-06-02T14:00:00+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: `0724c8ab2b0c3315d2e05285200808970e846e06`  
**Branch**: `master`  
**Repository**: `home-build-planner` (EmilBuszylo/homebuild-planner)

## Research Question

Ground **test-plan Risk #4** (`context/foundation/test-plan.md` §2 row 4):

> Ścieżka „wygeneruj plan” kończy się pustym, niekompletnym lub niespójnym wynikiem bez czytelnego błędu dla użytkownika.

Verify response guidance (§2): prove non-empty cost estimate + timeline **or** explicit error; challenge “201/200 = correct plan”; avoid Playwright of full questionnaire; integration with mocks at DB/AI edge.

## Summary

Plan creation is **synchronous** `POST /api/plans` → `persistPlanVersionWithResults` → `generatePlanResults` → `planStageResult.createMany`. There is **no guard** that `stageResults.length > 0` before returning **201**. Empty generation (e.g. `filterStages` returning `[]`) still commits the transaction. The client treats **201/200/409+planId** as success and redirects to `/moj-plan/{id}` without checking results. Empty plans surface only on **GET `/api/plans/[planId]/results`** (**404** `"Brak wyników dla tego planu"`), shown as a full-page error — easy to read as “plan not found” rather than “generation produced nothing.” **Zero total cost** with non-empty stages is still **200 OK** and renders as a successful plan UI.

**No automated tests** cover `POST /api/plans`, recalculate, `persistPlanVersionWithResults`, or `generatePlanResults` (only adjacent Vitest: benchmarks refinement, recalc policy env, display sort).

**Recommended cheapest layer:** handler-level integration tests (Vitest calling route handlers or extracted `persistPlanVersionWithResults` with transaction test DB / Prisma test doubles) asserting `PlanStageResult` count and GET results contract — **not** Playwright (AGENTS.md + test-plan §7).

**Test-plan guidance #4 “Must challenge” is validated:** treating HTTP 201 as proof of a good plan would miss the primary failure mode.

## Detailed Findings

### Entry points (no Server Actions for generation)

| Entry | Role |
|-------|------|
| `POST /api/plans` | First plan: create `Plan` + version 1 + generate (`src/app/api/plans/route.ts:10-73`) |
| `POST /api/plans/[planId]/recalculate` | New version on edit (`src/app/api/plans/[planId]/recalculate/route.ts:15-103`) |
| `GET /api/plans/[planId]/results` | Read latest version; **does not generate** (`src/app/api/plans/[planId]/results/route.ts:13-86`) |

Auth uses Supabase `getUser()` in each route; domain writes use **Prisma** inside `$transaction` (aligns with `context/foundation/lessons.md`).

Client trigger: `QuestionnaireForm.onSubmit` → `fetch` POST (`src/components/questionnaire/questionnaire-form.tsx:115-189`). Last step button **„Zatwierdź”** (not literal “wygeneruj plan”) via `step-navigation.tsx`.

### Generation pipeline

```
POST body → questionnaireInputsSchema
  → persistPlanVersionWithResults (src/lib/plan/persist-plan-version.ts:10-67)
      → planVersion + questionnaireResponse rows
      → constructionStage.findMany
      → generatePlanResults (src/lib/plan-generation/generate-plan-results.ts:10-30)
      → applyMarketBenchmarks
      → planStageResult.createMany (no length check)
  → 201 { planId }
```

`filterStages` (`src/lib/plan-generation/stage-filter.ts:16-62`) can return `[]` when `starting_state` / `investment_state` missing or invalid order — **after** API Zod already enforced `starting_state < investment_state`, so empty output is more likely from **seed data** (no stages in range), **garage_gate** exclusion, or DB with zero `constructionStage` rows than from a typical valid questionnaire payload.

`computeStageCost` (`src/lib/plan-generation/compute-costs.ts`) can yield **0** per stage when `build_standard` missing or usable area ≤ 0 — stages still persisted; GET returns **200** with `totalCost: 0`.

### Risk #4 failure modes (observed in code)

| Mode | Mechanism | User-visible signal |
|------|-----------|---------------------|
| **Empty stages** | `createMany` with 0 rows; POST **201** | Redirect → GET **404** → `PlanPageError`: „Nie znaleziono planu lub brak wyników…” (`plan/[planId]/page.tsx:71-74`) |
| **Zero-cost “success”** | All `estimatedCost: 0` | Plan page renders table/strip with 0 PLN — looks successful |
| **409 existing plan** | Second `POST /api/plans` without recalc | Client redirects to old plan (`questionnaire-form.tsx:159-161`); message „Plan już istnieje” never shown; answers not applied |
| **500 swallowed** | Bare `catch` on POST | Generic PL error; no `details` (`route.ts:67-71`) |
| **400 on POST** | API returns `details` flatten | Client uses generic fallback (`questionnaire-form.tsx:181`) — field-level `details` not surfaced |

Empty-result detection is **read-time only** (`results/route.ts:44-48`), not write-time.

### Validation boundary

- `questionnaireFormSchema` — RHF only, no `.refine()` (`src/lib/validations/questionnaire.ts`, `lessons.md` cross-field rule).
- `questionnaireInputsSchema` — API + client pre-submit; `refine` for state order.
- Client and API both parse before POST — good for #6, but **does not** guarantee non-empty generation output.

### Timeouts / async

Full generation runs inside the POST transaction. No `maxDuration`, queue, or client `fetch` timeout. PRD ≤100s success metric is **not enforced** in code.

### Existing tests

| File | Covers |
|------|--------|
| `src/lib/plan-refinement/apply-market-benchmarks.test.ts` | Refinement after `generatePlanResults` |
| `src/lib/rate-limit/plan-recalc.test.ts` | Env policy only, not route |
| `src/lib/plan/sort-plan-stages-chronologically.test.ts` | Display sort on read DTO |

Nothing under `src/app/api/plans/` or `src/lib/plan-generation/`.

## Code References

- `src/app/api/plans/route.ts:50-66` — persist + return 201 without stage count check
- `src/lib/plan/persist-plan-version.ts:55-64` — `planStageResult.createMany` always runs
- `src/lib/plan-generation/stage-filter.ts:26-28` — empty array when states missing
- `src/app/api/plans/[planId]/results/route.ts:44-48` — empty `stageResults` → 404
- `src/components/questionnaire/questionnaire-form.tsx:154-161` — redirect on 201/200/409
- `src/app/(app)/plan/[planId]/page.tsx:71-74` — `not_found` copy
- `src/lib/api/fetch-plan-results.ts:36-46` — maps 404 to `not_found`

## Architecture Insights

1. **Write/read split for “success”:** POST answers “did we persist a plan row?” GET answers “are there stage results?” Risk #4 lives in the gap.
2. **Pure generation in `src/lib/plan-generation/`** — testable without HTTP; persistence glue in `persist-plan-version.ts` is the integration seam.
3. **One-plan-per-user** on create (`route.ts:38-44`) pushes duplicate submits to **409** + redirect — can look like success while ignoring new answers (related to Risk #5).
4. **Lessons:** API routes + Prisma for domain; questionnaire cross-field validation split (form vs API schema) — generation tests should use `questionnaireInputsSchema` payloads, not RHF-only schema.

## Test-plan response guidance — verified / adjusted

| Field | Test-plan | Research verdict |
|-------|-----------|------------------|
| What would prove protection | Non-empty kosztorys + timeline **or** jawny błąd | Add explicit assertion: **POST must not return success redirect contract when `stageResults.length === 0`**; or persist rolls back / returns 4xx/5xx with PL message at POST time |
| Must challenge | 200/201 = poprawny plan | **Confirmed** — primary gap |
| Likely cheapest layer | Integration (mock DB/AI) | **Confirmed** — prefer testing `persistPlanVersionWithResults` + route handler with seeded `constructionStage` + minimal valid `questionnaireInputsSchema` fixture; optional unit on `filterStages`/`generatePlanResults` for empty-edge inputs |
| Anti-pattern | Playwright całego kwestionariusza | **Confirmed** |

**Optional product fix (out of test scope but affects Risk #4):** fail POST when `localResults.length === 0` or return 422 with clear PL copy so user never hits misleading plan-page 404.

## Historical Context (from prior changes)

- `context/archive/2026-05-27-plan-generation/` — original generation slice; engine layout matches current `persistPlanVersionWithResults` pattern.
- `context/archive/2026-05-27-edit-and-recalculate/` — recalculate route + questionnaire edit mode.
- `context/archive/2026-05-27-first-plan-e2e/` — north-star path login → questionnaire → results (manual/navigation focus, not automated generate tests).
- `context/archive/2026-06-01-vitest-minimal-setup/` — Vitest wired; only `src/lib/` tests so far.

## Related Research

- `context/foundation/test-plan.md` — Risk #4, Phase 2 rollout row
- Future: `context/changes/testing-access-control-ownership/research.md` (Phase 1 — not created yet) for Risk #1 on same `GET .../results` ownership check

## Open Questions

1. **Fixture strategy:** integration tests need seeded `constructionStage` (+ modifiers) — use `prisma/seed.ts` data contract as oracle, or minimal inline fixture per test file? Owner must confirm DB available for integration tests in CI (today CI runs `pnpm test` only on unit files).
2. **Empty stages in production:** can real users hit `filterStages([])` with API-valid payloads given current seed, or is empty result only a “broken seed / migration” scenario?
3. **409 UX:** should duplicate `POST /api/plans` redirect to questionnaire edit + recalc instead of stale plan page? (Product, not test-only.)
4. **Phase 1 vs 2 ordering:** Risk #4 tests can proceed in parallel with ownership tests if auth is mocked/stubbed in handler tests; full integration may need both.

## Suggested test sub-phases (for `/10x-plan`)

1. **Golden-path integration:** minimal valid payload → `PlanStageResult.count >= 1` → GET results 200 with `stages.length >= 1` and `totalCost` from independent fixture math (not copied from implementation).
2. **Empty-generation regression:** force empty `filterStages` output (test-only stage set or inputs) → assert POST behavior (today: 201 + GET 404 — document as regression oracle until product fix).
3. **Client contract smoke (optional, light):** map `fetchPlanResults` `not_found` to expected PL string — no Playwright.
