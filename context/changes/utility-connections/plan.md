# Utility Connections (S-05) Implementation Plan

## Overview

Dodać do ankiety i kosztorysu **osobne pozycje przyłączy zewnętrznych** (ścieki + woda + odległość od sieci), oddzielone od wewnętrznej instalacji wod-kan (`plumbing`, S-01). Zakres **B (full utilities)** z `/10x-plan`: `sewage_disposal`, `water_supply`, `utility_distance_band`, etapy `sewage_connection` + `water_connection`. Zmiany **seed-only** (bez migracji `schema.prisma`). Owner po merge: `pnpm db:seed` (drop DB opcjonalnie w testach).

## Current State Analysis

- **18 etapów** w `prisma/seed.ts`; `plumbing` (sortOrder 8) = tylko instalacja wewnętrzna, 194 Std PLN/m² (`research.md`, S-01 archive).
- Brak pytań o ścieki/wodę; brak slugów `sewage_connection` / `water_connection`.
- Ankieta: 3 kroki formularza + podsumowanie (`TOTAL_STEPS = 4`); kontrakt w `questionnaireFormSchema` + hardcoded `STEP_FIELDS` (`step-content.tsx:15-25`).
- Koszt przyłączy: engine obsługuje **flat modifiers** (`garage_gate`, kotłownia `heating`) — `compute-costs.ts:22-48`.
- Filtr etapów: jedyna reguła slug-specific = `garage_gate` (`stage-filter.ts:38-40`).
- Golden S-01: **599 650 PLN** (bez przyłączy); parity test na 18 slugów (`calibration-seed-parity.test.ts`).

### Key Discoveries:

- Nowe pytanie = **seed + Zod + UI step maps + fixtures** — nie sam `QuestionDefinition` (`research.md`).
- `utility_distance_band` jako **add-on flat** wymaga warunkowego stosowania modyfikatorów (nie stosować przy szambo/POŚ/studni) — mała rozszerzenie `compute-costs.ts`, nie tylko seed.
- Wstawienie 2 etapów na początku harmonogramu = **renumeracja `sortOrder` +2** dla istniejących 18 etapów.
- Cross-field walidacja (distance wymagane przy MUNICIPAL) tylko w `questionnaireInputsSchema`, **nie** w RHF resolver (`lessons.md`).

## Desired End State

1. `context/changes/utility-connections/utility-rates.md` — flat PLN Std per opcja + distance add-ons + golden sanity (MUNICIPAL/MUNICIPAL/≤50 m).
2. Ankieta: krok **„Przyłącza mediów”** z trzema pytaniami; UI ukrywa `utility_distance_band` gdy nie dotyczy (brak MUNICIPAL).
3. `prisma/seed.ts`: 2 nowe etapy (baza 0 PLN/m²), modyfikatory flat; **20 etapów** łącznie.
4. `stage-filter.ts`: ukryj `water_connection` gdy `water_supply === "NONE"`.
5. `compute-costs.ts`: modyfikatory `utility_distance_band` aktywne tylko na właściwym etapie i przy MUNICIPAL dla danej usługi.
6. Vitest: oracle rozszerzony (20 etapów), `stage-filter` unit tests, parity seed↔fixture.
7. `pnpm test`, `pnpm lint`, `pnpm build:ci`, `pnpm test:e2e` zielone; owner smoke: golden ~**619 650 PLN** (+20k przyłącza przy domyślnym B payload).

## What We're NOT Doing

- Zmiana stawek `plumbing` (S-01) ani innych 18 etapów poza `sortOrder` renumber.
- Opłaty administracyjne gminy / WiK (roadmap Parked).
- Eksploatacja (wywóz szamba, abonament POŚ).
- Odpowietrzenie kanalizacji / kominki wentylacyjne (S-05b, parked).
- Migracja `schema.prisma` / enumy Prisma (Path A — Zod enums tylko).
- Recalc / migracja istniejących planów użytkowników (drop DB / nowe wersje OK).
- Kalibracja regionalna; przekopy pod drogą jako osobny modyfikator (poza MVP).

