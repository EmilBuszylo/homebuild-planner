# Marketing landing (S-03b) — Plan Brief

> Full plan: `context/changes/marketing-landing/plan.md`

## What & Why

S-03 proved the north-star flow with a **minimal** `/` placeholder. S-03b delivers a credible **product homepage** so new visitors understand orientacyjny kosztorys + harmonogram and register without feeling like they hit a dev stub. Roadmap outcome: hero, korzyści, zaufanie, CTA rejestracji — presentation only, no new product logic.

## Starting Point

`src/app/page.tsx` is a centered blurb with login/register buttons and redirects logged-in users to `/panel`. Auth hero image exists at `public/auth-hero.png` for login/register. Brand, shadcn buttons, and Polish `routes.*` patterns are established; there is no `src/components/marketing/` yet.

## Desired End State

Guests see a full Polish marketing page at `/` (sticky header, split hero, benefits, trust disclaimers, minimal footer) with **register-first** CTAs. Logged-in users see the same page with **“Przejdź do panelu”** instead of being redirected away. Lint and production build pass; manual checks cover mobile/desktop and auth entry paths.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Complexity | MEDIUM | Multi-section UI, no backend; several UX choices needed | Plan |
| Route location | Keep `src/app/page.tsx` | Faster than route-group migration; URL stays `/` | Plan |
| Sections | Hero + benefits + trust + CTAs | Matches roadmap S-03b core | Plan |
| Social proof | Trust copy only | Honest MVP without fake testimonials | Plan |
| Primary CTA | Register first | Acquisition-focused landing | Plan |
| Hero visual | Reuse `auth-hero.png` | Asset exists; split layout matches auth | Plan |
| Header | Sticky with auth links | Standard marketing pattern | Plan |
| Logged-in `/` | Show landing + panel CTA | User can re-read value prop before panel | Plan |
| Footer | Minimal disclaimer + login link | Legal clarity without CTA clutter | Plan |
| Components | `src/components/marketing/*` | Keeps `page.tsx` thin and testable by eye | Plan |

## Scope

**In scope:**

- `LandingHeader`, `LandingFooter`, `LandingHero`, `LandingBenefits`, `LandingTrust`
- Rewrite `src/app/page.tsx` composition; remove authed redirect
- Polish copy, `routes.*` links, responsive layout
- `pnpm lint` / `pnpm build` per phase

**Out of scope:**

- `(marketing)` route group, FAQ, “jak to działa”, analytics
- New images, API/DB/auth changes
- Automated tests, full SEO project

## Architecture / Approach

Server Component `page.tsx` calls `getUser()` once, passes `isAuthenticated` into header/hero. Presentational components under `src/components/marketing/`. No new API or Prisma. Middleware unchanged (`/` public).

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Shell | Sticky header + footer | Authed/guest CTA matrix wrong in header |
| 2. Sections | Hero, benefits, trust + page wire-up | Removing redirect surprises returning users |
| 3. Polish | Metadata tweak, manual regression | Skipping mobile pass |

**Prerequisites:** S-03 done on branch; no migrations.

**Estimated effort:** ~1–2 after-hours sessions across 3 phases.

## Open Risks & Assumptions

- Logged-in users **expecting** auto-redirect from `/` to `/panel` will see a behavior change (documented, intentional).
- Marketing copy is **draft-quality** in implement; product owner may want a copy edit pass before production launch.
- Reusing `auth-hero.png` ties landing visually to auth pages (acceptable tradeoff for MVP).

## Success Criteria (Summary)

- Guest can understand the product and reach `/rejestracja` from header and hero without confusion.
- Logged-in user reaches `/panel` from landing CTAs without broken navigation.
- `pnpm lint` and `pnpm build` pass; manual mobile/desktop check completed.
