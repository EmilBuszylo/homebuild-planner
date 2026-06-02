# Access control & ownership tests — Plan Brief

> Full plan: `context/changes/testing-access-control-ownership/plan.md`  
> Research: `context/changes/testing-access-control-ownership/research.md`  
> Test plan: `context/foundation/test-plan.md` (Phase 1)

## What & Why

Rollout **Phase 1** adds automated protection for the user’s top fear: seeing another user’s plan via URL, plus auth and server-side questionnaire validation. Today ownership checks exist in two API routes but have **zero tests**; invalid API payloads are rejected in code but untested.

## Starting Point

- Vitest runs `src/**/*.test.ts` in CI (`pnpm test`).
- Ownership: `plan.userId !== user.id` → **404** on `GET .../results` and `POST .../recalculate` only.
- API auth: `getUser()` → **401**; middleware protects pages, not `/api/*`.
- Schemas: `questionnaireInputsSchema` on API; `questionnaireFormSchema` on RHF (no `.refine()` on form).

## Desired End State

- Unit matrix proves `questionnaireInputsSchema` rejects bypass payloads (Risk #6).
- Integration-style handler tests prove foreign `planId` → **404** without stage data (Risk #1), no user → **401** on all plan routes (Risk #2), invalid create → **400** without `Plan` write.
- `context/foundation/test-plan.md` §6.2 documents the ownership-denial pattern.
- Manual smoke checklist for middleware/session regressions (no Playwright).

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Test harness | `vi.mock` Supabase + Prisma; call route handlers directly | No live DB in CI; fast; matches sparse suite | Research |
| IDOR assertion | Expect **404** + no `stages` in body | Matches production obfuscation | Research |
| Happy-path ownership | Mock plan owned by caller + non-empty `stageResults` in GET mock | Avoid conflating with Phase 2 empty-results | Research |
| Middleware | Manual checklist only | Cost × signal; API 401 covers handler contract | Test-plan §7 |
| E2E | None | AGENTS + interview Q5 | Test-plan |

## Scope

**In scope:** Risks #1, #2, #6; Vitest unit + handler tests; §6.2 cookbook stub; manual smoke list in change folder.

**Out of scope:** Playwright; `checkPlanRecalcLimit` DB logic; Risk #4 empty generation; changing 404→403; protecting `/api/health/db`.

## Architecture / Approach

```
valid/invalid payloads → questionnaireInputsSchema (unit)
                    ↓
mocked getUser + prisma → import POST/GET handlers → assert status + body
                    ↓
final phase → test-plan §6.2 cookbook + MANUAL-SMOKE.md
```

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Schema unit tests | Invalid/valid matrix for API schema | Oracle copied from implementation |
| 2. Test harness | Shared mocks, fixtures, helper to invoke routes | Over-mocking hides real Prisma query bugs |
| 3. Ownership + 401 | IDOR + unauthenticated on 3 routes | Mock drift from handler order |
| 4. Invalid create | POST `/api/plans` 400, no transaction | — |
| 5. Cookbook + smoke | §6.2 + manual checklist | — |

**Prerequisites:** `pnpm test` already green on `master`.  
**Estimated effort:** ~2–3 focused sessions (5 phases).

## Open Risks & Assumptions

- Mocks may not catch a future handler that skips `userId` check — mitigated by asserting mock call args where cheap.
- Session vs `getUser` mismatch not automated (documented in manual smoke).

## Success Criteria (Summary)

- `pnpm test` and CI pass with new tests.
- Foreign `planId` cannot read stage payload in tests.
- Invalid questionnaire POST never enters create transaction in tests.
