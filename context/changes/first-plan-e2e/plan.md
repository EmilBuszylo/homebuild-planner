# First plan e2e (S-03) Implementation Plan

## Overview

Integrate existing auth, questionnaire, generation, and results into a discoverable north-star journey: minimal public entry, consistent Polish post-login URLs, a smart `/panel` hub, shared app header, and targeted loading/error polish. Verify end-to-end manually and record a follow-up roadmap slice for a full marketing landing.

## Current State Analysis

- **Questionnaire → results pipeline works** when URLs are known: `POST /api/plans` generates `PlanStageResult` in one transaction; client redirects to `routes.plan(planId)`; plan page renders `PlanCostTable` + `PlanTimeline` via `fetchPlanResults` (`src/components/questionnaire/questionnaire-form.tsx`, `src/app/(app)/plan/[planId]/page.tsx`).
- **Panel is a dead end** — email + sign-out only (`src/app/(app)/dashboard/page.tsx`).
- **Home is scaffold** — no product CTAs (`src/app/page.tsx`).
- **URL inconsistency** — `login`/`register` actions and middleware redirect to `/dashboard`; UI uses `routes.dashboard` → `/panel` (`src/app/(auth)/actions.ts:49,108`, `src/middleware.ts:24`).
- **`routes.questionnaire`** defined but unused (`src/lib/routes.ts`).
- **S-02 UI** was intentionally functional; polish and flow ownership move to S-03 (`context/changes/plan-generation/plan-brief.md`).

### Key Discoveries:

- Middleware already protects both `/panel` and `/dashboard` prefixes — fixing redirects does not require new protection rules.
- Questionnaire page already redirects existing plan holders to results (`src/app/(app)/questionnaire/page.tsx`) — panel is the missing discovery layer for return visits.
- `fetchPlanResults` collapses all non-OK responses to `null` — plan page cannot distinguish 404 from 500 today (`src/lib/api/fetch-plan-results.ts:30-32`).

## Desired End State

**First-time user path (no manual URLs):**

1. Visit `/` — sees minimal Polish product intro + links to `/logowanie` and `/rejestracja`.
2. Register or log in — browser lands on `/panel` (Polish path).
3. Panel shows primary CTA **„Rozpocznij ankietę”** → `/ankieta`.
4. Complete questionnaire → submit → `/moj-plan/:id` with cost table, timeline, total, disclaimer.
5. Generation completes within ≤100s NFR.

**Returning user with a plan:**

1. Log in → `/panel` shows **„Zobacz kosztorys i harmonogram”** (and optional one-line context, e.g. plan creation date) → existing `/moj-plan/:id`.
2. Visiting `/ankieta` still redirects to plan (unchanged).

**Cross-cutting:**

- `(app)` routes share a minimal header (link to panel, sign-out).
- Plan route shows loading UI while fetching; 404 shows „Plan nie został znaleziony”; other failures show a distinct generic error (not the same copy as 404).
- Root layout metadata reflects the product name in Polish.
- `context/foundation/roadmap.md` includes a **proposed** follow-up slice `marketing-landing` for a full marketing page (out of S-03 implementation).

### Verification

- Manual north-star script in **Testing Strategy** passes on desktop and spot-check mobile.
- `pnpm lint` and `pnpm build` pass after each phase.

## What We're NOT Doing

- DEVELOPER target pricing calibration (deferred from S-02).
- Full marketing landing (hero sections, feature grid) — roadmap slice only.
- Questionnaire edit / recalculate (S-05), internet refinement (S-04), calendar export, stage notes.
- Changing generation rules, POST contract, or Prisma schema.
- Automated E2E test framework (repo has none).
- Informative message on 409 / existing-plan redirect (user chose silent redirect).
- Backfill of `PlanStageResult` for plans created before S-02.

## Implementation Approach

Three vertical phases: (1) public entry + auth URL cohesion, (2) smart panel as navigation hub, (3) app shell + plan polish + roadmap doc + manual verification. Reuse `routes.ts` for every user-facing link and redirect target. Keep business logic in existing API/RSC patterns per `lessons.md`.

## Phase 1: Entry & auth cohesion

### Overview

Replace the scaffold home page, align post-auth redirects with Polish `/panel`, and set product metadata.

### Changes Required:

#### 1. Minimal home page

**File**: `src/app/page.tsx`

**Intent**: Give unauthenticated visitors a clear entry into the product without building a full marketing site.