## Implementation Approach

1. **Workbook** — flat PLN z researchu (środek widełek PL 2025–26), Economy/Premium jako −28% / +43% od Std (spójnie z seedem).
2. **Ankieta** — nowy krok 3; `questionnaireInputsSchema.refine` dla distance; UI conditional z `useWatch`.
3. **Seed** — 2 etapy na `sortOrder` 1–2; istniejące etapy +2; modyfikatory per `sewage_disposal` / `water_supply` / `utility_distance_band` (add-on).
4. **Engine** — `stage-filter` + `isDistanceBandModifierActive` w `compute-costs`.
5. **Testy** — rozszerzyć fixture S-01; nowy golden total; stage-filter tests.

## Critical Implementation Details

**Distance band add-ons:** Modyfikatory z `triggerQuestionSlug: "utility_distance_band"` dodają flat **tylko** gdy:
- na etapie `sewage_connection` → `sewage_disposal === "MUNICIPAL"`;
- na etapie `water_connection` → `water_supply === "MUNICIPAL"`.

Inaczej szambo + domyślne `UP_TO_50M` błędnie podbije koszt. Implementacja: funkcja `isModifierActive(modifier, stageSlug, responses)` wywoływana przed `applyModifier` — **nie** zmieniać `questionnaireFormSchema` resolvera o `.refine()` distance.

**sortOrder renumber:** Wstaw `sewage_connection` (1), `water_connection` (2); każdy istniejący etap `sortOrder += 2` (foundations 1→3, … garage_gate 18→20). `predecessorSlugs` utility: `[]`; `completedByState: FOUNDATIONS` (wczesna praca ziemna, w ścieżce DEVELOPER).

**Golden payload (scope B default):** `sewage_disposal: MUNICIPAL`, `water_supply: MUNICIPAL`, `utility_distance_band: UP_TO_50M` — suma przyłączy Std **20 000 PLN** (12k + 8k), total **619 650 PLN**.

## Phase 1: Workbook przyłączy (utility-rates)

### Overview

Udokumentować flat PLN per opcja ankiety — źródło prawdy dla seed i oracle.

### Changes Required:

#### 1. Utility rates workbook

**File**: `context/changes/utility-connections/utility-rates.md`

**Intent**: Tabela flat Std PLN dla `sewage_disposal` × 3, `water_supply` × 3, distance add-ons × 4 (per etap sewage/water), tier Economy/Premium; sekcja golden sanity.

**Contract**: Kolumny: `trigger`, `stage_slug`, `billing`, `Std PLN`, `Economy`, `Premium`, `source URL`, `notes`. Wartości docelowe Std (środek researchu):

| Trigger | Stage | Std PLN |
|---------|-------|---------|
| `MUNICIPAL` (sewage) | sewage_connection | 12 000 |
| `SEPTIC_TANK` | sewage_connection | 7 500 |
| `TREATMENT_PLANT` | sewage_connection | 17 500 |
| `MUNICIPAL` (water) | water_connection | 8 000 |
| `WELL` | water_connection | 22 000 |
| `UP_TO_50M` add-on | sewage/water (MUNICIPAL only) | 0 |
| `UP_TO_100M` add-on | sewage/water | +4 000 |
| `UP_TO_200M` add-on | sewage/water | +7 000 |
| `OVER_200M` add-on | sewage/water | +12 000 |

Golden: MUNICIPAL + MUNICIPAL + UP_TO_50M → +20 000 na 599 650 = **619 650 PLN**.

### Success Criteria:

#### Automated Verification:

- Plik `utility-rates.md` istnieje z tabelą triggerów + sekcją golden.

#### Manual Verification:

- Owner: widełki wyglądają realistycznie vs research (OnGeo, Dzialkopedia, Murator).

**Implementation Note**: Pauza na manual workbook przed Phase 2.

---

## Phase 2: Rozszerzenie ankiety

### Overview

Dodać 3 pytania i krok UI „Przyłącza mediów”; rozszerzyć kontrakt API bez łamania FR-004.

