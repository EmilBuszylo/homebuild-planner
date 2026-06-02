---
date: 2026-06-02T16:00:00+02:00
researcher: Cursor Agent
git_commit: 0724c8ab2b0c3315d2e05285200808970e846e06
branch: master
repository: home-build-planner
topic: "Test rollout Phase 1 — access control, plan ownership (Risk #1, #2, #6)"
tags: [research, codebase, test-plan, idor, auth, validation, api-plans]
status: complete
last_updated: 2026-06-02
last_updated_by: Cursor Agent
---

# Research: Access control & ownership (Phase 1)

**Date**: 2026-06-02T16:00:00+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: `0724c8ab2b0c3315d2e05285200808970e846e06`  
**Branch**: `master`  
**Repository**: home-build-planner

## Research Question

Ground test-plan **Phase 1** risks from `context/foundation/test-plan.md`:

- **#1** — logged-in user must not see another user’s plan via URL/API with foreign `planId`
- **#2** — protected app routes require session; auth layer must not silently break access
- **#6** — server must reject invalid questionnaire payloads (not trust client/RHF only)

Verify response guidance; locate anchors for `/10x-plan`; recommend cheapest test layers.

## Summary

**Ownership (#1) is enforced in exactly two API handlers** — `GET .../results` and `POST .../recalculate` — via `plan.userId !== user.id` → **404** `"Nie znaleziono planu"` (no response body with plan data). The plan **RSC page does not query Prisma for ownership**; it delegates to `fetchPlanResults` → same API. `POST /api/plans` always binds new plans to `user.id` (no `planId` in path). There is **no automated test** for IDOR today.

**Auth (#2)** uses **middleware** (`getSession`) for Polish/English app paths (`/panel`, `/ankieta`, `/moj-plan`, …) and **`getUser()`** in RSC pages + all plan API routes. **`/api/*` is not middleware-gated**; handlers return **401** when `getUser()` is null. `(app)/layout.tsx` does **not** redirect unauthenticated users — reliance on middleware + per-page redirects. **No E2E/auth integration tests** exist.

**Validation (#6)** — both write routes parse body with **`questionnaireInputsSchema`** (includes cross-field `refine`); invalid input → **400** before any plan write. **RHF uses `questionnaireFormSchema` without refine** (per `lessons.md`). **No unit tests** on `questionnaireInputsSchema`. Bypassing UI with direct POST is the abuse surface to test.

**Cheapest test stack:** (1) **unit** — `questionnaireInputsSchema` matrix in `src/lib/validations/`; (2) **integration** — import route handlers, mock `createClient` + Prisma, assert status/body and no `planStageResult` on 400.

## Detailed Findings

### Risk #1 — Plan IDOR / ownership

#### Data model

- `Plan.userId` FK to `User.id` (`prisma/schema.prisma:123-134`)
- One plan per user on create (`findFirst` before create in `src/app/api/plans/route.ts:38-44`)

#### Enforcement points (only these check `userId`)

| Handler | Check | On failure | Lines |
|---------|-------|------------|-------|
| `GET /api/plans/[planId]/results` | `!plan \|\| plan.userId !== user.id` | 404 `{ error: "Nie znaleziono planu" }` | `results/route.ts:39-40` |
| `POST /api/plans/[planId]/recalculate` | same | 404 same message | `recalculate/route.ts:42-43` |

After check passes, results route loads `stageResults` and returns full DTO (`results/route.ts:75-85`). **No leak path** for foreign IDs if check is correct.

#### UI / RSC path

```53:69:src/app/(app)/plan/[planId]/page.tsx
export default async function PlanPage({ params }: PlanPageProps) {
  const { planId } = await params;
  // ...
  if (!user) {
    redirect(routes.login);
  }

  const result = await fetchPlanResults(planId);

  if (result.status === "unauthorized") {
    redirect(routes.login);
  }

  if (result.status === "not_found") {
    return (
      <PlanPageError message="Nie znaleziono planu lub brak wyników do wyświetlenia." />
```

- `fetchPlanResults` forwards request **cookies** to internal API (`fetch-plan-results.ts:25-34`)
- **404** maps to `not_found` — same UX for wrong owner, missing plan, and empty stage results (Phase 2 Risk #4 overlap)

#### Gaps / test implications

| Topic | Finding |
|-------|---------|
| Status code | **404** not **403** — intentional obfuscation; test plan allows both |
| Enumeration | Non-existent UUID vs other user’s plan → same 404 JSON — good |
| `POST /api/plans` | Cannot target another user’s `planId` (no param) |
| Missing check | **No other** `userId` comparisons in `src/` — grep-complete |
| Product risk | User Q1 fear is valid regression class; **code today looks correct** but untested |

**What would prove protection (verified design):**

- User A session + User B `planId` → GET results **404**, body without stages; POST recalculate **404**, no new `PlanVersion`
- User A + own `planId` → GET **200** with `stages.length > 0` (fixture-dependent)

**Anti-pattern confirmed:** test only happy path with own ID.

---

### Risk #2 — Auth on protected routes

#### Middleware (`src/middleware.ts`)

- `updateSession` refreshes Supabase cookies (`lib/supabase/middleware.ts:31`)
- **Gate uses `getSession()`** (`middleware.ts:12-14`), not `getUser()`
- **Protected prefixes:** `/dashboard`, `/panel`, `/questionnaire`, `/ankieta`, `/plan`, `/moj-plan` (`middleware.ts:6-20`)
- **Auth pages** redirect to dashboard if session exists (`middleware.ts:23-26`)
- **Matcher** excludes static assets (`middleware.ts:31-34`)

Polish URLs (`/moj-plan/:id`, `/ankieta`) match **before** rewrite to `/plan/:id` (`next.config.ts:10`).

#### RSC / layout

| Location | Behavior |
|----------|----------|
| `(app)/dashboard/page.tsx` | `!authUser` → `redirect(routes.login)` (`:33-36`) |
| `(app)/questionnaire/page.tsx` | same (`:22-25`) |
| `(app)/plan/[planId]/page.tsx` | same (`:61-62`) |
| `(app)/layout.tsx` | **No redirect** — loads header even if `user` null (`:10-23`) |

#### API routes (not in `PROTECTED_PREFIXES`)

All plan handlers:

```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
}
```

Files: `plans/route.ts:16-17`, `results/route.ts:21-22`, `recalculate/route.ts:23-24`.

Client questionnaire `fetch` handles **401** → login redirect (`questionnaire-form.tsx:149-151`).

#### Session vs user (must challenge)

- Middleware: **`getSession()`**
- API + RSC: **`getUser()`** (JWT validation)

Supabase SSR pattern often uses session in middleware for refresh; **regression class** from interview Q2 (middleware refactor) is plausible. Tests should not assume `getSession()` presence implies `getUser()` success on API.

#### Other routes

- `GET /api/health/db` — **no auth** (`health/db/route.ts:7-17`) — DB ping only, no plan PII

**Cheapest layer:** integration tests on route handlers with mocked Supabase (no Playwright for full panel per test-plan §7). Optional **manual smoke checklist** after middleware edits: cookie refresh, `/moj-plan` while logged in, API 401 without cookie.

---

### Risk #6 — Server questionnaire validation

#### Schema split (`lessons.md` + code)

| Schema | `.refine()` | Used where |
|--------|-------------|------------|
| `questionnaireFormSchema` | No | RHF resolver (`questionnaire-form.tsx:56`) |
| `questionnaireInputsSchema` | Yes (start &lt; target) | `POST /api/plans`, `POST .../recalculate` (`route.ts:21`, `recalculate/route.ts:28`) |

#### API order (recalculate example)

1. `getUser()` → 401  
2. `questionnaireInputsSchema.safeParse(body)` → 400 + `details` flatten  
3. `plan.findUnique` + `userId` check → 404  
4. Transaction (persist)

Invalid body on **foreign** `planId` returns **400** (validation runs before ownership) — does not leak existence via 404 vs 400 for invalid payloads.

#### `POST /api/plans` on invalid input

- Parse failure → **400**, transaction **not** entered (`route.ts:23-27`)
- No orphan `Plan` row

#### Client vs server parity gaps

| Issue | Detail |
|-------|--------|
| 400 `details` | API returns flatten; client shows generic message (`questionnaire-form.tsx:181`) — UX only |
| Optional numeric defaults | Zod `.default()` on form schema — omitted keys in JSON may still parse |
| Extra JSON keys | Stripped by Zod object parse — not a security issue |

**No `questionnaire*.test.ts`** — highest ROI **unit** tests: invalid types, out-of-range area, `starting_state` ≥ `investment_state`, missing `key_date`, malformed date.

**Integration:** POST with invalid body + mock auth → 400; assert `prisma.plan.count` unchanged (mock transaction).

---

## Code References

- `src/app/api/plans/[planId]/results/route.ts:25-48` — ownership + empty results guard
- `src/app/api/plans/[planId]/recalculate/route.ts:27-44` — parse then ownership
- `src/app/api/plans/route.ts:10-27` — auth + validation before create
- `src/middleware.ts:6-28` — protected path prefixes
- `src/lib/validations/questionnaire.ts:62-119` — form vs inputs schema
- `src/lib/api/fetch-plan-results.ts:22-49` — server-side API client with cookies
- `src/components/questionnaire/questionnaire-form.tsx:118-133` — client `inputsSchema` pre-submit

## Architecture Insights

1. **Single enforcement layer for plan data:** Prisma API routes — no Supabase RLS on domain tables (lessons: Prisma in handlers).
2. **Plan page is a thin client of GET results** — IDOR tests can target API only; optional one RSC test for cookie forwarding.
3. **404 as universal denial** — simplifies privacy, complicates debugging (empty results vs foreign plan).
4. **Vitest** (`vitest.config.mts`) — `node` env, `src/**/*.test.ts` only; no MSW/handler test harness yet.

## Test-plan response guidance — verified

| Risk | Verdict |
|------|---------|
| #1 | Integration on `results` + `recalculate` with two mocked users required; 404 + no stage payload is correct oracle |
| #2 | Handler 401 tests + document middleware/RSC split; avoid full-panel E2E |
| #6 | Unit on `questionnaireInputsSchema` first; integration 400 + no DB write second |

**Cross-link:** `context/changes/testing-generation-recalc-integrity/research.md` — Risk #4 empty results also surfaces as plan page `not_found`; ownership tests should use payloads that yield **non-empty** `stageResults` when testing happy path.

## Historical Context

- `context/archive/2025-05-25-supabase-auth-wiring/` — auth + middleware baseline
- `context/archive/2026-05-27-edit-and-recalculate/` — recalculate route introduced
- `context/foundation/lessons.md` — questionnaire schema split (critical for #6 tests)

## Related Research

- `context/changes/testing-generation-recalc-integrity/research.md` — generate path, empty results UX (overlaps `not_found` messaging)

## Open Questions

1. **Handler test harness:** mock `@/lib/supabase/server` + `@/lib/prisma` vs Docker Postgres + seed for CI? (Owner decision for integration in CI.)
2. **403 vs 404:** keep 404 obfuscation or align with test-plan “403/404” wording in assertions either way?
3. **`getSession` vs `getUser`:** add one integration test documenting expected behavior when session cookie present but JWT invalid?
4. **Health route:** leave unauthenticated or protect in later hardening slice?

## Suggested `/10x-plan` sub-phases

1. **1.1** — Unit: `questionnaireInputsSchema` invalid matrix (+ golden valid fixture from seed/requirements).  
2. **1.2** — Integration: `GET .../results` + `POST .../recalculate` ownership (user A / user B / missing plan).  
3. **1.3** — Integration: unauthenticated → **401** on all three plan routes.  
4. **1.4** — Integration: `POST /api/plans` invalid body → **400**, no `Plan` created (mocked prisma).  
5. **1.5** — Manual smoke doc (or checklist in plan): middleware change → `/panel`, `/moj-plan`, cookie refresh.  
6. **1.6** — Update `context/foundation/test-plan.md` §6.2 cookbook stub (ownership denial pattern) when implementing.
