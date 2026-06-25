---
date: 2026-06-10T12:30:00+00:00
researcher: Cursor Agent
git_commit: 2fa59c4
branch: master
repository: home-build-planner
topic: "S-02 questionnaire-roof-type — typ dachu w ankiecie, codebase gaps, widełki PL"
tags: [research, questionnaire-roof-type, roof, questionnaire, plan-generation, S-02]
status: complete
last_updated: 2026-06-10
last_updated_by: Cursor Agent
---

# Research: S-02 questionnaire-roof-type

**Date**: 2026-06-10  
**Researcher**: Cursor Agent  
**Git Commit**: `2fa59c4`  
**Branch**: master  
**Repository**: home-build-planner

## Research Question

Roadmap S-02 (`questionnaire-roof-type`): jak dodać wybór **typu dachu** do ankiety i odzwierciedlić różnice kosztowe w etapach `roof_structure` i `roof_covering`? Jakie zmiany wymaga codebase (po S-05) i jakie są orientacyjne widełki rynkowe PL 2024–2026 dla dwuspadowego, kopertowego, czterospadowego, mansardowego i płaskiego?

## Summary

1. **S-02 nie jest w kodzie** — brak sluga `roof_type` / `RoofType`; ankieta ma 5 kroków (4 formularz + podsumowanie) po S-05; 16 pytań w seedzie.

2. **Etap dachu już skalibrowany (S-01)** — `roof_structure` Std **320 PLN/m²**, `roof_covering` Std **250 PLN/m²**; golden 120 m² → **38 400 + 30 000 PLN**. Jedyny istniejący modifier na więźbie: `insulation_level` → `[PERCENT:15]` / `[PERCENT:30]` na `roof_structure` tylko.

3. **Wzorzec implementacji** — nowe pytanie `roof_type` (SINGLE_CHOICE) + `StageCostModifier` per typ na `roof_structure` i `roof_covering` z tagiem `[PERCENT:n]` (jak `insulation_level`). **Bez** zmiany `predecessorSlugs` / DAG — kolejność etapów ta sama dla wszystkich typów.

4. **Schema Prisma — rekomendacja seed-only (Path A)** — jak S-05: enum w Zod + wartości w seed JSON; **bez** migracji `schema.prisma` w MVP. Roadmap wspomina enum Prisma — to opcjonalna ścieżka B; lessons: agent nie pisze `prisma/migrations/`.

5. **Rynek PL (orientacyjnie):** dwuspadowy dominuje (~60–66%); kopertowy ~20%; płaski ~8–10%; mansardowy rzadki (&lt;5%). Deltas vs dwuspadowy (całość dachu): kopertowy **+25–40%**, mansardowy **+30–60%**, płaski **−15–25%** CAPEX.

6. **Golden total (619 650 PLN po S-05)** — przy domyślnym `GABLE` bez modifierów pozostaje bez zmian; nowe modyfikatory wymagają aktualizacji oracle w Phase testów (jak S-05).

## Detailed Findings

### Questionnaire extension model (post-S-05)

**Kroki UI** (`src/components/questionnaire/questionnaire-form.tsx:28`):

| Step | Nazwa | Pola |
|------|-------|------|
| 0 | Stan i standard | `investment_state`, `starting_state`, `build_standard`, `insulation_level` |
| 1 | Parametry budynku | `area`, `floors`, `has_attic`, `garage_spots`, `balcony_count` |
| 2 | Okna, drzwi i termin | `window_count`, `exterior_door_count`, `terrace_door_count`, `key_date` |
| 3 | Przyłącza mediów | `sewage_disposal`, `water_supply`, `utility_distance_band` (warunkowo) |
| 4 | Podsumowanie | — |

**Naturalne miejsce dla `roof_type`:** krok **1** (Parametry budynku) obok `has_attic` — logicznie powiązane z geometrią budynku.

**Trzy warstwy** (lekcja z S-05): `QuestionDefinition` (seed) + `questionnaireFormSchema` (Zod) + `STEP_FIELDS` / `STEP_GROUPS` (UI). Sam seed nie wystarczy.