**Contract**: Polish copy (product name, one-sentence value prop orientacyjny kosztorys + harmonogram); primary button → `routes.login`, secondary → `routes.register`; use shadcn `Button` + existing layout/Tailwind patterns; remove Next.js template assets/links. Optional: if session exists (server `getUser()`), `redirect(routes.dashboard)` so logged-in users skip the promo page.

#### 2. Auth redirect targets

**File**: `src/app/(auth)/actions.ts`

**Intent**: After successful login/register, land on the same URL the rest of the app links to.

**Contract**: Replace `redirect("/dashboard")` with `redirect(routes.dashboard)`; import `routes` from `@/lib/routes`.

#### 3. Middleware authed-auth redirect

**File**: `src/middleware.ts`

**Intent**: Logged-in users hitting `/logowanie` or `/rejestracja` see `/panel` in the address bar.

**Contract**: Replace `new URL("/dashboard", ...)` with `new URL(routes.dashboard, ...)` (import `routes` or literal `/panel` consistent with `routes.dashboard`).

#### 4. Root metadata

**File**: `src/app/layout.tsx`

**Intent**: Browser tab and SEO reflect the product, not Create Next App.

**Contract**: `metadata.title` and `metadata.description` in Polish for home-build-planner (orientacyjny plan budowy domu).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Logged-out `/` shows Polish intro and auth CTAs
- After login/register, address bar shows `/panel` (not `/dashboard`)
- Logged-in visit to `/logowanie` redirects to `/panel`

**Implementation Note**: Pause for human confirmation after manual checks before Phase 2.

---

## Phase 2: Smart panel hub

### Overview

Turn `/panel` into the navigation center for new and returning users.

### Changes Required:

#### 1. Dashboard page logic

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Detect whether the user already has a plan and surface the correct next action.

**Contract**: Server Component — `getUser()` (redirect to `routes.login` if missing, matching questionnaire/plan pages). `prisma.plan.findFirst({ where: { userId }, select: { id, createdAt } })`. **No plan:** heading „Panel”, short explanation, primary `Button` as `Link` to `routes.questionnaire` — label „Rozpocznij ankietę”. **Has plan:** primary `Link` to `routes.plan(plan.id)` — label „Zobacz kosztorys i harmonogram”; optional muted line with `createdAt` formatted in Polish locale. Keep `SignOutButton` (move below CTAs or into header in Phase 3). Do not add edit/recalculate actions.

#### 2. Wire `routes.questionnaire`

**Files**: `src/app/(app)/dashboard/page.tsx` (and any new links added in Phase 3 header)

**Intent**: Use the canonical Polish path constant everywhere.

**Contract**: No hardcoded `/questionnaire` or `/ankieta` strings in new UI code.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- New user: panel → anketa → submit → plan page (full path without typing URLs)
- User with plan: panel shows link; click opens correct `/moj-plan/:id`
- `/ankieta` with existing plan still redirects to plan

**Implementation Note**: Pause for human confirmation before Phase 3.

---

## Phase 3: App shell, polish & north-star verification

### Overview

Shared app chrome, plan loading/errors, roadmap follow-up entry, and manual E2E sign-off.

### Changes Required:

#### 1. App header component

**File**: `src/components/app/app-header.tsx` (new)

**Intent**: Consistent navigation and sign-out across authenticated app routes.

**Contract**: Client or server component acceptable; shows app name linking to `routes.dashboard`; includes `SignOutButton` (relocate from dashboard if duplicated). Polish labels; minimal height bar using `cn()` and existing design tokens.

#### 2. App layout integration

**File**: `src/app/(app)/layout.tsx`

**Intent**: Render header above all `(app)` children.

**Contract**: Wrap `{children}` with header + sensible padding; do not break questionnaire or plan full-width layouts.

#### 3. Plan loading UI

**File**: `src/app/(app)/plan/[planId]/loading.tsx` (new)

**Intent**: Avoid blank screen while RSC fetches results.

**Contract**: Skeleton or muted placeholder blocks approximating table + timeline sections; match existing shadcn/skeleton patterns if available (add via `pnpm dlx shadcn@latest add skeleton` only if not already in repo).

#### 4. Plan fetch error discrimination

