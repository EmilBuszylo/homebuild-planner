# Cost Calibration (S-01) — Plan Brief

> Full plan: `context/changes/cost-calibration/plan.md`
> Research: `context/changes/cost-calibration/research.md`

## What & Why

Kosztorys dla **stanu deweloperskiego** jest zaniżony (~3 300 PLN/m² vs rynek ~5 000–6 500 PLN/m²). S-01 kalibruje stawki **etap po etapie** na podstawie polskich cenników 2026, żeby produkt spełniał obietnicę orientacyjnej wyceny (FR-008/FR-009, US-01).

## Starting Point

18 etapów w `prisma/seed.ts`; engine w `src/lib/plan-generation/` stabilny. DEVELOPER rates odłożone przy S-02. Overlay `MarketBenchmark` (±25%) nie zastąpi złej bazy. E2E CI (F-01) chroni risk-04.

## Desired End State

Workbook z cytowalnymi stawkami per slug → seed zaktualizowany → testy oracle per etap → golden payload (120 m², DEVELOPER) w widełkach rynkowych. Owner po drop DB robi `pnpm db:seed`.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Metoda kalibracji | Etap-po-etapie z cenników | Unika mylącego skalowania jednego domu referencyjnego | User + Plan |
| Istniejące plany | Drop bazy, brak migracji | Faza testów; owner zrobi reset | User |
| Schema | Seed-only | Research: `MarketBenchmark` wystarczy bez migracji | Research |
| Overlay benchmarks | Wszystkie multipliers → 1.0 | Kalibracja w bazie lokalnej, bez podwójnej korekty | Plan |
| Oracle testów | Per-slug expectations z workbooku | Niezależne od `compute-costs.ts` | Research + Plan |
| Engine | Bez zmian | Stawki są danymi w seed | Research |

## Scope

**In scope:** `calibration-rates.md`, `prisma/seed.ts`, `market-benchmarks.json`, fixtures + Vitest oracle, weryfikacja E2E.

**Out of scope:** zmiana engine, regiony, typ dachu (S-02), migracja starych planów, pełna ankieta E2E.

## Architecture / Approach

```
Cenniki PL 2026 → calibration-rates.md (per slug)
       ↓
prisma/seed.ts (ConstructionStage + StageCostModifier)
       ↓
generatePlanResults (bez zmian) → applyMarketBenchmarks (×1.0)
       ↓
Vitest: calibrated-golden-expectations (per slug)
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Workbook | Tabela 18 slugów + źródła | Subiektywny wybór widełek z cenników |
| 2. Seed | Zastosowanie stawek + JSON 1.0 | Owner musi reseed po drop DB |
| 3. Oracle tests | Regresja per etap | Drift fixture vs seed jeśli niezsynchronizowane |
| 4. E2E verify | risk-04 green | Flaki CI przy Supabase (już ogarnięte F-01) |

**Prerequisites:** F-01 E2E CI done; research complete.  
**Estimated effort:** ~2–3 after-hours sessions across 4 phases.

## Open Risks & Assumptions

- Cenniki internetowe różnią się metodologią (m² użytkowa vs połaci vs punkty) — workbook musi mapować na reguły `effective-area.ts`.
- Economy/Premium mogą nie mieć osobnych cenników — przyjmujemy procent od Standard z workbooku.
- Bez regionalizacji — ogólnopolskie widełki wystarczą na MVP v3.

## Success Criteria (Summary)

- Golden payload DEVELOPER: **5 000–6 500 PLN/m²** po kalibracji.
- Każdy etap w ścieżce DEVELOPER: `estimatedCost > 0`.
- `pnpm test` + `pnpm test:e2e` zielone po implementacji.