**Checklist nowego SINGLE_CHOICE** (z `context/archive/2026-06-10-utility-connections/research.md`):

| # | Plik |
|---|------|
| 1 | `prisma/seed.ts` — `questions[]` |
| 2 | `src/lib/validations/questionnaire.ts` — `roofTypeSchema` + pole |
| 3 | `step-content.tsx`, `step-progress.tsx`, `questionnaire-form.tsx`, `questionnaire-summary.tsx` |
| 4 | `src/lib/questionnaire/hints/pl.ts` |
| 5 | `responses-to-inputs.ts` — string slug (nie NUMBER) |
| 6 | `questionnaire-payload.ts` + `e2e/fixtures/golden-questionnaire-payload.ts` |
| 7 | `prisma/seed.ts` — `StageCostModifier[]` na `roof_structure` + `roof_covering` |
| 8 | `calibration-modifier-defs.ts`, `calibrated-golden-expectations.ts`, parity test |

**Nie wymagane w MVP:** `stage-filter.ts`, `compute-costs.ts` gating (brak warunkowego ukrywania etapów dachu).

### Istniejące etapy dachu

**`roof_structure`** (`prisma/seed.ts:300-312`):

- `sortOrder: 6`, `completedByState: OPEN_SHELL`, preds: `floor_slabs`
- Std **320** / Econ **230** / Prem **465** PLN/m²
- Modifiers: tylko `insulation_level` ENHANCED/PASSIVE (`[PERCENT:15]` / `[PERCENT:30]`)

**`roof_covering`** (`prisma/seed.ts:314-326`):

- `sortOrder: 7`, `completedByState: CLOSED_SHELL`, preds: `roof_structure`
- Std **250** / Econ **180** / Prem **360** PLN/m²
- **Brak** modyfikatorów

**DAG (bez zmian w S-02):**

```
floor_slabs → roof_structure → roof_covering → windows_doors
```

**Billing area** (`src/lib/plan-generation/effective-area.ts`): oba etapy dachu = **pełna powierzchnia użytkowa** (`area`), nie footprint. Golden: 120 m².

### Wzorzec modifierów — `insulation_level` jako precedens

Engine (`src/lib/plan-generation/compute-costs.ts`):

1. `modifierMatches` — `responses[triggerQuestionSlug] === triggerValue`
2. `parseModifierDescription` — `[PERCENT:N]` → uplift `(N/100) × basePerM2 × area` (`parse-modifier.ts:8-21`)
3. Wartość `costAdjustmentPerM2` w seedzie dla percent jest **dokumentacyjna**; engine czyta `%` z opisu

**Proponowany model S-02:** osobne wiersze modyfikatora per `(roof_type, stageSlug)`:

| `roof_type` | `roof_structure` | `roof_covering` | Uzasadnienie rynku |
|-------------|------------------|-----------------|-------------------|
| `GABLE` (baza) | — (brak wiersza) | — | Dwuspadowy = obecne stawki S-01 |
| `HIP` | `[PERCENT:25]` | `[PERCENT:15]` | Kopertowy +25–40% całość; więcej więźby niż pokrycia |
| `HIP_GABLE` | jak `HIP` lub +5% | jak `HIP` | Czterospadowy ≈ kopertowy w statystykach |
| `MANSARD` | `[PERCENT:80]` | `[PERCENT:20]` | Więźba ~2× droższa |
| `FLAT` | `[PERCENT:-30]` | `[PERCENT:5]` | Brak klasycznej więźby; hydroizolacja droższa |

**Uwaga:** `[PERCENT:-30]` — engine obecnie parsuje tylko dodatnie N w regex `(\d+)`. **Plan musi** albo użyć flat `costAdjustmentPerM2` ujemnego, albo rozszerzyć parser — **bloker do `/10x-plan`**.

Alternatywa bez zmiany parsera: osobne **niższe** `costPerM2Standard` per tier w seedzie tylko dla płaskiego — **nie** (łamie parity S-01). Lepiej: flat negative adjustment lub nowy tag `[PERCENT:-30]` w planie.

