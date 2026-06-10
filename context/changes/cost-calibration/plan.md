# Cost Calibration (S-01) Implementation Plan

## Overview

Skalibrować orientacyjne stawki kosztorysu na podstawie **cenników rynkowych PL 2026 etap po etapie** — bez skalowania od jednego „domu referencyjnego”. Zmiany trafiają do `prisma/seed.ts` (oraz opcjonalnie neutralizacja `market-benchmarks.json`). Engine (`src/lib/plan-generation/`) pozostaje bez zmian. Owner po merge robi drop DB + `pnpm db:seed`.

## Current State Analysis

- Koszt = `filterStages` → `computeStageCost` (baza seed) → opcjonalnie `applyMarketBenchmarks` (mnożnik kategorii ±25%).
- **18 etapów** w `prisma/seed.ts`; ścieżka `FROM_SCRATCH` → `DEVELOPER` (golden payload) daje ~**400 k PLN** (~3 330 PLN/m²) vs rynek SDW **5 000–6 500 PLN/m²** (research).
- DEVELOPER rates **odłożone** przy S-02; 9 etapów `completedByState: null` + instalacje to główna luka.
- Testy: tylko kierunkowe (area ↑, premium ↑); brak oracle per etap.
- **Decyzje użytkownika:** cennik etapowy (nie dom referencyjny); brak strategii migracji — drop bazy OK.

### Key Discoveries:

- Kalibracja = **seed-only** — bez migracji `prisma/schema.prisma` (`research.md`).
- `windows_doors` / `garage_gate` mają bazę **0 PLN/m²** — koszt wyłącznie z modyfikatorów per-unit/flat.
- `foundations` billing = footprint (`area / floors`); reszta = pełna `area` (`effective-area.ts`).
- E2E risk-04 + CI gate — regresja po zmianie stawek musi przejść.

## Desired End State

1. `context/changes/cost-calibration/calibration-rates.md` — tabela per slug (Economy/Standard/Premium PLN/m², per-unit PLN, źródła URL, cytat/widełki).
2. `prisma/seed.ts` odzwierciedla workbook; suma golden payload (120 m², STANDARD, DEVELOPER) w widełkach **~5 000–6 500 PLN/m²** (~600–780 k PLN), bez sztucznego dopasowania jednym mnożnikiem.
3. `market-benchmarks.json` — multipliers **1.0** dla wszystkich kategorii (kalibracja w bazie, nie overlay); zaktualizowany `sourceName` + data researchu.
4. Vitest: asercje **per etap** dla golden payload (stałe z workbooku, nie kopia formuły z `compute-costs.ts`).
5. `pnpm test`, `pnpm lint`, `pnpm build:ci`, `pnpm test:e2e` zielone; owner po drop DB: `pnpm db:seed`.

## What We're NOT Doing

- Zmiana engine (`compute-costs.ts`, `stage-filter.ts`) — chyba że odkryty zostanie bug (poza scope).
- Migracja / recalc istniejących planów użytkowników.
- Kalibracja regionalna (województwa).
- Nowe pytania ankiety (typ dachu → S-02).
- Zmiana schematu `MarketBenchmark` (per-stage FK).
- Pełny Playwright walkthrough ankiety.

## Implementation Approach

1. **Workbook** — dla każdego z 18 slugów: zbierz 1–2 źródła PL (OnGeo, Aluhaus breakdown, branżowe widełki), przelicz na `costPerM2*` / per-unit zgodnie z regułami billingu engine.
2. **Seed** — zaktualizuj `stages` + `stageCostModifiers` w `prisma/seed.ts`; zachowaj strukturę slugów/DAG; Economy ≈ −25–30%, Premium ≈ +40–60% względem Standard (spójnie z obecnym seedem, chyba że cennik podaje inaczej).
3. **Benchmarks** — wyzeruj overlay (1.0), żeby nie podwajać korekty.
4. **Oracle tests** — plik expectations z liczbami z workbooku; test na pełnym zestawie etapów (fixture lustrzany seed lub wczytany z jednego źródła stałych).
5. **Weryfikacja** — automated gates + owner manual na świeżej bazie.

## Critical Implementation Details

**Metoda cennikowa (nie dom referencyjny):** dla każdego slugu osobno mapuj pozycję z cennika na pole seed:
- PLN/m² użytkowej → `costPerM2Standard` (oraz Economy/Premium z widełek lub procentem od Standard).
- PLN/szt. (okna, drzwi, balkon) → `StageCostModifier` `[PER_UNIT:slug]`.
- PLN ryczałt (kotłownia, brama) → `fixedCostAdjustment` flat modifier.
- Izolacja ENHANCED/PASSIVE → `[PERCENT:N]` (bez zmiany mechanizmu).

**Walidacja sumy:** po ustaleniu stawek per etap, policz golden payload ręcznie (arkusz / skrypt jednorazowy) i sprawdź PLN/m² ∈ [5 000, 6 500]. Jeśli poza widełkami — **koryguj pojedyncze etapy**, nie globalny mnożnik.

**windows_doors:** utrzymaj bazę 0; skalibruj per-unit do rynku 2026 (obecnie 2 000 / 6 500 PLN/szt. Std).

