# Marketing landing (S-03b) Implementation Plan

## Overview

Replace the minimal placeholder at `/` (shipped in S-03 `first-plan-e2e`) with a full Polish marketing landing: sticky header, split hero with `auth-hero.png`, benefits grid, trust/disclaimer copy, footer, and register-first CTAs. Logged-in users see the same page with panel-oriented CTAs instead of being redirected away. No backend, schema, or API changes.

## Current State Analysis

- `src/app/page.tsx` — centered minimal copy + login/register buttons; **redirects** authed users to `routes.dashboard` (lines 15–17).
- No `(marketing)` route group; user chose to **keep** root `page.tsx` and colocate UI in `src/components/marketing/`.
- Brand pattern established in `auth-shell.tsx`, `app-header.tsx`: `Home` icon in `bg-primary` square + “Planer budowy domu”.
- `public/auth-hero.png` used on auth pages (right column, `lg+`); safe to reuse on landing hero.
- `routes.ts` — Polish paths for login, register, dashboard, home; all CTAs must use these constants.
- PRD has **no** dedicated landing requirements; roadmap slice S-03b defines outcome (hero, korzyści, zaufanie, CTA rejestracji).

### Key Discoveries:

- `src/app/page.tsx:15-17` — authed redirect must be **removed** per planning decision (show landing + panel CTA).
- `src/middleware.ts` — `/` is public; no middleware change required.
- `context/changes/first-plan-e2e/plan.md` — explicitly deferred full landing to this change.

## Desired End State

A **guest** opening `/` sees a credible product homepage: sticky header (logo + logowanie + rejestracja), hero with value prop and primary “Załóż konto”, 3–4 benefit cards, trust section with orientacyjny/disclaimer copy, minimal footer with disclaimer + login link.

A **logged-in user** opening `/` sees the same marketing layout but header/hero CTAs emphasize “Przejdź do panelu” (`routes.dashboard`); no automatic redirect.

### Verification

- `pnpm lint` and `pnpm build` pass.
- Manual: guest flow — register CTA visible above the fold on mobile and desktop; hero image visible on `lg+`.
- Manual: authed flow — `/` shows panel CTA, no redirect loop; panel still reachable.
- Polish copy throughout; links use `routes.*` only.

## What We're NOT Doing

- `(marketing)` route group migration (stay on `src/app/page.tsx`).
- “Jak to działa” steps, FAQ, pricing tables, blog, analytics pixels.
- Real user testimonials or fabricated quote cards.
- New hero image asset (reuse `auth-hero.png` only).
- Schema/migrations, API routes, Server Actions changes.
- SEO campaign work beyond optional one-line metadata tweak if copy diverges from root `layout.tsx`.
- Roadmap file edit (optional follow-up; not blocking implement).
- DEVELOPER calibration, questionnaire/plan feature changes.

## Implementation Approach

Build **presentational** RSC-friendly components under `src/components/marketing/`, composed by the existing server `page.tsx` after `getUser()`. Pass a boolean or minimal `isAuthenticated` flag from the page into header/hero for CTA variants. Reuse shadcn `Button`, `Card` (if benefits use cards), Tailwind utilities consistent with auth/app. Keep all strings inline in components (Polish UI copy per AGENTS.md).

## Phase 1: Marketing shell (header + footer)

### Overview

Sticky top navigation and minimal footer shared across landing sections.

### Changes Required:

#### 1. Landing header

**File**: `src/components/marketing/landing-header.tsx`

**Intent**: Sticky header with brand link to `routes.home` and auth CTAs for guests; for authenticated users, primary CTA to `routes.dashboard` and optional sign-out affordance consistent with app chrome.

**Contract**: Export `LandingHeader` accepting `isAuthenticated: boolean`. Guest: outline “Zaloguj się” → `routes.login`, default “Załóż konto” → `routes.register`. Authed: primary “Przejdź do panelu” → `routes.dashboard`; include `SignOutButton` from `@/components/auth/sign-out-button` in header actions (mirror `AppHeader` pattern). Layout: `sticky top-0 z-50 border-b bg-background/95 backdrop-blur`, max-width container, `h-14`.

#### 2. Landing footer

**File**: `src/components/marketing/landing-footer.tsx`

**Intent**: Minimal footer with orientacyjny disclaimer and secondary link to login for guests who scrolled past hero.

**Contract**: Export `LandingFooter` with static Polish disclaimer (e.g. wyceny mają charakter orientacyjny, nie stanowią oferty). Include `Link` to `routes.login` with label like “Masz już konto? Zaloguj się”. No repeated register CTA in footer (per decision).

#### 3. Optional brand helper (only if duplication is painful)

**File**: `src/components/marketing/marketing-brand.tsx` (create only if header duplicates markup)

**Intent**: Single brand row (icon + title) linked to `routes.home`, matching `AuthShell` / `AppHeader` sizing appropriate for marketing header.

**Contract**: Export `MarketingBrand` as `Link` + `Home` lucide icon; skip file if inlined in header stays under ~15 lines.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Header stays visible when scrolling a long landing (sticky behavior)
- Guest sees login + register in header; authed preview (mock session or real login) shows panel CTA

**Implementation Note**: Pause for manual confirmation before Phase 2.

---

## Phase 2: Landing sections (hero, benefits, trust)

### Overview

Implement the three content sections and wire them in `page.tsx` with guest vs authed CTA variants.

### Changes Required:

#### 1. Hero section

**File**: `src/components/marketing/landing-hero.tsx`

**Intent**: Split layout on large screens: left column with H1, supporting paragraph, and CTAs; right column with `auth-hero.png` (hidden below `lg`, same treatment as `auth-shell.tsx` — `object-cover`, dark mode brightness/grayscale optional parity).

