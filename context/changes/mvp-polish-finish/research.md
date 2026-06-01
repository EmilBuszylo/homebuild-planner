---
date: 2026-06-01T08:24:25Z
researcher: Cursor Agent
git_commit: 90b4a6ba256b154e546aa83e7e68b48f8d44c5a3
branch: master
repository: home-build-planner
topic: "S-10 MVP polish capstone — copy, disclaimers, mobile, cross-surface cohesion"
tags: [research, mvp-polish, copy, disclaimers, mobile, marketing, app-panel, questionnaire, plan]
status: complete
last_updated: 2026-06-01
last_updated_by: Cursor Agent
---

# Research: S-10 MVP polish capstone

**Date**: 2026-06-01T08:24:25Z  
**Researcher**: Cursor Agent  
**Git Commit**: `90b4a6ba256b154e546aa83e7e68b48f8d44c5a3`  
**Branch**: `master`  
**Repository**: home-build-planner

## Research Question

What does the codebase need for **S-10 (`mvp-polish-finish`)** — a cohesive, “finished MVP” experience: orientacyjny language, disclaimers, mobile polish, and consistency across landing ↔ auth ↔ panel ↔ ankieta ↔ plan — without scope creep into S-11 (results UI) or parked nice-to-haves?

## Summary

Prior slices (S-07–S-09, F-07) delivered **feature polish** (hints, horizontal timeline, app shell, Vitest). S-10 is mostly **cross-cutting product polish**: the same legal/trust message appears in **five+ variants**, KPI labels **differ** between dashboard snapshot and plan strip, the **questionnaire** lacks a pre-submit disclaimer and uses “wstępny plan” instead of “orientacyjny”, and **metadata** is thin on `/`, auth, and app pages. Mobile gaps are localized (questionnaire heading scale, header/shell padding mismatch, questionnaire nav button width, missing loading skeletons on dashboard/ankieta).

**Recommended plan shape** (for `/10x-plan`):

1. **Copy module** — one source for orientacyjny disclaimer + trust bullets (reuse `OrientationalDisclaimer` or extract `src/lib/copy/disclaimers.ts`).
2. **Surface pass** — landing footer/trust alignment, dashboard (empty + snapshot), questionnaire intro + summary step, plan page dedupe (page vs cost-table footer).
3. **Label harmonization** — snapshot vs summary strip field names.
4. **Metadata & CTAs** — titles/descriptions for home, auth, register/login lexicon, `signOut` → `routes.login`.
5. **Mobile checklist** — typography, padding, full-width CTAs, optional loading.tsx.
6. **Explicit out of scope** — S-11 merged views/charts, hint UX v3, `(marketing)/` migration, E2E, FR-007/010.

## Detailed Findings

### Prior slices: done vs parked

| Slice | Delivered | Left for S-10 / later |
|-------|-----------|---------------------|
| **S-07** hints | Tooltips, choice hints, `hints/pl.ts` | Discoverability/mobile hint UX → roadmap **Parked** (v3), not S-10 |
| **S-08** timeline | Horizontal Gantt, coaching hints, DAG seed fixes | Timeline/cost cosmetics → **S-11** |
| **S-09** panel | `AppPageShell`, header, dashboard hub, plan hierarchy | Capstone copy/mobile cohesion → **S-10**; Playfair/breadcrumbs → optional S-10 or v3 |
| **F-07** tests | Vitest + CI | Run `pnpm test` after copy-only edits |

Archives: `context/archive/2026-05-29-questionnaire-hints/`, `2026-05-28-horizontal-timeline-coaching/`, `2026-06-01-app-panel-polish/`, `2026-05-27-marketing-landing/` (S-03b landing only).

### Disclaimer & trust copy (fragmented)

| Location | File | Notes |
|----------|------|--------|
| Shared component | `src/components/app/orientational-disclaimer.tsx:4-6` | Short paragraph; **only used on plan page** |
| Plan subtitle | `src/app/(app)/plan/[planId]/page.tsx:88-90` | Overlaps disclaimer |
| Cost table footer | `src/components/plan/plan-cost-table.tsx:13-17,83-84` | Legal strings + optional refinement line; “cache bazy” |
| Landing trust | `src/components/marketing/landing-trust.tsx:6-19` | Three bullets — richest public trust |
| Landing footer | `src/components/marketing/landing-footer.tsx:9-11` | Single legal line |
| Dashboard empty CTA | `src/app/(app)/dashboard/page.tsx:101-103` | Echoes trust H2, not shared component |
| Hero | `src/components/marketing/landing-hero.tsx:17` | Marketing tone |

**Gaps:** No disclaimer on **questionnaire** (intro or `questionnaire-summary.tsx` before submit). Dashboard with snapshot has partial trust line but not full disclaimer. Plan page stacks **three** layers of similar copy.

### Copy inconsistencies (KPI & language)

| Issue | A | B |
|-------|---|---|
| Total cost | `plan-snapshot-card.tsx:51` „Łączny koszt” | `plan-summary-strip.tsx:22` „Łączny koszt orientacyjny” |
| Start date | snapshot „Start budowy” | strip „Planowany start” |
| Stage count | „Etapy w planie” | „Etapy” |
| New questionnaire | `questionnaire/page.tsx:55` „wstępny plan” | Elsewhere „orientacyjny” |

### CTAs & routes

- Polish URLs centralized in `src/lib/routes.ts` + `next.config.ts` rewrites — **good**.
- Register label: landing/register **„Załóż konto”** vs login footer **„Zarejestruj się”**.
- Panel: **„Przejdź do panelu”** (marketing) vs **„Panel”** / **„Wróć do panelu”** (app).
- `signOut` hardcodes `redirect("/logowanie")` in `src/app/(auth)/actions.ts:115` instead of `routes.login`.