### Changes Required:

#### 1. Question definitions (seed)

**File**: `prisma/seed.ts` (`questions[]`)

**Intent**: Dodać `sewage_disposal` (required SINGLE_CHOICE), `water_supply` (required), `utility_distance_band` (required w seed, warunkowo w API).

**Contract**: Wartości:
- `sewage_disposal`: `MUNICIPAL` | `SEPTIC_TANK` | `TREATMENT_PLANT` (etykiety PL: kanalizacja gminna, szambo, oczyszczalnia).
- `water_supply`: `MUNICIPAL` | `WELL` | `NONE` (wodociąg, studnia, bez przyłącza wody).
- `utility_distance_band`: `UP_TO_50M` | `UP_TO_100M` | `UP_TO_200M` | `OVER_200M`.
- `sortOrder` po istniejących pytaniach (przed `key_date` lub po — spójnie z UI).

#### 2. Zod schemas

**File**: `src/lib/validations/questionnaire.ts`

**Intent**: Rozszerzyć `questionnaireFormSchema` o 3 pola; `questionnaireInputsSchema` z **drugim** `.refine()` (lub `.superRefine`): `utility_distance_band` wymagane iff `sewage_disposal === MUNICIPAL || water_supply === MUNICIPAL`. Gdy nie wymagane — akceptuj brak / ignoruj w koszcie.

**Contract**: `questionnaireFormSchema` bez refine distance (lesson). Eksport typów `SewageDisposal`, `WaterSupply`, `UtilityDistanceBand` jako `z.enum`.

#### 3. UI step wiring

**Files**: `step-content.tsx`, `step-progress.tsx`, `questionnaire-form.tsx`, `questionnaire-summary.tsx`

**Intent**: Wstawić krok 3 „Przyłącza mediów” (`sewage_disposal`, `water_supply`, `utility_distance_band`); `TOTAL_STEPS` 4→5; `STEP_NAMES` + `STEP_GROUPS` + `STEP_FIELDS[3]`.

**Contract**: W `step-content.tsx` / dedykowany fragment: renderuj `utility_distance_band` tylko gdy `useWatch` wykryje MUNICIPAL na ściekach lub wodzie. Domyślne `EMPTY_DEFAULTS`: `water_supply: "MUNICIPAL"`, `sewage_disposal: "MUNICIPAL"`, `utility_distance_band: "UP_TO_50M"`.

#### 4. Hints PL

**File**: `src/lib/questionnaire/hints/pl.ts`

**Intent**: Copy orientacyjne dla każdej opcji (bez opłat urzędowych; distance = metry od granicy działki do sieci).

#### 5. Responses parser

**File**: `src/lib/questionnaire/responses-to-inputs.ts`

**Intent**: Nowe slugi jako stringi (nie NUMBER_SLUGS).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (istniejące testy; nowe pola w fixtures w Phase 4)

#### Manual Verification:

- Krok „Przyłącza mediów” widoczny; distance chowa się przy szambo + studnia
- Submit ankiety z nowymi polami → 201/200 z API

**Implementation Note**: Pauza na manual UI przed Phase 3.

---

## Phase 3: Seed etapów, modyfikatory i engine

### Overview

Dodać 2 etapy, modyfikatory flat, renumber sortOrder, warunki filtra i distance gating.

### Changes Required:

#### 1. Construction stages

**File**: `prisma/seed.ts` (`stages[]`)

**Intent**: Dodać `sewage_connection`, `water_connection`; `sortOrder` 1 i 2; `costPerM2* = 0`; `category: "INSTALLATIONS"`; `completedByState: FOUNDATIONS`; `predecessorSlugs: []`. Zwiększyć `sortOrder` wszystkich dotychczasowych etapów o 2.

**Contract**: Opisy PL: przyłącze kanalizacji / przyłącze wody zewnętrzne; bez nakładania na `plumbing`.

#### 2. Stage cost modifiers

**File**: `prisma/seed.ts` (`modifiers[]`)

