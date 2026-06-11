# Questionnaire Roof Type (S-02) Implementation Plan

## Overview

Dodać do ankiety wybór **typu dachu** (`roof_type`) i odzwierciedlić różnice kosztowe w istniejących etapach `roof_structure` i `roof_covering` przez `StageCostModifier` — **bez nowych etapów**, **bez zmian DAG**, **bez migracji Prisma** (Path A seed-only). Baseline dwuspadowy (`GABLE`) = obecne stawki S-01; golden S-05 (**619 650 PLN**) pozostaje bez zmian przy domyślnym payloadzie.

## Current State Analysis

- **20 etapów**, **16 pytań**, **44 modyfikatory** po S-05 (`utility-connections` archive).
- Dach skalibrowany S-01: `roof_structure` Std **320 PLN/m²**, `roof_covering` Std **250 PLN/m²** → golden 120 m²: **38 400 + 30 000 PLN**.
- Jedyny modifier na więźbie: `insulation_level` → `[PERCENT:15]` / `[PERCENT:30]` na `roof_structure` tylko (`prisma/seed.ts:561-600`).
- Ankieta: 5 kroków formularza + podsumowanie; krok 1 „Parametry budynku” ma `has_attic` — naturalne miejsce na `roof_type`.
- Brak sluga `roof_type` w Zod, seedzie, UI i fixture'ach.
- Parser `[PERCENT:N]` akceptuje tylko dodatnie N (`parse-modifier.ts:8`); ujemny rabat płaskiego dachu → **flat** `fixedCostAdjustment` (wzorzec `garage_gate`).

### Key Discoveries:

- Nowe pytanie = **seed + Zod + UI step maps + fixtures + modyfikatory** — nie sam `QuestionDefinition` (lekcja S-05).
- **Nie** wymaga `stage-filter.ts` ani `compute-costs.ts` — engine już sumuje percent + flat modifiers addytywnie.
- **Stackowanie:** `roof_type` + `insulation_level` mogą być aktywne jednocześnie na `roof_structure` (oba percent liczone od tej samej bazy `basePerM2 × area`).
- Powierzchnia połaci vs użytkowa — **poza MVP**; % na m² użytkowej jak S-01.

## Desired End State

1. `context/changes/questionnaire-roof-type/roof-rates.md` — % uplifty / flat PLN per typ + golden sanity (GABLE baseline + scenariusze HIP/MANSARD/FLAT).
2. Ankieta: pole `roof_type` w kroku 1 (obok `has_attic`); **bez** nowego kroku wizarda (`TOTAL_STEPS` bez zmian).
3. `prisma/seed.ts`: 1 pytanie SINGLE_CHOICE + **6** nowych modyfikatorów (HIP×2, MANSARD×2, FLAT×2); **20 etapów** bez zmian.
4. Vitest: oracle z `roof_type: "GABLE"` → total **619 650**; osobne testy scenariuszy HIP/MANSARD/FLAT + stacking z `insulation_level`.
5. `pnpm test`, `pnpm lint`, `pnpm build:ci` zielone; E2E risk-04 z rozszerzonym payloadem (GABLE default).

## What We're NOT Doing

- Nowe etapy (`roof_flashing` itd.) ani zmiana `predecessorSlugs` / `sortOrder`.
- Migracja `schema.prisma` / enum Prisma `RoofType` (Path B — parked).
- Wartość enum `HIP_GABLE` w MVP — kopertowy i czterospadowy **scalone** w jednej opcji UI `HIP`.
- Rozszerzenie parsera `[PERCENT:-N]` — FLAT używa flat negative zamiast tagu percent.
- Mnożnik powierzchni połaci (osobny od m² użytkowej).
- Coupling `roof_type` ↔ `has_attic` (niezależne pola).
- Zmiana stawek bazowych S-01 (320/250) ani etapów utility S-05.
- Recalc / backfill istniejących planów bez ponownej ankiety.

## Implementation Approach

1. **Workbook** — % z researchu (środek widełek PL 2024–26); FLAT structure jako flat −11 520 PLN Std przy 120 m² (= −30% od 38 400).
2. **Ankieta** — 4 opcje UI; wymagane pole, default `GABLE` w `EMPTY_DEFAULTS`.
3. **Seed** — tylko pytanie + modyfikatory; owner `pnpm db:seed`.
4. **Testy** — fixture parity 50 modifierów; scenariusze total; opcjonalny test stackowania ENHANCED + HIP.
5. **E2E** — dodać `roof_type: "GABLE"` do golden payload (koszt bez zmian).

## Critical Implementation Details

### Decyzje zamknięte (z research + plan)