### Rynek PL — typy dachów (2024–2026)

| Typ | Udział* | Δ vs dwuspadowy (całość) | Robocizna (orient.) | Źródła |
|-----|---------|--------------------------|---------------------|--------|
| Dwuspadowy | **60–66%** | 0% (baza) | 70–90 zł/m² połaci | [Echo Dnia/Oferteo](https://echodnia.eu/podkarpackie/jakie-domy-najchetniej-buduja-polacy-coraz-czesciej-rezygnujemy-z-piwnic-i-garazow-sprawdz-najnowsze-analizy-dotyczace-budowy-domow/ar/c9p2-26487669), [Murator](https://www.muratorplus.pl/biznes/firmy-i-ludzie/dach-jak-przygotowac-wycene-aa-zgAP-KhS5-MfvY.html) |
| Kopertowy | **~20%** | **+25–40%** | 110–150 zł/m² | [Markbuild](https://markbuild.pl/dach/jaki-ksztalt-dachu-wybrac-popularne-rodzaje-i-ich-zalety/), [dwkstal](https://dwkstal.pl/ile-kosztuje-dach-kalkulator-cennik-i-checklisty-dla-inwestora/) |
| Czterospadowy | ⊂ kopertowy | **+25–40%** | jak kopertowy | [Oferteo kopertowy](https://www.oferteo.pl/artykuly/dach-kopertowy) |
| Mansardowy | **2–5%** (szac.) | **+30–60%** | 130–180 zł/m² | [Pruszyński](https://pruszynski.com.pl/warto-wiedziec/dach-mansardowy-konstrukcja-i-koszty-merytorycznie-o-dachach/) |
| Płaski | **8–10%** | **−15–25%** CAPEX | średnia | [Markbuild](https://markbuild.pl/dach/jaki-ksztalt-dachu-wybrac-popularne-rodzaje-i-ich-zalety/), [Extradom](https://www.extradom.pl/porady/artykul-dom-z-plaskim-dachem-ile-kosztuje-i-czym-sie-wyroznia) |

\*Ankiety portali budowlanych — nie GUS.

**Kalibracja startowa (do workbooka w planie):**

| Typ | `roof_structure` Std 120 m² | `roof_covering` Std 120 m² | Suma dachu |
|-----|---------------------------|----------------------------|------------|
| GABLE (baseline) | 38 400 | 30 000 | **68 400** |
| HIP (+25% / +15%) | 48 000 | 34 500 | **82 500** |
| MANSARD (+80% / +20%) | 69 120 | 36 000 | **105 120** |
| FLAT (−30% / +5%) | 26 880 | 31 500 | **58 380** |

Przy golden DEVELOPER + S-05 utilities: total wzrośnie o Δ dachu względem baseline GABLE.

### Prisma / migracje

| Zmiana | Migracja? |
|--------|-----------|
| Nowe `QuestionDefinition` (`roof_type`) | Nie — seed |
| Nowe `StageCostModifier` | Nie — seed |
| Enum `RoofType` w `schema.prisma` | **Opcjonalnie** — owner `pnpm db:migrate` |

**Rekomendacja MVP:** Path A (seed-only + Zod enum) — spójne z S-05 i `lessons.md` (agent nie tworzy plików w `prisma/migrations/`).

### Testy i golden oracle

Obecny golden (`calibrated-golden-expectations.ts`):

- `roof_structure: 38_400`
- `roof_covering: 30_000`
- `CALIBRATED_GOLDEN_TOTAL: 619_650` (po S-05)

Po S-02 z domyślnym `GABLE`: oracle **bez zmian**. Testy muszą dodać payload field `roof_type: "GABLE"` i scenariusze HIP/MANSARD/FLAT.

`calibration-seed-parity.test.ts` — 20 etapów, 44 modyfikatory; S-02 doda ~8–10 wierszy (4–5 typów × 2 etapy, minus GABLE baseline).

## Code References

- `prisma/seed.ts:300-326` — etapy `roof_structure`, `roof_covering` (stawki, DAG)
- `prisma/seed.ts:561-600` — `insulation_level` → `roof_structure` percent modifiers
- `src/components/questionnaire/step-content.tsx:25-30` — `STEP_FIELDS` (miejsce na `roof_type` w step 1)
- `src/lib/plan-generation/effective-area.ts:7-30` — billing area (usable m² dla dachu)
- `src/lib/plan-generation/parse-modifier.ts:8-21` — `[PERCENT:N]` parsing
- `src/lib/plan-generation/compute-costs.ts:22-97` — modifier matching + apply
- `src/lib/plan-generation/test-fixtures/calibrated-golden-expectations.ts:16-17` — roof oracle
- `context/archive/2026-06-09-cost-calibration/calibration-rates.md:34-35` — S-01 workbook rates

## Architecture Insights

1. **Nie dodawać nowych etapów** — typ dachu wpływa na koszt istniejących `roof_structure` / `roof_covering`, nie na liczbę etapów (20 pozostaje).

2. **Stackowanie modifierów** — `roof_type` + `insulation_level` mogą być aktywne jednocześnie na `roof_structure` (suma percent uplifts). Plan powinien to udokumentować.

3. **Powierzchnia połaci vs użytkowa** — kopertowy/mansardowy mają większą powierzchnię połaci przy tym samym rzucie; MVP może to uprościć przez % modifiers na m² użytkowej (jak S-01); osobny mnożnik połaci = parked.

4. **FR-004** — pytanie **wymagane** z domyślnym `GABLE` w `EMPTY_DEFAULTS` (rekomendacja); użytkownik zawsze ma sensowny baseline bez dodatkowego kroku.

5. **UI copy** — etykiety PL z roadmapy; rozważyć **4 opcje** w UI (bez osobnego „czterospadowy” jeśli mylące z kopertowym) lub 5 z identycznymi modifierami HIP/HIP_GABLE.

## Historical Context (from prior changes)

- `context/archive/2026-06-10-utility-connections/research.md` — checklist pytania + seed-only path; wzorzec 5-krokowej ankiety
- `context/archive/2026-06-10-utility-connections/plan.md` — fazy workbook → ankieta → seed/engine → testy
- `context/archive/2026-06-09-cost-calibration/calibration-rates.md` — baseline 320/250 PLN/m² dla dachu; golden 38 400 + 30 000
- `context/foundation/roadmap.md:112-125` — S-02 unknowns i ryzyko migracji Prisma

## Related Research

- `context/archive/2026-06-10-utility-connections/research.md` — S-05 przyłącza (bezpośredni poprzednik w Stream A)
- `context/archive/2026-06-09-cost-calibration/` — S-01 stawki bazowe dachu

## Open Questions

| # | Pytanie | Rekomendacja | Owner w planie |
|---|---------|--------------|----------------|
| 1 | 5 typów vs 4 w UI (HIP vs HIP_GABLE)? | 4 opcje UI + enum `HIP_GABLE` alias lub ten sam modifier co `HIP` | `/10x-plan` |
| 2 | Wymagane vs opcjonalne (FR-004)? | **Wymagane**, default `GABLE` | plan |
| 3 | Negatywny percent dla płaskiego dachu? | Rozszerzyć parser lub flat negative `costAdjustmentPerM2` | plan Phase engine |
| 4 | Osobny workbook `roof-rates.md` jak S-05? | Tak — Phase 1 kalibracji % z tabeli rynku | plan |
| 5 | Mnożnik powierzchni połaci (nie tylko % na m² użytkowej)? | **Parked** — poza MVP | roadmap Parked |
| 6 | Czy `roof_type` wpływa na `has_attic` / poddasze? | Nie w MVP — niezależne pola | frame opcjonalnie |

## Resolved for planning

- **DAG:** bez zmian `predecessorSlugs`
- **Schema:** seed-only (Path A) w MVP
- **Etapy:** modyfikatory na `roof_structure` + `roof_covering` tylko
- **Baseline:** `GABLE` = obecne stawki S-01 (brak modifier rows)
