# Mapa projektu — home-build-planner

> Status: **synteza** · 2026-06-12  
> Dowody: [artifact-1](./artifact-1-territory.md) (terytorium + git) · [artifact-2](./artifact-2-structure.md) (graf depcruise) · [artifact-3](./artifact-3-contributors.md) (wiedza)  
> Walidacja grafu: `pnpm depcruise` · 168 modułów, 0 cykli

---

## W jednym akapicie

Next.js MVP: ankieta → orientacyjny kosztorys + harmonogram → edycja i przeliczenie. **Roadmap v3 zamknięta** (brak otwartych feature change). Rdzeń to **silnik pure** (`plan-generation`) + **dwa kontrakty** (`validations/questionnaire`, `plan-results`) + **orkiestrator zapisu** (`persist-plan-version`). Projekt **solo** — wiedza u ownera; decyzje odrzucone żyją w `context/archive/`, nie w kodzie.

---

## Decyzje mapy (co traktować jako prawdę)

| # | Wniosek | Dowód |
|---|---|---|
| 1 | **Dwa „API wewnętrzne”** — zmiana pola w Zod ankiety lub DTO wyniku ma najszerszy blast radius | depcruise: 18← `validations/questionnaire`, 14← `plan-results` |
| 2 | **Granice zmiany ankiety** = `prisma/seed` + `validations/questionnaire` + `components/questionnaire` w jednym commicie | git co-change ≥5 commitów na parę |
| 3 | **Write path** jest wąski: tylko `persist-plan-version` ← 2 route handlery | depcruise focus; artifact-2 |
| 4 | **Read path** jest szeroki: `plan-results` → UI planu, dashboard, kalendarz, GET results | artifact-3 ekosystem |
| 5 | **Silnik bez I/O** — `plan-generation` nie importuje prisma/supabase | reguła depcruise `plan-generation-stays-pure`; 0 cykli |
| 6 | **Kosztorys i timeline osobno** — merged view świadomie odłożony | frame S-11, PRD open Q #2; artifact-3 |
| 7 | **Notatki per plan + slug**, nie per wersja; slug może zniknąć po recalculate | `timeline-notes/plan.md` |
| 8 | **Szum w historii git** — ignoruj `context/changes`, `.cursor/`, lockfile przy ocenie „hot spots” | artifact-1 filtr |

---

## Terytoria (gdzie się rusza)

### Stale aktywne (rdzeń, ≥10% commitów kodu)

`plan-generation/` · `(app)/` · `components/questionnaire/` · `prisma/` · `app/api/` · `validations/`

### Ostatnio gorące (burst, wyższe ryzyko regresji)

Google Calendar · timeline notes · kalibracja silnika + test-fixtures · E2E risk-07/08

### Stabilne (rzadko ruszane od MVP)

Auth/middleware · marketing landing · rate-limit · coaching-hints (copy w TS)

---

## Graf zależności (skrót)

```
ENTRY (pages, API — 0←, wiele→)
    ↓ kontrakty
validations/questionnaire.ts    plan-results.ts    routes.ts
    ↓                              ↓
plan-generation/ (pure)      plan/ + components/plan/
    ↓                              ↓
persist-plan-version ──→ prisma          integrations/google-calendar
         ↑
    POST plans / recalculate
```

**Centra (fan-in):** `utils.ts` (21, UI) · `validations/questionnaire` (18) · `plan-results` (14) · `prisma.ts` (13)  
**Cienkie wejścia:** `plan/[planId]/page.tsx`, route handlers — nikt ich nie importuje; ryzyko = **kompozycja**, nie coupling w górę.

---

## Blast radius — co pęknie

| Ruszasz | Transitive impact | Minimum testów |
|---|---|---|
| `validations/questionnaire.ts` | ankieta + silnik + API write | `questionnaire-inputs.test`, `questionnaire-pipeline.test`, risk-04 |
| `plan-results.ts` | UI plan, dashboard card, GET results, kalendarz | handler tests, risk-04, risk-07 |
| `prisma/seed.ts` | silnik, filtry, golden oracle | `calibration-seed-parity`, risk-04 |
| `persist-plan-version.ts` | tylko POST plans/recalculate | `persist-plan-version.test`, risk-04 |
| `plan-timeline.tsx` | notatki, coaching, eksport kalendarza | risk-07, risk-08 |

---

## Złote ścieżki (skrót)

| Ścieżka | Entry | Orkiestracja |
|---|---|---|
| **Generuj plan** | POST `/api/plans` | validate → persist → generate → refine → DB |
| **Pokaż wynik** | `/moj-plan/:id` | fetchPlanResults → GET results → DTO → timeline + tabela |
| **Przelicz** | POST `.../recalculate` | jak generuj + rate limit |
| **Notatki** | PUT `.../stage-notes` | slug z bieżącej wersji; orphan slugs niewidoczne |
| **Kalendarz** | POST `.../calendar-export` | OAuth osobno; każdy export = nowe eventy |

---

## Wiedza i ownership (solo)

| Pytanie | Odpowiedź |
|---|---|
| Kto zna kod? | **Emil Buszyło** — 100% commitów git |
| Kto implementuje? | Agenci Cursor z `plan.md`; brak pamięci między sesjami |
| Gdzie są decyzje? | `context/archive/*/frame.md`, `plan.md`, `impl-review.md` |
| Bus factor | **1** — nowy dev: ten plik + artifact-2 + archiwum przy obszarze |

### Przed zmianą w wynikach planu (FR-006/007/010)

1. `context/archive/2026-06-02-plan-results-polish-details/frame.md` — mobile timeline; **nie** merge widoków  
2. `context/archive/2026-06-11-timeline-notes/plan.md` — semantyka notatek  
3. `context/archive/2026-06-11-calendar-export/plan.md` — duplikaty Google Calendar  

---

## Ryzyka i coupling (podejrzane, nie cykle)

- **RSC → prisma** na dashboard/ankieta vs **fetchPlanResults** na plan page — dwa wzorce read  
- **`investment-state` → typ z `@prisma/client`** — kontrakt domenowy sprzężony z ORM  
- **Zmiana DTO** częściej w `results/route.ts` i UI niż w `plan-results.ts` — łatwo rozjechać assembler z typem  
- **Owner-only:** `pnpm db:migrate`, seed prod, Google Cloud OAuth, CI Supabase secrets  

---

## Indeks krytyczny (nawigacja agenta)

| Cel | Pliki |
|---|---|
| Nowe pytanie ankiety | `prisma/seed.ts`, `validations/questionnaire.ts`, `questionnaire-form.tsx`, `stage-filter.ts` |
| Koszt / harmonogram | `plan-generation/`, `persist-plan-version.ts` |
| Widok wyniku | `plan-results.ts`, `results/route.ts`, `plan-timeline.tsx`, `plan-cost-table.tsx` |
| Auth | `(auth)/actions.ts`, `middleware.ts`, `supabase/server.ts` |
| Reguły importów | `.dependency-cruiser.js`, `pnpm depcruise` |
| Produkt / scope | `context/foundation/prd.md`, `roadmap.md` |

---

## Stan mapy

| Artifact | Rola |
|---|---|
| [artifact-1](./artifact-1-territory.md) | Szczegóły terytorium, co-change, filtr szumu |
| [artifact-2](./artifact-2-structure.md) | Pełny graf, kontrakty, metryki fan-in |
| [artifact-3](./artifact-3-contributors.md) | Wiedza o `plan-results`, edge case'y, must-read |

*Mapa celowo krótka — szczegóły i liczby źródłowe w artifactach.*
