# App panel polish — Plan Brief

> Full plan: `context/changes/app-panel-polish/plan.md`

## What & Why

Roadmap **S-09**: użytkownik ma przyjazny hub i spójny układ w `(app)` — dashboard z kontekstem planu, strona wyników z hierarchią wizualną, mniej surowego centrowania i pustej przestrzeni (FR-006). Rdzeń funkcjonalny (ankieta, kosztorys, timeline S-08) jest gotowy; brakuje warstwy „produktowej” spójnej z landingiem.

## Starting Point

`(app)` to cienki shell: `AppHeader` (`max-w-4xl`, logo + wyloguj), dashboard wyśrodkowany z datą planu bez KPI, strona planu to nagłówek + `PlanCostTable` + `PlanTimeline`. Landing ma sticky header, `max-w-6xl`, trust band i Cards — panel tego nie powiela. `fetchPlanResults` i `PlanResultsDto` już istnieją.

## Desired End State

Panel u góry ekranu pokazuje snapshot planu (koszt, data, etapy) lub zachętę do ankiety. Nagłówek nawiguje (Panel, Ankieta, Twój plan). Strona planu ma pasek KPI i krótki disclaimer przed tabelą i timeline. Błędy i loading są dopracowane; mobile bez regresji timeline S-08.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Dane na dashboard | `fetchPlanResults(planId)` | Ten sam DTO co strona planu — bez duplikacji logiki Prisma | Plan |
| Nawigacja planu | `latestPlanId` z `(app)/layout` | MVP = jeden plan/użytkownik; jedno zapytanie `id` na request | Plan |
| Wzorzec wizualny | Landing header + trust (skrót) | Spójność landing ↔ panel bez migracji route group | Plan |
| Zakres | UI/layout tylko | S-09 = polish; S-11/S-10 na później | Roadmap |
| Fazy | Shell → dashboard → plan page | Od wspólnego kontenera do szczegółów stron | Plan |

## Scope

**In scope:** `AppPageShell`, `AppHeader`+nav, dashboard hub + snapshot, `PlanSummaryStrip`, disclaimer, błędy/loading/metadata, ankieta top-aligned.

**Out of scope:** wykresy, scalony widok, FR-007/010, Vitest, S-10 capstone, zmiany timeline/kosztorysu poza layoutem.

## Architecture / Approach

`(app)/layout` → `AppHeader(latestPlanId)` + strony w `AppPageShell`. Dashboard: Prisma plan + opcjonalnie `fetchPlanResults`. Plan page: istniejące komponenty + nowe paski KPI/disclaimer na górze.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Shell & nav | Sticky header, nav, wspólny kontener, ankieta od góry | Layout fetch user/plan — nie duplikować redirectów |
| 2. Dashboard hub | Karta snapshot / empty state | Podwójny fetch na dashboardzie |
| 3. Plan page | KPI strip, disclaimer, błędy, loading, metadata | Mobile gęstość KPI + timeline |

**Prerequisites:** S-08 (timeline) ✓, S-07 ✓.  
**Estimated effort:** ~2–3 sesje, 3 fazy.

## Open Risks & Assumptions

- Dashboard przy planie bez wyników (404 API) — fallback do prostego hubu z datą.
- `latestPlanId` w layout zakłada jeden aktywny plan — OK dla MVP.
- Dalsze polish (typografia Playfair, breadcrumbs) — roadmap v3 / S-10.

## Success Criteria (Summary)

- Panel i plan czytelne bez „pustego środka” na desktop.
- Nagłócek i szerokość `max-w-6xl` jak landing.
- `pnpm lint` / `pnpm build:ci`; smoke panel → plan → ankieta bez regresji.