**Intent**: Flat per `sewage_disposal` (×3 tiery build_standard opcjonalnie — użyć jednego Std flat × mnożnik Economy/Premium w workbooku jako osobne wiersze lub 3× build_standard jak kotłownia); flat per `water_supply` (MUNICIPAL, WELL); 4× distance add-on **na każdy** etap (8 wierszy: 4 sewage + 4 water) z `triggerQuestionSlug: utility_distance_band`.

**Contract**: Wartości Std z `utility-rates.md`. Opisy bez tagu `[PERCENT]` / `[PER_UNIT]` → flat.

#### 3. Stage filter

**File**: `src/lib/plan-generation/stage-filter.ts`

**Intent**: Wyklucz `water_connection` gdy `water_supply === "NONE"`. `sewage_connection` zawsze gdy etap przechodzi filtr milestone (jak inne FOUNDATIONS+).

#### 4. Conditional distance modifiers

**File**: `src/lib/plan-generation/compute-costs.ts`

**Intent**: Przed sumowaniem modyfikatorów: pomiń distance band gdy usługa nie jest MUNICIPAL na danym `stageSlug`.

**Contract**: Funkcja `isModifierActive(modifier, stageSlug, responses): boolean`; wywołanie w `computeStageCost` przy iteracji `costModifiers`.

#### 5. Coaching hints (opcjonalnie)

**File**: `src/lib/plan/coaching-hints.ts`

