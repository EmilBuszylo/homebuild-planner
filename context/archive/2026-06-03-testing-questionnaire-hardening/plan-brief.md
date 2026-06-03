# Questionnaire hot-spot hardening — Plan Brief

> Full plan: `context/changes/testing-questionnaire-hardening/plan.md`  
> Test plan: `context/foundation/test-plan.md` (Phase 3)

## What & Why

Rollout **Phase 3** hardens the high-churn questionnaire path: answers must stay valid from UI rules through API validation through generation. Risks **#6** (server rejects bad payloads; client cannot be the only gate) and cross **#4** (questionnaire output still produces a non-empty generation signal) need tests without Playwright.

## Starting Point

- Phase 1: `questionnaire-inputs.test.ts` (6 cases) + handler **400** on invalid `POST /api/plans` only.
- Phase 2: generation/recalc handler tests; golden `validQuestionnairePayload` fixture.
- UI: `questionnaireFormSchema` (no refine) for RHF; `questionnaireInputsSchema` for submit/API; `investment-state.ts` filters options; `responsesToQuestionnaireInputs` re-validates stored rows.
- **No** `investment-state.test.ts`, **no** `responses-to-inputs.test.ts`, **no** recalculate **400** handler test.

## Desired End State

- Unit tests lock `investment-state` helpers and schema edge cases independent of handlers.
- Round-trip test proves stored golden rows → `QuestionnaireInputs` → non-empty `generatePlanResults` (cross **#4** at lib boundary).
- Handler tests prove **400** on invalid `POST .../recalculate` (parity with create).
- `MANUAL-SMOKE.md` documents step-1 state matrix per `lessons.md`.
- `test-plan.md` §3 row 3 **planned** → **complete** after ship; §6.6 Phase 3 note added.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| E2E | None | test-plan §7; server/lib tests cover signal | Test-plan |
| UI component tests | None | AGENTS.md; RHF refine pitfall covered by lib + manual | Lessons + Plan |
| Cross #4 layer | Lib pipeline unit (payload → map → generate) | Cheaper than duplicating full POST; Phase 2 already covers HTTP create | Plan |
| State UI contract | `investment-state` unit + manual matrix | Avoid extracting `filterStateQuestionOptions` unless tests need it | Lessons |
| DB in CI | Mocks only | Consistent with Phases 1–2 | Archive |

## Scope

**In scope:** Risks #6 (expanded unit + recalc handler 400), cross #4 (lib pipeline oracle), manual smoke for step 1 states, test-plan §6.6 note.

**Out of scope:** Playwright; changing Zod/RHF split; new product validation rules; Risk #3/5/7 (Phase 2); middleware automation; testing every questionnaire field in UI.

## Architecture / Approach

```
QuestionnaireInputs (golden fixture)
  → questionnaireInputsSchema (API gate — extend unit tests)
  → toQuestionnaireResponsesMap → generatePlanResults (cross #4 oracle)
  → POST /api/plans|recalculate (handler 400 parity — recalc added)
```

`investment-state.ts` tested in isolation — same helpers `step-content.tsx` uses to filter radio options.

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Investment-state unit | Allowed state pairs, strict `<` rule | #6 UI/server drift |
| 2. Schema + stored responses | More Zod cases; `responsesToQuestionnaireInputs` | #6 |
| 3. Questionnaire → generation | Golden payload → non-empty engine results | cross #4 |
| 4. Recalc handler 400 | Invalid body → 400, no `$transaction` | #6 |
| 5. Manual smoke + cookbook | `MANUAL-SMOKE.md`, test-plan §6.6 | #2 (manual only) |

**Prerequisites:** Phases 1–2 test rollouts archived; `pnpm test` green.  
**Estimated effort:** ~2 sessions, 5 phases.

## Open Risks & Assumptions

- Manual step-1 matrix not automated — acceptable per lessons.md and test-plan §7.
- Lib pipeline cross #4 does not prove browser submit wiring; Phase 2 handler tests cover HTTP after valid JSON.

## Success Criteria (Summary)

- `pnpm test` / `pnpm lint` pass with new colocated tests.
- Invalid recalculate body returns **400** before transaction.
- Golden questionnaire data yields ≥1 generated stage in unit pipeline test.