## Phase 1: Cennik etapowy (workbook)

### Overview

Udokumentować docelowe stawki per slug z cytowalnych źródeł PL; to jest źródło prawdy dla seed i testów.

### Changes Required:

#### 1. Calibration workbook

**File**: `context/changes/cost-calibration/calibration-rates.md`

**Intent**: Jedna tabela per `slug` (18 wierszy) + sekcja modyfikatorów per-unit/percent/flat.

**Contract**: Kolumny minimum: `slug`, `category`, `billing rule`, `current Std PLN/m²`, `target Std PLN/m²`, `target Economy`, `target Premium`, `per-unit/flat notes`, `source URL`, `source excerpt (1 linia)`. Sekcja „Golden payload sanity”: szacunek sumy per etap dla `validQuestionnairePayload` i PLN/m² total. Źródła min. 2 niezależne dla kategorii INSTALLATIONS + FINISHING (najsłabsze dziś).

#### 2. Research appendix update

**File**: `context/changes/cost-calibration/research.md`

**Intent**: Zamknąć open questions z sekcji „Open Questions” — odnośnik do workbooku i decyzji użytkownika.

**Contract**: Krótka sekcja „Plan decisions (2026-06-09)” na końcu: etap-po-etapie, drop DB, benchmarks → 1.0.

### Success Criteria:

#### Automated Verification:

- Plik `calibration-rates.md` istnieje i ma 18 wierszy slug + sekcję modifiers.
- Wszystkie `target Std` > 0 dla etapów z bazą > 0; `windows_doors`/`garage_gate` mają opisane per-unit/flat > 0.

#### Manual Verification:

- Owner przegląda workbook: stawki wyglądają realistycznie vs własna wiedza rynkowa (orientacyjnie).
- Suma golden (ręcznie) mieści się w 5 000–6 500 PLN/m².

**Implementation Note**: Po automated verification zatrzymaj się na potwierdzenie manual workbook przez ownera przed Phase 2.

---

## Phase 2: Aktualizacja seed i benchmarks

### Overview

Zastosować liczby z workbooku w `prisma/seed.ts`; zneutralizować overlay JSON.

### Changes Required:

#### 1. Construction stages and modifiers

**File**: `prisma/seed.ts`

**Intent**: Podmienić `costPerM2Economy|Standard|Premium` i wpisy `stageCostModifiers` zgodnie z `calibration-rates.md`. Zaktualizować komentarz nagłówka (data kalibracji, źródła).

**Contract**: Bez zmiany `slug`, `sortOrder`, `predecessorSlugs`, `completedByState`, `category`. Upsert semantics bez zmian. Każdy etap w ścieżce DEVELOPER musi dawać `estimatedCost > 0` dla golden payload po `computeStageCost`.

#### 2. Market benchmarks neutral

**File**: `prisma/data/market-benchmarks.json`

**Intent**: Wszystkie `multiplier: 1.0`; `sourceName` np. „Kalibracja bazowa S-01 (2026-06)” — overlay nie koryguje już błędnej bazy.

**Contract**: 5 kategorii bez zmiany kluczy; Zod import w `scripts/import-market-benchmarks.ts` nadal przechodzi.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (istniejące testy — mogą wymagać aktualizacji tylko jeśli dotykają stawek; na tym etapie jeszcze bez nowego oracle)

#### Manual Verification:

- Owner: drop DB → `pnpm db:docker:up` (jeśli lokalnie) → `pnpm db:seed` → wygeneruj plan golden w UI lub `POST /api/plans` — suma kosztorysu w widełkach rynkowych.

**Implementation Note**: Agent **nie** uruchamia `pnpm db:migrate` / `db:seed` — owner po Phase 2 manual.

---

## Phase 3: Oracle testów per etap

### Overview

Zablokować regresję kalibracji testami Vitest z expectations z workbooku (nie z implementacji `compute-costs`).

### Changes Required:

#### 1. Full-stage test fixture

**File**: `src/lib/plan-generation/test-fixtures/full-stages-calibration.ts` (new)

**Intent**: Tablica 18 etapów z tymi samymi stawkami co seed (skopiowane z workbooku / seed po Phase 2) + modifiers — wystarczy do `generatePlanResults` bez Prisma.

**Contract**: Eksport `fullStagesForCalibration` typu zgodnego z `ConstructionStageWithModifiers[]` używanym przez engine. Wartości liczbowe muszą być **identyczne** z `calibration-rates.md` (jedno źródło: najpierw workbook, potem seed i fixture zsynchronizowane).

#### 2. Golden expectations

**File**: `src/lib/plan-generation/test-fixtures/calibrated-golden-expectations.ts` (new)

**Intent**: Mapa `slug → expected estimatedCost` dla `validQuestionnairePayload` — liczby policzone z workbooku (ręcznie/skryptem), nie wywołaniem `computeStageCost` w teście.

**Contract**: Eksport `CALIBRATED_GOLDEN_EXPECTATIONS: Record<string, number>` i `CALIBRATED_GOLDEN_TOTAL_MIN/MAX` (widełki ±2% od sumy workbook lub sztywna suma jeśli zaokrąglenia deterministyczne).