| # | Decyzja | Wybór |
|---|---------|-------|
| 1 | Liczba opcji UI | **4** — `GABLE`, `HIP`, `MANSARD`, `FLAT` (bez osobnego czterospadowego) |
| 2 | Wymagalność | **Wymagane**, default `GABLE` (FR-004) |
| 3 | Rabat płaski dach | **Flat** `fixedCostAdjustment: -11520` na `roof_structure` (bez `[PERCENT]`); `+5%` na `roof_covering` via `[PERCENT:5]` |
| 4 | Schema | **Seed-only Path A** — Zod enum, bez `db:migrate` |
| 5 | Umiejscowienie UI | Krok **1**, po `has_attic` |

### Tabela modyfikatorów (Std, 120 m² użytkowej)

| `roof_type` | `roof_structure` | `roof_covering` | Suma dachu Std | Δ vs GABLE |
|-------------|------------------|-----------------|----------------|------------|
| `GABLE` | (brak wiersza) | (brak) | **68 400** | 0 |
| `HIP` | `[PERCENT:25]` → +9 600 | `[PERCENT:15]` → +4 500 | **82 500** | +14 100 |
| `MANSARD` | `[PERCENT:80]` → +30 720 | `[PERCENT:20]` → +6 000 | **105 120** | +36 720 |
| `FLAT` | flat **−11 520** | `[PERCENT:5]` → +1 500 | **58 380** | −10 020 |

Opisy seed (przykład HIP structure): `"Typ kopertowy — więźba [PERCENT:25]"`; FLAT structure: `"Dach płaski — uproszczona konstrukcja"` (bez tagu — flat z `fixedCostAdjustment: -11520`, `costAdjustmentPerM2: 0`).

### Stackowanie percent (przykład testowy)

Payload: `roof_type: HIP`, `insulation_level: ENHANCED`, Std, 120 m²:

- Baza `roof_structure`: 38 400
- HIP +25%: +9 600
- ENHANCED +15%: +5 760 (od bazy, nie od sumy po HIP)
- **Wynik więźba:** 53 760 PLN

### Golden payload (bez zmian totalu)

Domyślny calibrated payload (S-01 + S-05): dodać `roof_type: "GABLE"` — `CALIBRATED_GOLDEN_TOTAL` pozostaje **619 650 PLN**.

Scenariusze total (Std, DEVELOPER, utilities MUNICIPAL/MUNICIPAL/≤50 m):

| `roof_type` | Total PLN |
|-------------|-----------|
| `GABLE` | **619 650** |
| `HIP` | **633 750** |
| `MANSARD` | **656 370** |
| `FLAT` | **609 630** |

## Phase 1: Workbook typów dachu (roof-rates)

### Overview

Udokumentować % uplifty i flat PLN per typ — źródło prawdy dla seed i oracle.

### Changes Required:

#### 1. Roof rates workbook

**File**: `context/changes/questionnaire-roof-type/roof-rates.md`

**Intent**: Tabela triggerów `roof_type` × etap (`roof_structure`, `roof_covering`); kolumny: typ, stage, mechanizm (`[PERCENT:N]` / flat PLN), Std PLN przy 120 m², źródło rynkowe, notes. Sekcja golden sanity (4 scenariusze total z tabeli powyżej). Sekcja stackowania z `insulation_level`.

**Contract**: Wartości Std zgodne z tabelą modyfikatorów w sekcji Critical Implementation Details. Economy/Premium: percent modifiers skalują się przez tier base rate (jak S-01); flat FLAT structure skaluje proporcjonalnie tier multiplier lub pozostaje Std-only w MVP — **rekomendacja MVP:** jeden wiersz flat Std −11 520 (Economy/Premium przez ten sam % rabatu od tier base przy apply — dokument w workbooku jako „flat Std; tier follows base rate scaling”).

### Success Criteria:

#### Automated Verification:

- Plik `roof-rates.md` istnieje z tabelą triggerów + sekcją golden + stackowaniem.

#### Manual Verification:

- Owner: widełki % vs research (Murator, Markbuild, Pruszyński) wyglądają realistycznie.

**Implementation Note**: Pauza na manual workbook przed Phase 2.

---

## Phase 2: Rozszerzenie ankiety

### Overview

Dodać jedno pytanie `roof_type` w kroku 1; rozszerzyć kontrakt API bez nowego kroku wizarda.

### Changes Required:

#### 1. Question definition (seed)

**File**: `prisma/seed.ts` (`questions[]`)

**Intent**: Dodać `roof_type` (required SINGLE_CHOICE), `sortOrder` po `has_attic` (przed `garage_spots` lub zaraz po — spójnie z UI).

**Contract**: Wartości enum:
- `GABLE` — etykieta PL: „Dwuspadowy”
- `HIP` — „Kopertowy” (hint: obejmuje czterospadowy)
- `MANSARD` — „Mansardowy”
- `FLAT` — „Płaski”