**Contract**: Export `LandingHero` with `isAuthenticated: boolean`. Guest: primary “Załóż konto” → `routes.register`, secondary outline “Zaloguj się” → `routes.login`. Authed: single primary “Przejdź do panelu” → `routes.dashboard`. Headline/subcopy in Polish aligned with product (orientacyjny kosztorys + harmonogram, ankieta, etapy budowy). Reuse value prop themes from current `page.tsx` but expanded for marketing tone.

#### 2. Benefits section

**File**: `src/components/marketing/landing-benefits.tsx`

**Intent**: Section “Co zyskujesz” (or similar) with **3–4** benefit items as cards or icon+text rows.

**Contract**: Static array of benefits (no CMS). Suggested themes (Polish titles + one sentence each): (1) orientacyjny podział kosztów na etapy, (2) harmonogram z zależnościami etapów, (3) oparcie o lokalną bazę wiedzy o budowie, (4) szybki start bez wiążącej oferty — pick four or strongest three. Use Lucide icons; shadcn `Card` optional. Responsive grid `md:grid-cols-2` / `lg:grid-cols-4` or `3`.

#### 3. Trust section

**File**: `src/components/marketing/landing-trust.tsx`

**Intent**: Trust block without fake testimonials — short bullets or prose covering: orientacyjne widełki, MVP nie zastępuje kosztorysu wykonawcy, dane z ankiety użytkownika.

**Contract**: Export `LandingTrust`; muted background band (`bg-muted/50`) acceptable. No user photos or star ratings.

#### 4. Page composition

**File**: `src/app/page.tsx`

**Intent**: Replace minimal centered layout with full landing composition; **remove** `redirect(routes.dashboard)` for authenticated users.

**Contract**: After `getUser()`, render `<LandingHeader isAuthenticated={!!user} />`, main with `<LandingHero />`, `<LandingBenefits />`, `<LandingTrust />`, `<LandingFooter />`. Page remains async Server Component; no new data fetching. Remove old centered-only markup.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Guest: hero register CTA visible without scrolling on common mobile viewport (~390px width)
- Desktop `lg+`: hero image visible on the right
- Authed user on `/`: no redirect; panel CTA in header and hero works
- All links resolve to Polish paths in the browser when using `routes.*` (`/rejestracja`, `/logowanie`, `/panel`)

**Implementation Note**: Pause for manual confirmation before Phase 3.

---

## Phase 3: Polish, metadata touch-up, north-star spot-check

### Overview

Final copy pass, optional metadata alignment, and manual regression on auth entry paths.

### Changes Required:

#### 1. Root metadata (optional, only if needed)

**File**: `src/app/layout.tsx`

**Intent**: Ensure `metadata.title` / `metadata.description` reflect the richer landing promise if current description is too generic.

**Contract**: Polish strings only; do not change font/layout setup. Skip file if existing metadata from S-03 already matches hero copy.

#### 2. Visual consistency pass

**Files**: `src/components/marketing/*.tsx`

**Intent**: Align spacing (`py-16`/`py-24` section rhythm), heading hierarchy (`h1` once in hero, `h2` in sections), focus states on links/buttons, sufficient color contrast on muted text.

**Contract**: No new dependencies; no custom CSS outside Tailwind utilities.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm build` passes

#### Manual Verification:

- Lighthouse/quick pass: page readable on mobile and desktop (no horizontal scroll)
- Guest path: `/` → rejestracja → (existing flow) still works
- Authed path: `/` → panel → ankieta/plan unchanged (no regression from S-03)
- Dark mode: hero image and text remain legible (parity with auth pages)

**Implementation Note**: Final manual sign-off completes the change.

---

## Testing Strategy

### Unit Tests:

- None (repo has no test runner per AGENTS.md).

### Integration Tests:

- None for this change.

### Manual Testing Steps:

1. Log out → open `/` → confirm full landing sections and register-first CTAs.
2. Click “Załóż konto” from header and hero → lands on `/rejestracja`.
3. Log in → open `/` → confirm **no** redirect to `/panel`; “Przejdź do panelu” works.
4. Resize to mobile width → header usable, benefits stack, hero image hidden or stacked acceptably.
5. Toggle dark mode → hero image treatment acceptable.
6. From `/`, click logo → stays on `/`.

## Performance Considerations

- Static RSC page + one `getUser()` call (same as today). No additional API/Prisma.
- Single existing image asset; no new large assets.

## Migration Notes

- None. Pure UI replacement at `/`.
- **Behavior change**: logged-in users previously redirected from `/` to `/panel` will now see the landing — intentional per plan.

## References

- Roadmap S-03b: `context/foundation/roadmap.md` (lines 164–174)
- Prior minimal home spec: `context/changes/first-plan-e2e/plan.md` Phase 1
- Brand/hero patterns: `src/components/auth/auth-shell.tsx`, `src/components/app/app-header.tsx`
- Routes: `src/lib/routes.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Marketing shell (header + footer)

#### Automated

- [x] 1.1 `pnpm lint` passes — 9f466f7
- [x] 1.2 `pnpm build` passes — 9f466f7

#### Manual

- [x] 1.3 Sticky header and guest/authed CTA variants verified — 9f466f7

### Phase 2: Landing sections (hero, benefits, trust)

#### Automated

- [ ] 2.1 `pnpm lint` passes
- [ ] 2.2 `pnpm build` passes

#### Manual

- [ ] 2.3 Guest and authed landing layouts verified (mobile + desktop, Polish URLs)

### Phase 3: Polish, metadata touch-up, north-star spot-check

#### Automated

- [ ] 3.1 `pnpm lint` passes
- [ ] 3.2 `pnpm build` passes

#### Manual

- [ ] 3.3 Manual regression checklist (auth entry, dark mode, no redirect for authed `/`)