**Intent**: Krótka notatka przy etapach utility (wczesna praca, uzgodnienia z operatorem — orientacyjnie).

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` (jeśli potrzebne) — bez zmian schema
- `pnpm lint` / `pnpm typecheck` pass
- Owner: `pnpm db:seed` — potem lokalnie `pnpm test` (pełny suite po Phase 4)

#### Manual Verification:

- Owner: po `db:seed` — w DB 20 `ConstructionStage`, nowe pytania w `QuestionDefinition`

**Implementation Note**: Agent **nie** uruchamia `db:migrate`. Owner seed przed manual verify.

---

## Phase 4: Testy oracle i regresja

### Overview

Rozszerzyć fixture S-01 do 20 etapów; zaktualizować golden; dodać stage-filter tests.

### Changes Required:

#### 1. Test fixtures

**Files**: `full-stages-calibration.ts`, `calibration-modifier-defs.ts`, `calibrated-golden-expectations.ts`

**Intent**: +2 etapy, +modyfikatory utility; golden expectations: `sewage_connection: 12_000`, `water_connection: 8_000`, `CALIBRATED_GOLDEN_TOTAL: 619_650` (lub osobna stała `UTILITY_GOLDEN_TOTAL` + test sumy — dokument w workbook).

**Contract**: Parity z seed po renumber; komentarz że total obejmuje scope B default.

#### 2. Parity test

**File**: `src/lib/plan-generation/calibration-seed-parity.test.ts`

**Intent**: `18` → `20` slugów; parity modifierów utility.

#### 3. Oracle tests

**Files**: `generate-plan-results.test.ts`, `questionnaire-pipeline.test.ts`

**Intent**: Per-stage asercje dla 2 nowych slugów; zaktualizować total i band ±2%.

#### 4. Stage filter unit tests

**File**: `src/lib/plan-generation/stage-filter.test.ts` (new)

**Intent**: `water_connection` ukryte dla `NONE`; oba widoczne dla MUNICIPAL/MUNICIPAL.

#### 5. Distance gating tests

**File**: `src/lib/plan-generation/compute-costs.test.ts` (new) lub rozszerzenie istniejącego

**Intent**: SEPTIC + UP_TO_100M → brak distance add-on na sewage; MUNICIPAL + UP_TO_100M → +4k.

#### 6. API / E2E fixtures

**Files**: `src/lib/api/test-fixtures/questionnaire-payload.ts`, `e2e/fixtures/golden-questionnaire-payload.ts`

**Intent**: Dodać 3 pola scope B default.

### Success Criteria:

#### Automated Verification:

- `pnpm test` passes
- `pnpm build:ci` passes

#### Manual Verification:

- — (none)

---

## Phase 5: E2E i domknięcie

### Overview

Potwierdzić golden path CI; owner smoke na świeżej bazie.

### Changes Required:

#### 1. E2E golden path

**File**: `e2e/risk-04-generate-golden-path.spec.ts`

**Intent**: Upewnić się że spec przechodzi z rozszerzonym payloadem (kosztorys niepusty; opcjonalnie asercja że wiersz „Przyłącze” / slug utility istnieje).

**Contract**: Zaktualizować fixture import jeśli hardcoded.

### Success Criteria:

#### Automated Verification:

- `pnpm test:e2e` passes (lub `pnpm test:e2e:risk-04`)

#### Manual Verification:

- Owner: `pnpm db:seed` → ankieta golden → kosztorys ~619k; widać osobne linie sewage/water
- Owner: wariant szambo + studnia → brak distance, water_connection według WELL

**Implementation Note**: Zaktualizować `change.md` → `implemented` po Phase 5.

---

## Testing Strategy

### Unit Tests:

- `stage-filter.test.ts` — NONE water, garage_gate regresja
- `compute-costs` / distance gating — SEPTIC vs MUNICIPAL × band
- Parity seed ↔ fixture (20 etapów)
- Oracle per-stage + total 619 650

### Integration Tests:

- `questionnaire-pipeline.test.ts` — band total po S-05

### Manual Testing Steps:

1. Golden path: MUNICIPAL/MUNICIPAL/≤50 m → +20k vs S-01 baseline
2. SEPTIC_TANK + WELL → distance ukryte; suma bez add-onów distance
3. `water_supply: NONE` → brak wiersza `water_connection`
4. Recalculate istniejącego planu z nowymi pytaniami (edit mode)

## Performance Considerations

Brak — 2 etapy i kilka modyfikatorów flat; ten sam pipeline O(n) etapów.

## Migration Notes

- **Brak migracji schema** — tylko `pnpm db:seed` (owner).
- Istniejące plany bez nowych odpowiedzi: przy recalculate użytkownik uzupełnia ankieta; brak auto-backfill.
- `sortOrder` renumber zmienia kolejność timeline w UI — oczekiwane.

## References

- Research: `context/changes/utility-connections/research.md`
- S-01 archive: `context/archive/2026-06-09-cost-calibration/`
- Roadmap S-05: `context/foundation/roadmap.md`
- Lessons: `context/foundation/lessons.md` (Zod refine, owner migrate, no hand-written migrations)
- Patterns: `prisma/seed.ts` (`garage_gate`), `stage-filter.ts:38-40`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Workbook przyłączy (utility-rates)

#### Automated

- [x] 1.1 `utility-rates.md` exists with trigger table + golden sanity section — 43f5379

#### Manual

- [x] 1.2 Owner reviews utility rates for plausibility vs market research — 43f5379

### Phase 2: Rozszerzenie ankiety

#### Automated

- [x] 2.1 `pnpm lint` passes — 0396994
- [x] 2.2 `pnpm typecheck` passes (+ `pnpm test` 63/63) — 0396994

#### Manual

- [ ] 2.3 Utilities step visible; distance field conditional; API accepts new payload

### Phase 3: Seed etapów, modyfikatory i engine

#### Automated

- [x] 3.1 `pnpm lint` and `pnpm typecheck` pass after engine changes (+ oracle fixtures 20-stage) — aa67c78

#### Manual

- [ ] 3.2 Owner: `pnpm db:seed` — 20 stages + 3 new questions in DB

### Phase 4: Testy oracle i regresja

#### Automated

- [ ] 4.1 `pnpm test` passes (20-stage oracle + stage-filter + distance gating)
- [ ] 4.2 `pnpm build:ci` passes

#### Manual

- [ ] 4.3 — (none)

### Phase 5: E2E i domknięcie

#### Automated

- [ ] 5.1 `pnpm test:e2e` passes (risk-04 golden path)

#### Manual

- [ ] 5.2 Owner smoke: golden questionnaire → cost table ~619k with separate utility rows
