---
date: 2026-06-09T14:30:00+00:00
researcher: Cursor Agent
git_commit: 966b778bbec860cf23bc2dc8b6e161d082c9fdd1
branch: master
repository: home-build-planner
topic: "S-01 cost-calibration — market rates, codebase gaps, schema vs seed"
tags: [research, cost-calibration, plan-generation, market-benchmark, developer-state]
status: complete
last_updated: 2026-06-09
last_updated_by: Cursor Agent
---

# Research: S-01 cost-calibration

**Date**: 2026-06-09  
**Researcher**: Cursor Agent  
**Git Commit**: [`966b778`](https://github.com/EmilBuszylo/homebuild-planner/commit/966b778bbec860cf23bc2dc8b6e161d082c9fdd1)  
**Branch**: master  
**Repository**: home-build-planner

## Research Question

Roadmap v3 S-01 (`cost-calibration`): jak skalibrować kosztorys na zweryfikowanych widełkach rynkowych PL, w szczególności **stan deweloperski**? Które etapy w codebase odbiegają najbardziej? Czy wystarczy aktualizacja seed/data, czy potrzebna zmiana schematu `MarketBenchmark`?

## Summary

1. **Koszt liczony jest w dwóch warstwach:** lokalna baza w `ConstructionStage` (`prisma/seed.ts`) → opcjonalny mnożnik kategorii `MarketBenchmark` (`applyMarketBenchmarks`). S-04 **nie naprawia** złych stawek bazowych — tylko mnoży wynik lokalny (clamp 0.85–1.25).

2. **DEVELOPER był świadomie odłożony** przy S-02 (skalibrowano CLOSED_SHELL). Roadmap v3 i archiwum first-plan-e2e potwierdzają: ścieżka DEVELOPER może dawać **nierzetelne sumy** do czasu S-01.

3. **Kalibracja = głównie dane seed**, nie schema: `costPerM2*` + `StageCostModifier` w `prisma/seed.ts`; opcjonalnie `prisma/data/market-benchmarks.json` + `pnpm benchmarks:import`. Model `MarketBenchmark` jest wystarczający dla overlay kategorii.

4. **Rynek PL 2026 (orientacyjnie):** stan deweloperski **~5 000–6 500 PLN/m²** użytkowej (samodzielna budowa, bez marży GW); dla 120 m² → **~540 000–780 000 PLN** łącznie. Szacunek z obecnych seedów dla golden payload (FROM_SCRATCH → DEVELOPER, 120 m², STANDARD) to **~400 000 PLN** (~3 300 PLN/m²) — **~25–35% poniżej** dolnej granicy rynku.

5. **Największe luki kalibracyjne:** 9 etapów z `completedByState: null` (tylko przy DEVELOPER — wykończenie/obudowa), instalacje (`electrical`, `plumbing`, `heating`), oraz per-unit modyfikatory `windows_doors` (baza 0 PLN/m²).

6. **Testy:** brak oracle PLN dla pełnej ścieżki DEVELOPER; są testy kierunkowe (area ↑, premium ↑) i E2E risk-04 (niepusty kosztorys). Po kalibracji warto dodać 1–2 asercje z niezależnym oracle (stałe z seed/fixture, nie kopia formuły).

7. **Ryzyko migracji:** zmiana seedów wpływa na **nowe** plany i **przeliczenia**; istniejące `PlanStageResult` pozostają do recalc. Strategia (auto-recalc vs zamrożone wersje) — decyzja dla `/10x-plan`.

## Detailed Findings

### Cost engine (FR-008)

Pipeline: `filterStages` → `computeStageCost` (per stage) → `scheduleTimeline` → opcjonalnie `applyMarketBenchmarks` → `PlanStageResult`.

```10:29:src/lib/plan-generation/generate-plan-results.ts
export function generatePlanResults(
  stages: ConstructionStageWithModifiers[],
  responses: ResponsesMap,
): PlanStageResultInput[] {
  const included = filterStages(stages, responses);
  // ...
  return included.map((stage) => ({
    stageSlug: stage.slug,
    estimatedCost: computeStageCost(stage, responses),
    // ...
  }));
}
```

**Formuła kosztu** (`src/lib/plan-generation/compute-costs.ts`):

- `total = basePerM2 × billingArea + sum(modifiers)`, `Math.round`
- `billingArea`: tylko `foundations` używa **footprint** (`area / floors`); reszta — pełna `area`
- Tiery: `ECONOMY` / `STANDARD` / `PREMIUM` z kolumn seed
- Modyfikatory: `[PERCENT:N]` (procent od bazy), `[PER_UNIT:slug]`, lub flat PLN/m²

### Investment state → które etapy wchodzą

Kolejność (`src/lib/investment-state.ts`):  
`FROM_SCRATCH(0) < FOUNDATIONS(1) < OPEN_SHELL(2) < CLOSED_SHELL(3) < DEVELOPER(4)`.

Reguły filtra (`src/lib/plan-generation/stage-filter.ts`):

- Etap z `completedByState` włączony gdy `order(start) < order(completed) ≤ order(target)`
- `completedByState === null` → **tylko** gdy `target === DEVELOPER` (wykończenie, elewacja, garaż)
- `garage_gate` pomijany gdy `garage_spots ≤ 0`

**Ścieżka DEVELOPER** (golden E2E: `FROM_SCRATCH` → `DEVELOPER`) obejmuje **wszystkie 18 slugów** (z garażem przy `garage_spots: 1`).

### Obecne stawki seed (18 etapów)

Źródło: `prisma/seed.ts` (~linie 179–448), komentarz „2025/2026 Polish market rates”.

| Slug | completedByState | Std PLN/m² | Uwagi |
|------|------------------|------------|--------|
| foundations | FOUNDATIONS | 690 | footprint billing |
| walls | OPEN_SHELL | 500 | +80/m² przy 2 kondygnacjach |
| floor_slabs | OPEN_SHELL | 300 | +70/m² przy 2 kondygnacjach |
| roof_structure | OPEN_SHELL | 235 | |
| roof_covering | CLOSED_SHELL | 185 | |
| windows_doors | CLOSED_SHELL | **0** | koszt z per-unit (okna/drzwi) |
| electrical | DEVELOPER | 150 | |
| plumbing | DEVELOPER | 130 | |
| heating | DEVELOPER | 220 | |
| insulation | null | 160 | tylko DEVELOPER |
| facade | null | 120 | tylko DEVELOPER |
| interior_plaster | null | 80 | tylko DEVELOPER |
| floor_screeds | null | 55 | tylko DEVELOPER |
| flooring | null | 140 | tylko DEVELOPER |
| painting | null | 25 | tylko DEVELOPER |
| bathroom_fixtures | null | 90 | tylko DEVELOPER |
| interior_doors | null | 55 | tylko DEVELOPER |
| garage_gate | null | **0** | flat 10 000 PLN (STANDARD izolacja) |

Per-unit (Std): okno 2 000 PLN, drzwi zewn. 6 500 PLN, balkon 14 000 PLN (`prisma/seed.ts` ~463–713).

### MarketBenchmark overlay (FR-009)

- Schema: `stageCategory` (unique) + `multiplier` — **brak FK** do etapu; join po `ConstructionStage.category`
- JSON: `prisma/data/market-benchmarks.json` — STRUCTURE/INSTALLATIONS/OPTIONAL **1.0**, ENVELOPE **1.05**, FINISHING **0.98**
- Stosowany w `persistPlanVersionWithResults` po `generatePlanResults` (`src/lib/plan/persist-plan-version.ts`)
- Nie zmienia harmonogramu; `refinementApplied` tylko gdy koszt się zmieni po zaokrągleniu

### Gap analysis: app vs rynek (DEVELOPER, 120 m², STANDARD)

**Golden payload** (`e2e/fixtures/golden-questionnaire-payload.ts`):  
`FROM_SCRATCH` → `DEVELOPER`, area 120, floors 2, garage 1, okna 12, drzwi 2, STANDARD.

| Źródło | Szacunek łączny | PLN/m² (120 m²) |
|--------|-----------------|-----------------|
| Obecny seed (lokalny engine, przed refinement) | ~**399 800 PLN** | ~**3 330** |
| Po refinement (ENVELOPE +5%, FINISHING −2%) | ~**405 000 PLN** | ~**3 375** |
| Rynek PL 2026 — stan deweloperski (widełki) | **540 000–780 000 PLN** | **5 000–6 500** |

Źródła rynkowe (web research, marzec–czerwiec 2026): OnGeo, domyiwnetrza.com, urokliwydom.pl — konsensus **5 000–6 500 PLN/m²** SDW; SSZ **3 700–4 500 PLN/m²** (do porównania z częścią strukturalną).

**Wniosek:** odchylenie nie wynika z buga filtra — to **niedoskalibrowane stawki**, zwłaszcza warstwa DEVELOPER-only (9 etapów null) i instalacje. Mnożniki `MarketBenchmark` (max +25%) **nie wystarczą** aby domknąć lukę ~50%+.

### Etapy z największym potencjałem korekty

| Priorytet | Obszar | Dlaczego |
|-----------|--------|----------|
| P0 | 9× `completedByState: null` | Tylko DEVELOPER; brak kalibracji od S-02 |
| P0 | electrical / plumbing / heating | Niskie PLN/m² vs szybko drożejące instalacje (OnGeo: +1,7% r/r SDW) |
| P1 | painting, flooring, bathroom_fixtures | Wykończenie — niskie stawki/m² |
| P1 | windows_doors per-unit | Baza 0 — błędne modyfikatory → ryzyko 0 PLN (znane z plan-brief S-02) |
| P2 | STRUCTURE (walls, roof) | CLOSED_SHELL skalibrowany; możliwy drift 2025→2026 |
| P2 | ENVELOPE multipliers | Opcjonalny tuning JSON zamiast podbijania każdego etapu |

### Schema vs seed (odpowiedź na unknown roadmapy)

| Zmiana | Wymaga migracji schema? |
|--------|-------------------------|
| Nowe `costPerM2*` / modifiers / opisy etapów | **Nie** — `pnpm db:seed` (owner) |
| Nowe multipliers / sourceName | **Nie** — JSON + `pnpm benchmarks:import` |
| Benchmark per-stage (nie per-category) | **Tak** — nowy model lub FK |
| Benchmark regionalny | **Tak** — nowe pola + ankieta |
| Snapshot benchmarku per `PlanVersion` | **Tak** — denormalizacja / tabela historii |
| Nowe pytanie (np. typ dachu S-02) | **Tak** — enum + `QuestionDefinition` + modifiers |

**Rekomendacja S-01:** kalibracja **seed-only** + ewentualnie JSON multipliers; bez zmiany `prisma/schema.prisma`.

## Code References

- `src/lib/plan-generation/compute-costs.ts` — formuła kosztu i modyfikatory
- `src/lib/plan-generation/stage-filter.ts` — reguły DEVELOPER / null `completedByState`
- `src/lib/plan-generation/effective-area.ts` — footprint tylko dla `foundations`
- `src/lib/plan-refinement/apply-market-benchmarks.ts` — overlay FR-009
- `src/lib/plan/persist-plan-version.ts` — integracja generate + refine
- `prisma/seed.ts` — **główny artefakt kalibracji**
- `prisma/data/market-benchmarks.json` — multipliers kategorii
- `e2e/fixtures/golden-questionnaire-payload.ts` — referencyjny payload kalibracji
- `e2e/risk-04-generate-golden-path.spec.ts` — CI gate po zmianach stawek

## Architecture Insights

- **Separation of concerns:** engine jest stabilny; stawki są danymi w DB/seed — kalibracja nie powinna dotykać `compute-costs.ts` bez potrzeby biznesowej.
- **DEVELOPER = najszerszy zestaw etapów** — każda zmiana stawek null-category ma duży wpływ na sumę i UX „stan deweloperski”.
- **windows_doors / garage_gate z bazą 0** — wymagają poprawnych per-unit/flat modifiers; test regresji na `estimatedCost > 0`.
- **Refinement jest kosmetyczny w MVP** — realna wiarygodność = lokalna baza.

## Historical Context (from prior changes)

- `context/archive/2026-05-27-plan-generation/change.md` — DEVELOPER rates **deferred**; CLOSED_SHELL calibrated
- `context/archive/2026-05-27-first-plan-e2e/plan-brief.md` — „DEVELOPER target may show implausible totals until calibration”
- `context/archive/2026-05-27-internet-refinement/plan.md` — FR-009 overlay; **nie zmienia** seed rates
- `context/archive/2026-06-08-e2e-ci-gate/` — F-01 done; risk-04 golden path w CI
- `context/foundation/roadmap.md` S-01 — north star, unknowns zmapowane w tym researchu

## Related Research

- `context/archive/2026-05-27-plan-generation/plan.md` — spec engine FR-008
- `context/archive/2026-05-27-internet-refinement/plan.md` — spec benchmarks FR-009
- `context/foundation/test-plan.md` — Risk #3 (benchmark sanity), Risk #4 (generate path)

## Open Questions — resolved (2026-06-09)

1. **Oracle kalibracji:** etap-po-etapie z cenników PL 2026 — workbook `calibration-rates.md`; golden sanity **5 050 PLN/m²** (606 040 PLN / 120 m²).
2. **Istniejące plany:** brak migracji — owner drop DB w fazie testów.
3. **Źródło prawdy w UI:** Phase 2 — `sourceName` + data researchu w `market-benchmarks.json` (bez zmian schema).
4. **Test oracle:** Phase 3 — per-stage stałe z workbooku; total widełki `[5 000, 6 500] PLN/m²` (plan Phase 3).
5. **Regionalizacja:** poza S-01; ogólnopolskie widełki OK na MVP v3.

## Plan decisions (2026-06-09)

- **Metoda:** etap-po-etapie z cenników rynkowych PL — **nie** skalowanie od jednego domu referencyjnego (decyzja użytkownika).
- **Istniejące plany:** brak migracji — owner zrobi **drop bazy** (faza testów).
- **Benchmarks:** multipliers → 1.0 po kalibracji bazowej w seed.
- **Plan:** `context/changes/cost-calibration/plan.md` (4 fazy).

## Recommended next step

Phase 1 workbook done → owner manual gate (plan 1.3) → `/10x-implement cost-calibration phase 2`.
