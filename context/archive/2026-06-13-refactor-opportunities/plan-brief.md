# Refactor Opportunities — Plan Brief

> Full plan: `context/changes/refactor-opportunities/plan.md`  
> Research: `context/changes/refactor-opportunities/research.md`

## What & Why

Repozytorium ma udokumentowany dług strukturalny w obszarze przepływu kosztów (cost-calibration research). Ta change realizuje **cztery rankowane refactory** — nie naprawia przypadkowych bugów, lecz porządkuje świadome trade-offy MVP (assembler DTO, read patterns, coupling Prisma, triple maintenance seed) w odwracalnych fazach.

## Starting Point

- DTO: typy w `plan-results.ts`, składanie inline w GET `results/route.ts`, brak Zod na fetch.
- Read: 3× duplikowany `prisma.plan.findFirst` w RSC; wyniki przez loopback API na plan/dashboard.
- Domain: `investment-state.ts` importuje enum z `@prisma/client`.
- Kalibracja: `prisma/seed.ts` + fixtures + regex parity test — poza grafem depcruise.

## Desired End State

Jeden assembler DTO + Zod contract; jeden loader metadanych planu dla RSC; domain union bez Prisma w investment-state; wspólny moduł stawek kalibracji konsumowany przez fixtures i seed. Zachowanie produktu i freeze-on-write bez zmian.

## Key Decisions Made

| Decision | Choice | Why | Source |
|---|---|---|---|
| Kolejność faz | C1 → C2 → C3 → C4 | Najniższy koszt/ryzyko first; C4 ciężki na końcu | Research |
| Loopback fetch | **Zostaje** | IDOR enforcement w GET handler; usunięcie = osobna change | Research / Plan |
| Zod DTO | **W scope fazy 1** | Zamyka lukę cast w fetch; wzorzec jak questionnaire | Plan |
| Calendar export duplicate | **Poza fazą 1** | Osobny assembler stage w calendar; nie blokuje C1 | Plan |
| C2 questionnaire | Loader z wariantem `questionnaire` | Inne include niż nav/dashboard | Plan |
| C4 wartości stawek | **Bez zmian** | Tylko reorganizacja; unikamy regresji oracle/E2E | Research |
| depcruise w CI | **Out of scope** | Opcjonalny follow-up | Research |
| Schema migrate | **Brak** | Refactor bez nowych kolumn | Plan |

## Scope

**In scope:** Fazy 1–4 (assembler, loader, domain union, shared calibration); testy kontraktu DTO i fetch; testy loadera; owner seed verify po 4B.

**Out of scope:** Usunięcie loopback, freeze-on-write, merge widoków, merge form/API schema, zmiana stawek, depcruise CI, calendar export refactor.

## Architecture / Approach

```
Phase 1: results/route → assemblePlanResultsDto (pure) + planResultsSchema
Phase 2: layout | dashboard | questionnaire → loadLatestPlanForUser(variant)
Phase 3: investment-state → DomainInvestmentState (types/domain)
Phase 4: calibration/*.ts ← fixtures; ← prisma/seed.ts (relative import)
```

Wyniki planu nadal: RSC → `fetchPlanResults` → GET results (ownership + assembly).

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. C1 DTO assembler | Pure assembler + Zod + testy kontraktu | Typ hub 13← — tylko reorganizacja, nie zmiana pól |
| 2. C2 Plan loader | Jeden moduł query dla 3 RSC | Questionnaire include musi pozostać identyczny |
| 3. C3 Domain union | investment-state bez @prisma/client | Tylko import typu — wartości enum bez zmian |
| 4. C4 Calibration | Shared defs; seed consumer | Seed relative import; owner re-seed po 4B |

**Prerequisites:** Research complete; brak pending migrations.  
**Estimated effort:** ~4 sesje implementacji (1 faza ≈ 1 sesja after-hours).

## Open Risks & Assumptions

- Prod re-seed po C4B — procedura u ownera **unknown**; kod mergeable bez prod seed.
- `getSiteOrigin()` loopback — nie ruszane; deploy edge case pozostaje.
- Calendar export stage mapping — nadal duplikat do osobnej change.

## Success Criteria (Summary)

- Wszystkie fazy: `pnpm lint`, `pnpm test`, `pnpm build:ci` zielone.
- Brak regresji UI plan/dashboard/ankieta (manual per faza).
- C4: parity + golden oracle bez zmiany liczb; owner potwierdza lokalny seed.
