---
date: 2026-06-10T10:30:00+00:00
researcher: Cursor Agent
git_commit: 99d475bd73e843d857b688aebb2be895629b503a
branch: master
repository: home-build-planner
topic: "S-05 utility-connections — przyłącza mediów, codebase gaps, market widełki PL"
tags: [research, utility-connections, questionnaire, plan-generation, sewage, water, S-05]
status: complete
last_updated: 2026-06-10
last_updated_by: Cursor Agent
---

# Research: S-05 utility-connections

**Date**: 2026-06-10  
**Researcher**: Cursor Agent  
**Git Commit**: `99d475b`  
**Branch**: master  
**Repository**: home-build-planner

## Research Question

Roadmap S-05 (`utility-connections`): jak dodać do kosztorysu **osobne pozycje** za przyłącza zewnętrzne (ścieki + opcjonalnie woda), oddzielone od wewnętrznej instalacji wod-kan (`plumbing`, skalibrowane w S-01)? Jakie zmiany wymaga codebase (ankieta, seed, engine, testy) i jakie są orientacyjne widełki rynkowe PL 2025–2026?

## Summary

1. **S-05 nie jest jeszcze w kodzie** — brak slugów `sewage_disposal`, `water_supply`, `sewage_connection`, `water_connection`. `plumbing` w seedzie jest już opisane jako tylko instalacja wewnętrzna (S-01 epilog −10%).

2. **Ankieta = trzy warstwy** — `QuestionDefinition` (seed/DB), `questionnaireFormSchema` (Zod/API), hardcoded `STEP_FIELDS` / `STEP_GROUPS` (UI). Sam seed **nie wystarczy**; wzorzec jak `insulation_level` (wymagany wybór → modyfikatory) + `garage_spots` (opcjonalne → filtr etapu).

3. **Koszt przyłączy = flat modifiers** — najlepszy precedens: `garage_gate` (baza 0 PLN/m² + `fixedCostAdjustment` per trigger) i kotłownia w `heating`. Nie per m² użytkowej — przyłącza to roboty zewnętrzne o stałej skali dla typowego domu.

4. **Engine pozostaje stabilny** — `compute-costs.ts` bez zmian; nowe etapy + `stage-filter.ts` (warunkowe ukrywanie, np. `water_connection` gdy brak wodociągu). API ładuje etapy z DB (`constructionStage.findMany`) — po `pnpm db:seed` nowe slugi wchodzą automatycznie.

5. **Schema Prisma — prawdopodobnie seed-only** — nowe pytania i etapy nie wymagają migracji (jak S-01). Migracja tylko gdy dodamy enumy w `schema.prisma` (Path B); rekomendacja MVP: **Path A** (wartości w Zod + seed JSON).

6. **Rynek PL (orientacyjnie, bez opłat administracyjnych gminy):**
   - Kanalizacja gminna (turnkey ≤20 m): **8 000–15 000 PLN**
   - Szambo 10 m³ z montażem: **5 000–10 000 PLN**
   - POŚ przydomowa: **10 000–25 000 PLN**
   - Wodociąg (turnkey ≤20 m): **5 000–12 000 PLN**
   - Studnia głębinowa (pod klucz): **15 000–30 000 PLN**
   - Distance bands (woda): 4 progi Dzialkopedia (≤50 / 51–100 / 101–200 / >200 m)

7. **Golden total S-01 (599 650 PLN)** nie obejmuje przyłączy — po S-05 suma wzrośnie dla użytkowników z kanalizacją gminną / wodociągiem; testy oracle wymagają rozszerzenia z 18 → 20 etapów (lub osobnego zestawu expectations dla S-05).

## Detailed Findings

### Questionnaire extension model

Pytania są metadanymi w `QuestionDefinition` (`prisma/schema.prisma:54-64`), seedowane w `prisma/seed.ts:34-173`, upsert w `seedQuestions()` (`767-794`).