#### 2. Zod schemas

**File**: `src/lib/validations/questionnaire.ts`

**Intent**: `roofTypeSchema = z.enum(["GABLE", "HIP", "MANSARD", "FLAT"])`; pole w `questionnaireFormSchema` i `questionnaireInputsSchema` (required string).

**Contract**: Eksport typu `RoofType`. Brak cross-field refine (niezależne od `has_attic`).

#### 3. UI step wiring

**Files**: `step-content.tsx`, `questionnaire-summary.tsx` (ew. `questionnaire-form.tsx` jeśli defaults)

**Intent**: Dodać `roof_type` do `STEP_FIELDS[1]` po `has_attic`; `EMPTY_DEFAULTS.roof_type: "GABLE"`.

**Contract**: `TOTAL_STEPS` i `STEP_NAMES` **bez zmian** (nadal 5 kroków). Radio/select SINGLE_CHOICE jak inne pola.

#### 4. Hints PL

**File**: `src/lib/questionnaire/hints/pl.ts`

**Intent**: Orientacyjny copy per typ (wpływ na koszt więźby/krycia; bez obietnic wiążących).

#### 5. Responses parser

**File**: `src/lib/questionnaire/responses-to-inputs.ts`

**Intent**: `roof_type` jako string slug (nie w `NUMBER_SLUGS`).

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (fixtures w Phase 4)

#### Manual Verification:

- Krok 1 pokazuje wybór typu dachu; default dwuspadowy; podsumowanie wyświetla etykietę PL
- Submit ankiety z `roof_type` → 201/200 z API

**Implementation Note**: Pauza na manual UI przed Phase 3.

---

## Phase 3: Seed modyfikatorów

### Overview

Dodać 6 wierszy `StageCostModifier` na `roof_structure` i `roof_covering`; **bez** zmian engine, etapów ani DAG.

### Changes Required:

#### 1. Stage cost modifiers

**File**: `prisma/seed.ts` (`modifiers[]`)

**Intent**: Po sekcji `insulation_level` → roof, dodać:

| stage | trigger | value | costAdjustmentPerM2 | fixedCostAdjustment | description |
|-------|---------|-------|----------------------|---------------------|-------------|
| roof_structure | roof_type | HIP | 0 | 0 | `… [PERCENT:25]` |
| roof_covering | roof_type | HIP | 0 | 0 | `… [PERCENT:15]` |
| roof_structure | roof_type | MANSARD | 0 | 0 | `… [PERCENT:80]` |
| roof_covering | roof_type | MANSARD | 0 | 0 | `… [PERCENT:20]` |
| roof_structure | roof_type | FLAT | 0 | **-11520** | flat (bez tagu percent) |
| roof_covering | roof_type | FLAT | 0 | 0 | `… [PERCENT:5]` |

**Contract**: Brak wierszy dla `GABLE`. Wartości z `roof-rates.md`. `buildStandard` null (jak insulation) — jeden wiersz per trigger.

#### 2. Engine

