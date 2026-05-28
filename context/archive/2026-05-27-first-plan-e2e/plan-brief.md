# First plan e2e (S-03) — Plan Brief

> Full plan: `context/changes/first-plan-e2e/plan.md`

## What & Why

S-03 is the **north star**: a logged-in user discovers the product, completes the questionnaire, and sees orientacyjny kosztorys + timeline without typing URLs manually. S-01/S-01b/S-02 shipped the mechanics; this slice wires them into one coherent, discoverable journey (FR-003, FR-006, FR-008; generate path of US-01).

## Starting Point

Auth, multi-step questionnaire (`/ankieta`), POST generation, and results UI (`/moj-plan/:id`) work in isolation. Post-login users land on a stub `/panel` with no CTA; `/` is still Next.js scaffold; middleware and Server Actions redirect to English `/dashboard` while UI links use Polish `/panel`. `routes.questionnaire` is defined but unused.

## Desired End State

A first-time user: opens `/` → registers/logs in → lands on `/panel` → starts questionnaire → submits → sees table + timeline. A returning user with a plan: `/panel` offers a direct link to their results. Polish URLs stay consistent in the browser bar. Manual north-star checklist passes (≤100s, mobile/desktop sanity). Roadmap lists a follow-up slice for a full marketing landing.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Complexity | MEDIUM (~8 questions) | Integration + UX glue, no new engine | Plan |
| Home `/` | Minimal product page now | Unblocks discoverability without a multi-section marketing build | Plan |
| Marketing landing | New roadmap slice `marketing-landing` | Full hero/ benefits page deferred deliberately | Plan |
| Panel behavior | Smart hub | No plan → CTA ankieta; has plan → link to results | Plan |
| DEVELOPER pricing | Out of scope | S-02 deferred calibration; S-03 proves flow on CLOSED_SHELL path | Plan |
| Auth redirects | `routes.dashboard` (`/panel`) everywhere | Fixes EN/PL URL split after login | Plan |
| App chrome | Minimal `(app)` header | Panel link + sign-out; avoids duplicating nav on every page | Plan |
| Loading/errors | Targeted polish | `loading.tsx` on plan + clearer 404 vs generic; submit already shows pending | Plan |
| Existing plan | Silent redirect | Keep 409 / `/ankieta` redirect behavior; edit is S-05 | Plan |

## Scope

**In scope:**

- Minimal public home with CTAs to logowanie/rejestracja
- Polish post-auth redirects (`actions.ts`, `middleware.ts`)
- Smart `/panel` (plan detection, CTAs)
- Shared `AppHeader` in `(app)/layout`
- Plan route `loading.tsx` + differentiated error copy on results fetch
- Optional: redirect logged-in user from `/` to `/panel`
- Root metadata (Polish product title/description)
- Roadmap row for `marketing-landing` slice
- Manual north-star E2E verification checklist

**Out of scope:**

- DEVELOPER target rate calibration
- Edit/recalculate (S-05), internet refinement (S-04), rate limits (S-06)
- Full marketing landing (follow-up slice)
- Schema/migrations, automated test stack
- Backfill `PlanStageResult` for pre-S-02 plans

## Architecture / Approach

No new API routes. RSC pages use existing Prisma reads on the panel; questionnaire and plan flows stay as today. Navigation glue: `routes.ts` as single source of Polish paths; `(app)/layout` adds header; home replaces scaffold. Plan page keeps RSC → `fetchPlanResults` with improved error discrimination for Polish messages.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Entry & auth cohesion | Minimal `/`, metadata, redirects to `/panel` | Missing `NEXT_PUBLIC_SITE_URL` on Vercel still affects RSC→API elsewhere (S-02) |
| 2. Smart panel | Hub UI + `routes.questionnaire` wired | Panel must not expose edit/recalc (S-05 scope) |
| 3. Shell, polish & north-star verify | App header, plan loading/errors, roadmap note, E2E checklist | False confidence if E2E skipped on mobile |

**Prerequisites:** S-02 merged/applied on branch; owner has run `pnpm db:seed` if testing fresh rates.

**Estimated effort:** ~2–3 after-hours sessions across 3 phases.

## Open Risks & Assumptions

- North star manual test uses a **new** user/plan after S-02 seed; old plans without results still 404 on results.
- DEVELOPER target may show implausible totals until a future calibration change.
- Assumes single-plan-per-user (409) remains acceptable for MVP.

## Success Criteria (Summary)

- New user completes login → panel → ankieta → submit → kosztorys + timeline without manual URL entry.
- Returning user with plan reaches results from panel in one click.
- Browser shows Polish paths (`/panel`, `/ankieta`, `/moj-plan/...`) after auth.