**Kontrakt API** — płaski JSON, klucze = `QuestionnaireInputs` (`src/lib/validations/questionnaire.ts:62-109`):

- Wymagane: `investment_state`, `starting_state`, `build_standard`, `insulation_level`, `area`, `floors`, `key_date`, `window_count`, `exterior_door_count`
- Opcjonalne z defaultami: `has_attic`, `garage_spots`, `balcony_count`, `terrace_door_count`

Walidacja cross-field: `starting_state` przed `investment_state` (`questionnaire.ts:112-118`). FR-004: opcjonalne tylko gdy `required: false` w seed + `.optional().default()` w Zod + etykieta „(opcjonalne)” w UI (`question-renderers.tsx:50-51`).

**Checklist nowego sluga (np. `sewage_disposal`):**

| # | Plik |
|---|------|
| 1 | `prisma/seed.ts` — `questions[]` |
| 2 | `src/lib/validations/questionnaire.ts` — pole + `z.enum` |
| 3 | `src/components/questionnaire/step-content.tsx` — `STEP_FIELDS` |
| 4 | `src/components/questionnaire/questionnaire-summary.tsx` — `STEP_GROUPS` |
| 5 | `src/components/questionnaire/questionnaire-form.tsx` — `EMPTY_DEFAULTS`, ewentualnie nowy krok |
| 6 | `src/lib/questionnaire/responses-to-inputs.ts` — `NUMBER_SLUGS` jeśli NUMBER |
| 7 | `src/lib/questionnaire/hints/pl.ts` — copy PL |
| 8 | `src/lib/api/test-fixtures/questionnaire-payload.ts` + `e2e/fixtures/golden-questionnaire-payload.ts` |
| 9 | Seed etapów + modyfikatorów jeśli wpływa na koszt |

Odpowiedzi persystowane jako wiersze KV (`QuestionnaireResponse`: `questionSlug` + string `value`) w `persist-plan-version.ts:25-29`, odczyt przez `responsesToQuestionnaireInputs()`.

### Plan generation — nowe etapy

**Obecny `plumbing`** (`prisma/seed.ts:282-296`):

- `sortOrder: 8`, `completedByState: DEVELOPER`, preds: `windows_doors`
- Std **194 PLN/m²** × 120 m² = **23 280 PLN** (golden oracle)
- Opis: bez przyłącza zewnętrznego → S-05

**Wzorzec `garage_gate`** dla przyłączy:

- Baza `costPerM2* = 0`
- Koszt wyłącznie z `StageCostModifier` (`fixedCostAdjustment`)
- Filtr w `stage-filter.ts:38-40` gdy `garage_spots <= 0`

**Proponowany model S-05:**

| Slug | Kategoria | Inclusion | Koszt |
|------|-----------|-----------|-------|
| `sewage_connection` | `INSTALLATIONS` lub `UTILITIES` | Zawsze na ścieżce DEVELOPER (lub wcześniej — sortOrder niski) | Flat per `sewage_disposal` |
| `water_connection` | j.w. | Gdy `water_supply` ≠ `NONE` / brak studni | Flat per `water_supply` (+ opcjonalnie distance band) |

**DAG:** przyłącza to prace ziemne **przed** lub **równolegle** z fundamentami — **nie** jako predecessor `plumbing`. Wewnętrzny DAG `plumbing` → `interior_plaster` / `bathroom_fixtures` bez zmian.

**Pipeline** (`generate-plan-results.ts` → `persist-plan-version.ts:33-39`): `filterStages` → `scheduleTimeline` → `computeStageCost` → `applyMarketBenchmarks` (multipliers 1.0 po S-01).

### Prisma / migracje

| Zmiana | Migracja? |
|--------|-----------|
| Nowe `QuestionDefinition` | Nie — seed |
| Nowe `ConstructionStage` + `StageCostModifier` | Nie — seed |
| Nowe enumy Prisma (`SewageDisposal`, `WaterSupply`) | **Tak** — owner `pnpm db:migrate` |
| Nowa kolumna / tabela | **Tak** |