### Metadata (SEO / browser chrome)

- Root: Polish title template + description — `src/app/layout.tsx:20-27`.
- App pages: title only (`Panel`, `Ankieta`, `Twój plan budowy`) — `dashboard/page.tsx:22-24`, `questionnaire/page.tsx:11-13`, `plan/[planId]/page.tsx:16-18`.
- **Missing:** `metadata` on `/` (`src/app/page.tsx`), auth pages, page-specific descriptions, Open Graph (optional for MVP).

### Mobile & layout

| Area | Pattern / gap |
|------|----------------|
| Shell | `app-page-shell.tsx:19` always `px-6`; header `app-header.tsx:15` `px-4 sm:px-6` — edge misalignment possible |
| Headings | Dashboard/plan `sm:text-3xl`; questionnaire `h1` only `text-2xl` |
| CTAs | Dashboard/plan `w-full sm:w-auto`; questionnaire `step-navigation.tsx` not full-width on mobile |
| Loading | Only `plan/[planId]/loading.tsx` |
| Timeline | `plan-timeline.tsx` horizontal scroll + `min-w` — intentional (S-08); no S-10 change unless copy-only |
| Cost table | `overflow-x-auto` — OK |

### Error & empty states

Polish throughout (`questionnaire-form.tsx`, plan errors, dashboard fallback). No dedicated empty state if questionnaire has zero questions. Rate-limit messages aligned with S-06.

### Dynamic / edge English risk

- `formatPlanCategory` falls back to raw enum (`plan-category.ts:9-10`) — mitigated if seed categories match map.
- `benchmarkSourceName` shown verbatim in cost table when refinement applied.
- Zod defaults on tampered enum values could surface English (low priority).

### Auth & marketing structure

- Landing at root `src/app/page.tsx`, not `(marketing)/` — documented deferral; **not required** for S-10 unless explicitly in plan.
- Auth layout minimal — `src/app/(auth)/layout.tsx` — no trust copy on register (acceptable if capstone focuses on product path).

## Code References

- `src/components/app/orientational-disclaimer.tsx:1-9` — canonical app disclaimer (underused)
- `src/components/marketing/landing-trust.tsx:5-20` — public trust benchmark
- `src/components/plan/plan-cost-table.tsx:13-17,83-84` — table-level legal copy
- `src/app/(app)/plan/[planId]/page.tsx:85-100` — plan header + disclaimer placement
- `src/app/(app)/dashboard/page.tsx:49-114` — hub empty + CTA trust echo
- `src/app/(app)/questionnaire/page.tsx:47-58` — narrow shell + intro copy
- `src/components/questionnaire/questionnaire-summary.tsx` — pre-submit step (no disclaimer)
- `src/components/app/plan-snapshot-card.tsx` vs `plan-summary-strip.tsx` — KPI label drift
- `src/lib/routes.ts:1-9` — route constants
- `src/app/(auth)/actions.ts:112-115` — signOut redirect
- `src/app/layout.tsx:20-27` — global metadata
- `context/foundation/roadmap.md:133-142` — S-10 outcome and risk (scope creep)
- `context/foundation/prd.md:40-51,103-105` — success criteria & NFR (orientacyjny, mobile, clarity)

## Architecture Insights

- **Polish UI copy lives in components**, not i18n files — S-10 should introduce a **small shared copy module** rather than scattering string edits.
- **Disclaimers are legal/product**, not marketing-only — landing and app should share wording with intentional shortening variants (footer one-liner vs full paragraph).
- **S-09 established layout primitives** (`AppPageShell`, `AppHeader`) — S-10 should not redesign shell; tune tokens/spacing/copy only.
- **Tests:** `pnpm test` covers `apply-market-benchmarks` and `getPlanRecalcPolicy` — copy changes need lint + build; no new tests required unless extracting pure copy helpers.

## Historical Context (from prior changes)

- `context/archive/2026-06-01-app-panel-polish/plan.md` — deferred capstone copy to S-10; S-11 for charts/merged views.
- `context/archive/2026-05-28-horizontal-timeline-coaching/plan.md` — panel shell deferred to S-09; timeline polish details → S-11.
- `context/archive/2026-05-29-questionnaire-hints/change.md` — hint iteration parked for user research, not S-10.
- `context/archive/2026-05-27-marketing-landing/plan.md` — landing scope; no FAQ/analytics.
- `context/archive/2026-06-01-vitest-minimal-setup/plan.md` — CI runs `pnpm test` before build.

## Related Research

- `context/archive/2026-06-01-app-panel-polish/` — layout baseline for plan/dashboard
- `context/foundation/health-check.md` — pre-polish audit mentioned copy/test gaps (partially closed by F-07)

## Open Questions (for `/10x-plan` decisions)

1. **Disclaimer dedupe on plan page** — keep cost-table footer + slim page disclaimer, or single block?
2. **Register CTA lexicon** — standardize on „Załóż konto” or „Zarejestruj się” everywhere?
3. **Metadata depth** — titles only vs per-route `description` + optional OG for `/`?
4. **Questionnaire disclaimer** — intro only, summary step only, or both?
5. **Scope guard** — confirm S-11 items (merged timeline, charts) stay out of S-10 phases.

## Suggested implementation phases (input to plan)

| Phase | Focus | Risk |
|-------|--------|------|
| 1 | Shared copy module + unify disclaimer strings | Over-editing legal tone |
| 2 | App surfaces: dashboard, questionnaire, plan dedupe | Triple disclaimer confusion |
| 3 | Marketing/auth metadata + CTA lexicon + `signOut` | Low |
| 4 | Mobile pass + loading skeletons (optional) | Scope creep |
| 5 | Verification: manual matrix + `pnpm lint` / `test` / `build:ci` | — |
