# Plan results polish — timeline mobile (S-11) — Plan Brief

> Full plan: `context/changes/plan-results-polish-details/plan.md`  
> Frame brief: `context/changes/plan-results-polish-details/frame.md`

## What & Why

> **The actual problem to plan around is**: Make the **horizontal plan timeline** understandable and usable on **mobile and narrow viewports** — horizontal scroll affordance, readable stage labels/dates, and **coaching hints discoverable without hover-only** — while keeping cost table and timeline as **separate** sections.

Roadmap S-11 (faza 3) po domknięciu MVP polish; owner wskazał **timeline mobile** jako główny temat.

## Starting Point

S-08 dostarczył poziomy harmonogram z coaching markers (Tooltip/hover). Strona planu ma osobno `PlanCostTable` i `PlanTimeline`; kosztorys sortuje po API `sortOrder`, timeline po `startDay` — wiersze mogą się rozjeżdżać. Brak komponentu Popover w UI.

## Desired End State

Na mobile użytkownik czyta nazwy etapów, przewija oś ze zrozumieniem „po co scroll”, i otwiera wskazówki **dotknięciem**. Na desktop bez regresji. Tabela kosztów w tej samej kolejności chronologicznej co harmonogram.

## Key Decisions Made

| Decision | Choice | Why | Source |
| --- | --- | --- | --- |
| Primary scope | Timeline mobile UX | Owner + frame evidence | Frame |
| Merged view | Out | Intentional two-Card layout through S-10 | Frame |
| Coaching UI | Popover on tap | Tooltips fail on touch | Frame / Plan |
| Axis width on mobile | Lower `pxPerDay` on `<sm` | Less horizontal scroll without API change | Plan |
| Cost table | Chronological sort only | Scan alignment; no charts | Frame / Plan |
| DB/API | No changes | Polish-only slice | Plan |

## Scope

**In scope:** Scroll hint + a11y region; responsive `pxPerDay`; Popover coaching; label column mobile readability; shared chronological sort + optional Vitest; verification.

**Out of scope:** Merged view, charts, grouping, timeline algorithm/seed changes, marker collision packing, FR-007/010.

## Architecture / Approach

Wszystko w warstwie prezentacji: `plan-timeline.tsx` (client), mały helper sort w `src/lib/plan/`, jedna stała copy w `orientational.ts`, nowy `popover` z shadcn. `layout-timeline-stages.ts` bez zmiany logiki coaching — tylko parametr `pxPerDay` z komponentu.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Scroll + density | Hint PL, aria region, 8px/day mobile | Regresja szerokości desktop |
| 2. Popover coaching | Tap-open hints, copy bez „najedź” | Nowy primitive shadcn |
| 3. Labels mobile | Czytelne nazwy/daty | Stack vs dual-pane layout choice |
| 4. Cost sort align | Helper + test + wire table | Tie-break vs timeline sort |
| 5. Capstone | lint/test/build + mobile checklist | — |

**Prerequisites:** S-10 done; dev server + plan z coaching markers.  
**Estimated effort:** ~2–3 sesje after-hours, 5 faz.

## Open Risks & Assumptions

- Layout etykiet na mobile (stack vs wider column) — implementer wybiera w Phase 3 bez zmiany planu.
- Wiele markerów na jednym wierszu — poza scope; kolizje wizualne mogą zostać.
- Brak user research po S-10 — manual checklista zastępuje formalne testy.

## Success Criteria (Summary)

- Timeline używalny na ~375px: scroll, etykiety, tap coaching.
- Desktop bez regresji FR-006 presentation.
- Kosztorys i harmonogram — ta sama kolejność chronologiczna etapów.
- `pnpm lint`, `pnpm test`, `pnpm build:ci` zielone.