**Rekomendacja:** Path A (seed-only + Zod enums) — zgodne z S-01 i lessons (agent nie pisze `prisma/migrations/`).

### Rynek PL 2025–2026 (roboty + materiał, bez opłat administracyjnych)

#### Kanalizacja sanitarna (gmina)

| Składowa | PLN |
|----------|-----|
| Turnkey ≤20 m | 8 000 – 15 000 |
| Stawka mb | 200 – 450 PLN/mb |
| Przekop drogi / pompownia | +3 000 – 10 000 (edge — poza MVP lub modyfikator) |

Źródła: [OnGeo](https://blog.ongeo.pl/koszt-przylacza-kanalizacji), [Oferteo](https://www.oferteo.pl/artykuly/doprowadzenie-kanalizacji-do-domu), [Murator 2026](https://muratordom.pl/instalacje/przylacza/koszt-przylaczy-mediow-w-2026-ile-zaplacisz-za-prad-wode-kanalizacje-i-gaz-w-nowym-domu-aa-n4VB-nJaq-Prmm.html)

#### Szambo (10 m³, 4 os.)

**5 000 – 10 000 PLN** z montażem. „Separator” w branży = separator tłuszczu (dodatek), nie osobna ścieżka odprowadzenia — **nie** jako 4. opcja `sewage_disposal` w MVP.

Źródła: [Oferteo szambo](https://www.oferteo.pl/artykuly/szambo-betonowe-cena-rodzaje), [Murator szamba 2025](https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-szamb-betonowych-10-m3-i-12-m3-w-2025-roku-ile-kosztuje-szambo-z-montazem-aa-KkNC-SNdm-hhkZ.html)

#### Oczyszczalnia przydomowa

**10 000 – 25 000 PLN** (biologiczna jako default widełek).

Źródła: [Dzialkopedia POŚ](https://dzialkopedia.pl/poradnik/oczyszczalnia-przydomowa-formalnosci-i-koszty), [Murator POŚ 2026](https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-przydomowych-oczyszczalni-sciekow-2026-aktualny-cennik-z-montazem-aa-RHkb-QrD3-Xr3W.html)

#### Woda: wodociąg vs studnia

| Opcja | PLN |
|-------|-----|
| Wodociąg turnkey ≤20 m | 5 000 – 12 000 |
| Studnia głębinowa pod klucz | 15 000 – 30 000 |
| Stawka mb wodociąg | 80 – 400 PLN/mb |

Źródła: [Dzialkopedia woda](https://dzialkopedia.pl/poradnik/przylacze-wody-do-dzialki-jak-zalatwic), [Adrem przyłącze vs studnia](https://adrem.org.pl/ile-kosztuje-przylacze-wody-szczegolowy-przewodnik/)

#### Distance bands (propozycja ankiety)

| Odległość | Wodociąg turnkey |
|-----------|------------------|
| ≤ 50 m | 3 000 – 6 000 |
| 51–100 m | 5 000 – 9 000 |
| 101–200 m | 8 000 – 14 000 |
| > 200 m | 12 000 – 20 000+ |

Kanalizacja: brak krajowego cennika progów — kalibracja przez mb lub te same 4 progi z wyższą bazą (~1,3–1,5× woda).

#### Świadomie poza zakresem MVP

- Opłaty administracyjne gminy / PWiK / WiK (roadmap **Parked**)
- Eksploatacja (wywóz szamba, abonament POŚ)
- Instalacja wewnętrzna (już w `plumbing`)
- Odpowietrzenie kanalizacji / kominki wentylacyjne → **S-05b** (parked)

### Testy i regresja

| Warstwa | Plik | S-05 impact |
|---------|------|-------------|
| Parity seed↔fixture | `calibration-seed-parity.test.ts` | 18 → 20 slugów |
| Oracle per etap | `generate-plan-results.test.ts` | Nowe expectations + nowy total |
| Band smoke | `questionnaire-pipeline.test.ts` | Zaktualizować MIN/MAX |
| E2E risk-04 | `risk-04-generate-golden-path.spec.ts` | Przejdzie z większą tabelą; zaktualizować payload jeśli nowe wymagane pola |
| **Brak dziś** | `stage-filter.test.ts` | **Dodać** testy widoczności sewage/water |

## Code References

- `prisma/seed.ts:282-296` — `plumbing` scope (internal only)
- `prisma/seed.ts:437-449` — `garage_gate` base 0 pattern
- `src/lib/plan-generation/stage-filter.ts:37-62` — inclusion rules + `garage_gate`
- `src/lib/plan-generation/compute-costs.ts:52-73` — billing formula
- `src/lib/plan-generation/parse-modifier.ts` — `[PERCENT]`, `[PER_UNIT]`, flat
- `src/lib/validations/questionnaire.ts:62-119` — API contract
- `src/lib/plan/persist-plan-version.ts:25-64` — persist responses + generate
- `src/lib/plan-generation/calibration-seed-parity.test.ts` — S-01 parity guard
- `e2e/fixtures/golden-questionnaire-payload.ts` — golden payload

## Architecture Insights

- **Dual-source questionnaire:** DB metadata dla UI, Zod dla typów/API — oba muszą być zsynchronizowane przy każdym nowym pytaniu.
- **Engine jest data-driven:** nowe etapy w seedzie + ewentualnie jedna reguła w `stage-filter.ts`; brak zmian w `compute-costs.ts` przy modelu flat.
- **Odpowiedzi KV, nie JSON blob:** `QuestionnaireResponse` per slug — nowe pola nie wymagają migracji schematu.
- **Lessons:** domain data przez Prisma + API routes; owner-only `db:migrate`; nigdy ręczne `prisma/migrations/`; cross-field walidacja tylko w `questionnaireInputsSchema`, nie w RHF resolver.

## Historical Context (from prior changes)

- `context/archive/2026-06-09-cost-calibration/` — S-01 skalibrował 18 etapów; `plumbing` −10% (194 Std), opis wyłącza przyłącza; golden **599 650 PLN** bez przyłączy; S-05 wpisany w roadmap epilog.
- `context/archive/2026-06-09-cost-calibration/research.md` — macierz „seed-only vs migracja”; rekomendacja kalibracji bez zmiany schematu.
- `context/foundation/roadmap.md` S-05 — outcome, unknowns (scope water vs sewage-only), risk migracji.

## Related Research

- `context/archive/2026-06-09-cost-calibration/research.md` — engine, DEVELOPER path, seed-only calibration
- `context/archive/2026-06-09-cost-calibration/calibration-rates.md` — plumbing row + golden table

## Open Questions — resolved (2026-06-10, plan scope B)

1. **Zakres:** **B — full utilities** (`sewage_disposal`, `water_supply`, `utility_distance_band`, 2 etapy).
2. **Enum ścieki:** `MUNICIPAL` | `SEPTIC_TANK` | `TREATMENT_PLANT`.
3. **Distance band:** wymagane w API iff MUNICIPAL ścieki lub woda; UI warunkowe.
4. **Ankieta:** nowy krok 3 „Przyłącza mediów”; `TOTAL_STEPS` → 5.
5. **Timeline:** `sortOrder` 1–2, renumber istniejących +2; `completedByState: FOUNDATIONS`.
6. **Kalibracja:** pojedyncza liczba Std per trigger (workbook) + oracle.
7. **Prisma:** Path A — Zod enums only.

## Plan decisions (2026-06-10)

- Plan: `context/changes/utility-connections/plan.md` (5 faz).
- Golden po S-05 (scope B default): **619 650 PLN** (+20k przyłącza).

## Recommended next step

`/10x-implement utility-connections phase 1`