**Brak zmian** w `compute-costs.ts`, `stage-filter.ts`, `parse-modifier.ts`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` / `pnpm typecheck` pass

#### Manual Verification:

- Owner: `pnpm db:seed` — 17 pytań, 50 modyfikatorów (44 + 6), 20 etapów

**Implementation Note**: Agent **nie** uruchamia `db:migrate`. Owner seed przed manual verify i testami oracle.

---

## Phase 4: Testy oracle i regresja

### Overview

Rozszerzyć fixture o `roof_type` i 6 modyfikatorów; zaktualizować golden; dodać scenariusze per typ.

### Changes Required:

#### 1. Test fixtures

**Files**: `calibration-modifier-defs.ts`, `calibrated-golden-expectations.ts`, `full-stages-calibration.ts` (jeśli dotyczy)

**Intent**: +6 modifier defs; golden payload: `roof_type: "GABLE"`; `CALIBRATED_GOLDEN_TOTAL: 619_650` bez zmian; per-stage roof bez zmian przy GABLE.

**Contract**: Stałe scenariuszy (opcjonalnie w osobnym pliku lub `describe` blocks):
- `ROOF_HIP_GOLDEN_TOTAL: 633_750`
- `ROOF_MANSARD_GOLDEN_TOTAL: 656_370`
- `ROOF_FLAT_GOLDEN_TOTAL: 609_630`

#### 2. Parity test

**File**: `src/lib/plan-generation/calibration-seed-parity.test.ts`

**Intent**: 44 → **50** modyfikatorów; 20 etapów bez zmian.

#### 3. Oracle / pipeline tests

**Files**: `generate-plan-results.test.ts`, `questionnaire-pipeline.test.ts`

**Intent**: GABLE regresja 619 650; HIP/MANSARD/FLAT total ±2% band; opcjonalnie per-stage `roof_structure`/`roof_covering` dla HIP.

#### 4. Modifier stacking test

**File**: `src/lib/plan-generation/compute-costs.test.ts` (rozszerzenie) lub nowy `roof-modifiers.test.ts`

**Intent**: HIP + ENHANCED → `roof_structure` = 53 760 Std przy 120 m².

#### 5. API / E2E fixtures

**Files**: `src/lib/api/test-fixtures/questionnaire-payload.ts`, `e2e/fixtures/golden-questionnaire-payload.ts`

**Intent**: `roof_type: "GABLE"` w golden payload.

### Success Criteria:

#### Automated Verification:

- `pnpm test` passes
- `pnpm build:ci` passes

#### Manual Verification:

- — (none)

---

## Phase 5: E2E i domknięcie

### Overview

Potwierdzić golden path z `roof_type`; owner smoke na świeżej bazie.

### Changes Required:

#### 1. E2E golden path

**File**: `e2e/risk-04-generate-golden-path.spec.ts` (fixture import)

**Intent**: Payload z `roof_type: "GABLE"`; kosztorys niepusty; brak regresji vs ~619k (asercja luźna jeśli już jest).

### Success Criteria:

#### Automated Verification:

- `pnpm test:e2e:risk-04` passes (wymaga działającego Supabase w `.env.local`)

#### Manual Verification:

- Owner: `pnpm db:seed` → ankieta golden (GABLE) → kosztorys ~619k; zmiana na HIP → wzrost ~14k na dachu
- Owner: FLAT → total ~609k

**Implementation Note**: Zaktualizować `change.md` → `implemented` po Phase 5.

---

## Testing Strategy

### Unit Tests:

- Parity seed ↔ fixture (50 modyfikatorów, 20 etapów)
- Oracle GABLE 619 650 + scenariusze HIP/MANSARD/FLAT
- Stackowanie `roof_type` + `insulation_level` na `roof_structure`
- Regresja `stage-filter` / utility (bez zmian w S-02)

### Integration Tests:

- `questionnaire-pipeline.test.ts` — band total po roof_type

### Manual Testing Steps:

1. Golden GABLE → total bez zmian vs S-05
2. HIP → +14 100 na pozycjach dachu
3. MANSARD → znaczący wzrost więźby (+80%)
4. FLAT → niższa więźba, droższe krycie (+5%)
5. Recalculate planu — uzupełnienie `roof_type` w edit mode

## Performance Considerations

Brak — 6 modyfikatorów i 1 pytanie; ten sam pipeline O(n) etapów.

## Migration Notes

- **Brak migracji schema** — tylko `pnpm db:seed` (owner).
- Istniejące plany bez `roof_type`: przy recalculate użytkownik wybiera typ; brak auto-backfill.
- Roadmap risk o `RoofType` enum w Prisma — **świadomie odłożone** (Path A).

## References

- Research: `context/changes/questionnaire-roof-type/research.md`
- S-05 archive: `context/archive/2026-06-10-utility-connections/`
- S-01 archive: `context/archive/2026-06-09-cost-calibration/`
- Roadmap S-02: `context/foundation/roadmap.md`
- Lessons: `context/foundation/lessons.md` (seed-only, owner migrate, Zod refine)
- Patterns: `insulation_level` modifiers, `garage_gate` flat negative path via `fixedCostAdjustment`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Workbook typów dachu (roof-rates)

#### Automated

- [x] 1.1 `roof-rates.md` exists with trigger table + golden sanity + stacking section — f6fb448

#### Manual

- [x] 1.2 Owner reviews roof rates for plausibility vs market research — f6fb448

### Phase 2: Rozszerzenie ankiety

#### Automated

- [ ] 2.1 `pnpm lint` passes
- [ ] 2.2 `pnpm typecheck` passes (+ `pnpm test` regresja)

#### Manual

- [ ] 2.3 Step 1 shows roof type; default GABLE; API accepts new payload

### Phase 3: Seed modyfikatorów

#### Automated

- [ ] 3.1 `pnpm lint` and `pnpm typecheck` pass after seed changes

#### Manual

- [ ] 3.2 Owner: `pnpm db:seed` — 17 questions + 50 modifiers in DB

### Phase 4: Testy oracle i regresja

#### Automated

- [ ] 4.1 `pnpm test` passes (GABLE 619k + HIP/MANSARD/FLAT scenarios + stacking)
- [ ] 4.2 `pnpm build:ci` passes

#### Manual

- [ ] 4.3 — (none)

### Phase 5: E2E i domknięcie

#### Automated

- [ ] 5.1 `pnpm test:e2e:risk-04` passes

#### Manual

- [ ] 5.2 Owner smoke: GABLE ~619k; HIP/FLAT visible cost delta on roof rows
