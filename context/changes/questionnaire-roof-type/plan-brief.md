# Questionnaire Roof Type (S-02) — Plan Brief

> Full plan: `context/changes/questionnaire-roof-type/plan.md`
> Research: `context/changes/questionnaire-roof-type/research.md`

## What & Why

Użytkownik wybiera **typ dachu** w ankiecie i widzi realistyczne różnice kosztowe w pozycjach **więźby** i **krycia dachu** — bez nowych etapów harmonogramu. Dwuspadowy pozostaje baseline S-01; kopertowy, mansardowy i płaski podbijają lub obniżają koszt przez modyfikatory procentowe i flat.

## Starting Point

Po S-05: 20 etapów, golden **619 650 PLN**, ankieta 5 kroków. Dach: `roof_structure` 320 Std/m², `roof_covering` 250 Std/m²; tylko `insulation_level` modyfikuje więźbę. Brak pytania `roof_type`.

## Desired End State

Krok 1 ankiety ma wybór typu dachu (4 opcje PL). Seed: 6 modyfikatorów na istniejące etapy dachu. Golden GABLE bez zmian (**619 650**); HIP/MANSARD/FLAT mają osobne total w testach. CI zielone.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| UI opcje | **4** (`GABLE`, `HIP`, `MANSARD`, `FLAT`) | Czterospadowy ≈ kopertowy rynkowo — jedna opcja „Kopertowy” | Research / Plan |
| Wymagalność | **Required**, default `GABLE` | Sensowny baseline bez pustej odpowiedzi (FR-004) | Research |
| Cost model | **`[PERCENT:N]`** na HIP/MANSARD; **flat −11 520** na FLAT structure | Parser nie obsługuje ujemnego `[PERCENT]`; engine już sumuje flat | Research / Plan |
| Nowe etapy | **Brak** | Wpływ tylko na `roof_structure` + `roof_covering` | Research |
| Schema | **Seed-only Path A** | Zgodne z S-05 i lessons; bez owner `db:migrate` | Research |
| Wizard UX | **Krok 1**, bez nowego kroku | Parametry budynku; `TOTAL_STEPS` bez zmian | Plan |
| Golden default | `GABLE` | Zachowuje 619 650 po S-05 | Plan |

## Scope

**In scope:** `roof_type` SINGLE_CHOICE; workbook `roof-rates.md`; seed pytanie + 6 modyfikatorów; Zod + UI + fixtures; testy oracle (GABLE/HIP/MANSARD/FLAT) + stacking z `insulation_level`; E2E payload.

**Out of scope:** `HIP_GABLE` enum, Prisma `RoofType`, nowe etapy, DAG/sortOrder, mnożnik połaci, coupling `has_attic`, parser `[PERCENT:-N]`, recalc backfill.

## Architecture / Approach

```
Ankieta (roof_type w kroku 1) → API Zod (required enum)
  → persist KV responses → filterStages (bez zmian)
  → computeStageCost (percent + flat modifiers na roof_structure / roof_covering)
  → PlanStageResult (te same 2 wiersze dachu, inne kwoty)
```

Dane w `prisma/seed.ts`. Engine: **zero zmian** — istniejący pipeline modifierów.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Workbook | `roof-rates.md` + golden sanity | Złe % → błędny oracle |
| 2. Ankieta | Pole UI + Zod + seed pytania | Fixture drift przed Phase 4 |
| 3. Seed modifiers | 6 wierszy, 50 modifierów łącznie | Owner seed przed verify |
| 4. Testy | 619k GABLE + scenariusze + stacking | Parity 44→50 |
| 5. E2E | risk-04 + owner smoke | Supabase env |

**Prerequisites:** S-01 + S-05 archived; lokalny DB + seed  
**Estimated effort:** ~2–3 sesje after-hours, 5 faz (prostsze niż S-05 — brak nowych etapów / engine)

## Open Risks & Assumptions

- % na m² użytkowej uproszcza rzeczywistą większą połacię kopertowego/mansardowego — świadomy kompromis MVP.
- Flat FLAT structure jest wartością Std przy 120 m²; tier Economy/Premium skaluje przez base rate (dokument w workbooku).
- Użytkownicy z istniejącymi planami uzupełniają `roof_type` przy recalculate.
- Roadmap wspomina migrację Prisma — **odłożone** na Path B.

## Success Criteria (Summary)

- Wybór typu dachu w kroku 1; kosztorys zmienia kwoty `roof_structure` / `roof_covering` per typ.
- Golden GABLE **619 650 PLN** (bez regresji S-05).
- `pnpm test`, `pnpm build:ci` zielone; E2E risk-04 z `roof_type: GABLE`.