**Files**: `src/lib/api/fetch-plan-results.ts`, `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: User sees accurate Polish messages for missing plan vs server error.

**Contract**: Change `fetchPlanResults` to return a discriminated union, e.g. `{ status: "ok", data } | { status: "not_found" } | { status: "error" }` (map HTTP 404 → not_found, 401 → treat as redirect to login in page, other → error). Plan page renders distinct copy: not_found → „Nie znaleziono planu”; error → „Nie udało się wczytać wyników”; keep link to `routes.dashboard`. Remove redundant „Wróć do panelu” if header covers navigation (optional cleanup).

#### 5. Questionnaire submit 401 (optional small fix)

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Expired session during submit returns user to login instead of inline „Brak autoryzacji”.

**Contract**: On `response.status === 401`, `router.push(routes.login)`.

#### 6. Roadmap: marketing landing slice

**File**: `context/foundation/roadmap.md`

**Intent**: Document the deferred full landing as the next UX slice after north star.

**Contract**: Add row to **At a glance** and detailed section (e.g. **S-03b** or **P-01** `marketing-landing`): outcome „Pełny landing marketingowy (hero, korzyści, CTA)”; prerequisites `S-03`; status `proposed`. Note in Streams or Open Questions that minimal `/` from S-03 is intentional placeholder. Do not implement the landing in this change.

#### 7. Change notes

**File**: `context/changes/first-plan-e2e/change.md`

**Intent**: Record planning decisions for implementers/reviewers.

**Contract**: Replace placeholder Notes with short summary of north-star scope and deferred items.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- North-star script (see **Testing Strategy**) passes on desktop
- Spot-check questionnaire + plan layout on narrow viewport (375px)
- Header visible on panel, ankieta, and plan pages; sign-out works
- Plan page shows loading state on slow network (throttle) before content
- Invalid `planId` shows not-found copy, not generic error
- Roadmap lists `marketing-landing` as proposed follow-up

**Implementation Note**: Final phase — human sign-off closes S-03.

---

## Testing Strategy

### Manual Testing Steps (north star)

1. **Fresh user** — register → lands `/panel` → „Rozpocznij ankietę” → complete all steps → „Zatwierdź” → results page with table rows, timeline bars, total PLN, disclaimer.
2. **Timing** — submit to visible results ≤ 100s (stopwatch once).
3. **Returning user** — sign out, sign in → panel shows plan link → opens same results.
4. **Direct URLs** — unauthenticated `/panel` → `/logowanie`; unauthenticated `/ankieta` → `/logowanie`.
5. **Partial target sanity** — `starting_state` + `investment_state` = e.g. `FOUNDATIONS` → `CLOSED_SHELL`; table excludes early stages; totals non-zero.
6. **Garage zero** — `garage_spots: 0` → no `garage_gate` row (regression).
7. **Mobile spot-check** — table scrolls/readable; timeline readable on phone width.

### Regression

- Questionnaire state-order validation still works (step 1 matrix per `lessons.md`).
- `POST /api/plans` 409 still redirects to existing plan without duplicate rows.

## Performance Considerations

No new heavy work — panel adds one `findFirst` per visit. Plan page still one GET results call. Home redirect for authed users is optional and cheap.

## Migration Notes

None. Users with plans created before S-02 without `PlanStageResult` will still see not-found on results — acceptable MVP; north-star test should use a **new** account or delete test plan.

## References

- PRD: `context/foundation/prd.md` (US-01 generate path, FR-003, FR-006, FR-008)
- Roadmap S-03: `context/foundation/roadmap.md`
- Prior slices: `context/changes/questionnaire-flow/plan.md`, `context/changes/plan-generation/plan.md`
- Routes: `src/lib/routes.ts`
- Lessons: `context/foundation/lessons.md` (API routes, auth actions, questionnaire refine)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Entry & auth cohesion

#### Automated

- [x] 1.1 `pnpm lint` passes — 90b77d8
- [x] 1.2 `pnpm build` passes — 90b77d8

#### Manual

- [x] 1.3 Logged-out `/` shows Polish intro and auth CTAs — 90b77d8
- [x] 1.4 After login/register, address bar shows `/panel` — 90b77d8
- [x] 1.5 Logged-in visit to `/logowanie` redirects to `/panel` — 90b77d8

### Phase 2: Smart panel hub

#### Automated

- [x] 2.1 `pnpm lint` passes
- [x] 2.2 `pnpm build` passes

#### Manual

- [x] 2.3 New user: panel → anketa → submit → plan without manual URLs
- [x] 2.4 User with plan: panel link opens correct results
- [x] 2.5 `/ankieta` with existing plan redirects to plan

### Phase 3: App shell, polish & north-star verification

#### Automated

- [x] 3.1 `pnpm lint` passes
- [x] 3.2 `pnpm build` passes

#### Manual

- [ ] 3.3 North-star manual script passes (desktop)
- [ ] 3.4 Mobile spot-check on questionnaire and plan
- [ ] 3.5 Header + sign-out on app routes; plan loading and 404 copy
- [ ] 3.6 Roadmap lists `marketing-landing` follow-up slice