#### 3. Test cases

**File**: `src/lib/plan-generation/generate-plan-results.test.ts`

**Intent**: Nowe case’y: (a) każdy oczekiwany slug z golden DEVELOPER path ma koszt = expectation; (b) suma ∈ [MIN, MAX]; (c) zachować istniejące testy kierunkowe.

**Contract**: Użyć `fullStagesForCalibration` + `validQuestionnairePayload`. Nie importować `prisma/seed.ts` w teście.

#### 4. Pipeline smoke (optional thin)

**File**: `src/lib/questionnaire/questionnaire-pipeline.test.ts`

**Intent**: Jeśli test używa minimal stages — zostaw; opcjonalnie jedna asercja że full pipeline z full fixture ma `totalCost` w widełkach.

**Contract**: Bez DB.

### Success Criteria:

#### Automated Verification:

- `pnpm test` passes (w tym nowe oracle)
- `pnpm lint` passes
- `pnpm build:ci` passes

#### Manual Verification:

- Brak — pokryte automated.

---

## Phase 4: Weryfikacja E2E i domknięcie

### Overview

Potwierdzić że risk-04 i CI nadal przechodzą; owner reseed produkcyjnej/dev bazy.

### Changes Required:

#### 1. E2E risk-04

**File**: `e2e/risk-04-generate-golden-path.spec.ts`

**Intent**: Bez zmian funkcjonalnych — tylko jeśli kalibracja zmieni copy UI (nie powinna). Uruchomić i naprawić tylko przy failu.

**Contract**: Nadal: POST 201/409, widoczny kosztorys + tabela + harmonogram.

### Success Criteria:

#### Automated Verification:

- `pnpm test:e2e` passes (lokalnie z Supabase + Docker jeśli owner; CI na PR)

#### Manual Verification:

- Owner: drop Supabase/Postgres danych domenowych → `pnpm db:seed` → smoke: nowy user, golden plan, suma na stronie planu w widełkach SDW.
- Owner potwierdza workbook + UI copy „orientacyjne” nadal adekwatne.

---

## Testing Strategy

### Unit Tests:

- Per-slug oracle (`calibrated-golden-expectations.ts`) — główna ochrona regresji.
- Istniejące directional tests — muszą przejść bez osłabiania.
- `apply-market-benchmarks.test.ts` — bez zmian zachowania (multiplier 1.0 w seedzie JSON).

### Integration Tests:

- `plans-route-handlers.test.ts` Risk #4 — nadal `estimatedCost > 0` na create (może wzrosnąć magnitude — OK).

### Manual Testing Steps:

1. Drop DB (owner).
2. `pnpm db:seed`.
3. Zarejestruj użytkownika → `POST /api/plans` golden payload → `/moj-plan/:id` — tabela niepusta, suma ~5–6.5k PLN/m².
4. Opcjonalnie: plan CLOSED_SHELL only (target OPEN_SHELL→CLOSED_SHELL) — suma niższa niż DEVELOPER, bez regresji względem wcześniejszej kalibracji S-02.

## Performance Considerations

Brak — zmiana danych seed, nie hot path.

## Migration Notes

**Brak migracji użytkowników** — owner robi drop bazy i `pnpm db:seed`. Po deploy na Vercel: owner `prisma migrate deploy` (jeśli brak zmian schema — tylko seed) + seed na preview/prod według deploy-plan.

## References

- Research: `context/changes/cost-calibration/research.md`
- Roadmap S-01: `context/foundation/roadmap.md`
- Engine: `src/lib/plan-generation/`, `prisma/seed.ts`
- Golden payload: `src/lib/api/test-fixtures/questionnaire-payload.ts`
- E2E: `e2e/risk-04-generate-golden-path.spec.ts`
- Archived S-02: `context/archive/2026-05-27-plan-generation/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Cennik etapowy (workbook)

#### Automated

- [x] 1.1 `calibration-rates.md` exists with 18 slugs + modifiers section
- [x] 1.2 Golden sum documented in workbook within 5 000–6 500 PLN/m²

#### Manual

- [x] 1.3 Owner reviews workbook rates for plausibility — 15ccc17

### Phase 2: Aktualizacja seed i benchmarks

#### Automated

- [x] 2.1 `pnpm lint` passes — 6e6965f
- [x] 2.2 `pnpm typecheck` passes — 6e6965f
- [x] 2.3 `pnpm test` passes — 6e6965f

#### Manual

- [ ] 2.4 Owner: drop DB + `pnpm db:seed` + golden plan total in market range

### Phase 3: Oracle testów per etap

#### Automated

- [x] 3.1 `pnpm test` passes (per-stage oracle + existing tests) — e9ac8b7
- [x] 3.2 `pnpm build:ci` passes — e9ac8b7

#### Manual

- [x] 3.3 — (none) — e9ac8b7

### Phase 4: Weryfikacja E2E i domknięcie

#### Automated

- [x] 4.1 `pnpm test:e2e` passes — 8a4035c

#### Manual

- [ ] 4.2 Owner smoke on fresh DB after seed
