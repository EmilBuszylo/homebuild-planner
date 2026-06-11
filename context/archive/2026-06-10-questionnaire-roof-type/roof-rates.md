# Roof type rates workbook (S-02)

> **Źródło prawdy** dla Phase 3 (`prisma/seed.ts` modyfikatory) i Phase 4 (oracle Vitest).  
> Metoda: **`[PERCENT:N]`** na `roof_structure` / `roof_covering` (wzorzec `insulation_level`) + **flat PLN** dla rabatu płaskiego dachu na więźbie.  
> Zakres: `roof_type` — `GABLE` | `HIP` | `MANSARD` | `FLAT` (4 opcje UI; bez `HIP_GABLE`).  
> Data: 2026-06-08. Waluta: PLN. Standard budowy = **STANDARD** przy sanity check.

## Założenia mapowania (engine)

| Reguła | Plik |
|--------|------|
| Baza `roof_structure` Std **320 PLN/m²**, `roof_covering` Std **250 PLN/m²** (S-01) | `prisma/seed.ts` |
| `billingArea` = pełna `area` (m² użytkowej) dla obu etapów dachu | `src/lib/plan-generation/effective-area.ts` |
| `[PERCENT:N]` → uplift `(N/100) × basePerM2 × area` (basePerM2 z tieru) | `parse-modifier.ts`, `compute-costs.ts` |
| Flat (bez tagu) → `costAdjustmentPerM2 × area + fixedCostAdjustment` | `compute-costs.ts` |
| `GABLE` = **brak wiersza** modyfikatora (baseline S-01) | plan S-02 |
| **Brak nowych etapów** — tylko modyfikatory na istniejących slugach | plan S-02 |
| **Brak zmian** `stage-filter.ts`, `compute-costs.ts` gating | plan S-02 |
| **Brak migracji schema** — seed-only | `research.md`, lessons |
| **Wyłączone z widełek:** mnożnik powierzchni połaci, obróbki jako osobny etap, coupling `has_attic` | roadmap Parked |

## Tier multipliers (baza etapu)

| Tier | `roof_structure` PLN/m² | `roof_covering` PLN/m² | Wzór od Std |
|------|-------------------------|------------------------|-------------|
| ECONOMY | 230 | 180 | `round(Std × 0.72)` |
| STANDARD | 320 | 250 | (S-01) |
| PREMIUM | 465 | 360 | `round(Std × 1.45)` |

Spójne z S-01 (`context/archive/2026-06-09-cost-calibration/calibration-rates.md`).

### Skalowanie modyfikatorów per tier

| Mechanizm | Zachowanie w engine |
|-----------|---------------------|
| `[PERCENT:N]` | Auto-skaluje — liczone od `basePerM2` danego tieru × `area`; tag **musi być na początku** opisu (`parse-modifier.ts`) |
| Flat `fixedCostAdjustment` | **Stała kwota** z seedu — **nie** skaluje się z tierem |

**MVP (jeden wiersz FLAT structure):** `fixedCostAdjustment: -11 520` skalibrowane pod **STANDARD** przy 120 m² (= −30% od 38 400). Przy ECONOMY/PREMIUM efektywny % rabatu odbiega od −30% — akceptowany kompromis MVP; testy oracle Phase 4 skupiają się na Std.

---

## Tabela triggerów — typ dachu (`roof_type`)

### `roof_structure` (więźba + folia)

| trigger | stage_slug | mechanizm | Std PLN (120 m²)* | Economy | Premium | source | notes |
|---------|------------|-----------|-------------------|---------|---------|--------|-------|
| `GABLE` | `roof_structure` | — (baseline) | **38 400** | 27 600 | 55 800 | S-01 OnGeo SSO | Brak wiersza w seedzie |
| `HIP` | `roof_structure` | `[PERCENT:25]` | **48 000** (+9 600) | 34 500 | 69 750 | [Markbuild](https://markbuild.pl/dach/jaki-ksztalt-dachu-wybrac-popularne-rodzaje-i-ich-zalety/), [dwkstal](https://dwkstal.pl/ile-kosztuje-dach-kalkulator-cennik-i-checklisty-dla-inwestora/) | Kopertowy / czterospadowy — środek widełek +25–40% całości dachu |
| `MANSARD` | `roof_structure` | `[PERCENT:80]` | **69 120** (+30 720) | 49 680 | 100 440 | [Pruszyński](https://pruszynski.com.pl/warto-wiedziec/dach-mansardowy-konstrukcja-i-koszty-merytorycznie-o-dachach/) | Więźba mansardowa ~2× droższa vs dwuspadowy |
| `FLAT` | `roof_structure` | flat **−11 520** | **26 880** | 16 080† | 44 280† | [Markbuild](https://markbuild.pl/dach/jaki-ksztalt-dachu-wybrac-popularne-rodzaje-i-ich-zalety/), [Extradom](https://www.extradom.pl/porady/artykul-dom-z-plaskim-dachem-ile-kosztuje-i-czym-sie-wyroznia) | Uproszczona konstrukcja; opis seed **bez** tagu `[PERCENT]`; `costAdjustmentPerM2: 0` |

\* Koszt = baza tier + modyfikator. Std sanity przy `area = 120`, `build_standard = STANDARD`.  
† Flat −11 520 nie skaluje — efektywny rabat ≠ −30% poza Std.

### `roof_covering` (pokrycie + obróbki)

| trigger | stage_slug | mechanizm | Std PLN (120 m²)* | Economy | Premium | source | notes |
|---------|------------|-----------|-------------------|---------|---------|--------|-------|
| `GABLE` | `roof_covering` | — (baseline) | **30 000** | 21 600 | 43 200 | S-01 | Brak wiersza w seedzie |
| `HIP` | `roof_covering` | `[PERCENT:15]` | **34 500** (+4 500) | 24 840 | 50 040 | Oferteo kopertowy, Markbuild | Więcej obróbek i połaci vs dwuspadowy |
| `MANSARD` | `roof_covering` | `[PERCENT:20]` | **36 000** (+6 000) | 25 920 | 52 200 | Pruszyński | Okna dachowe / złożoność krycia |
| `FLAT` | `roof_covering` | `[PERCENT:5]` | **31 500** (+1 500) | 22 680 | 45 360 | Extradom | Hydroizolacja / membrana droższa od dachówki |

---

## Suma etapów dachu (Std, 120 m²)

| `roof_type` | `roof_structure` | `roof_covering` | **Suma dachu** | **Δ vs GABLE** |
|-------------|------------------|-----------------|----------------|----------------|
| `GABLE` | 38 400 | 30 000 | **68 400** | 0 |
| `HIP` | 48 000 | 34 500 | **82 500** | **+14 100** |
| `MANSARD` | 69 120 | 36 000 | **105 120** | **+36 720** |
| `FLAT` | 26 880 | 31 500 | **58 380** | **−10 020** |

---

## Stackowanie z `insulation_level` (tylko `roof_structure`)

Oba modyfikatory percent sumują się **od tej samej bazy** `basePerM2 × area` — nie kumulatywnie (nie „percent od percent”).

### Przykład testowy (Phase 4)

Payload: `roof_type: HIP`, `insulation_level: ENHANCED`, Std, 120 m²:

| Składnik | Obliczenie | PLN |
|----------|------------|-----|
| Baza | 320 × 120 | 38 400 |
| HIP `[PERCENT:25]` | 25% × 38 400 | +9 600 |
| ENHANCED `[PERCENT:15]` | 15% × 38 400 | +5 760 |
| **Wynik `roof_structure`** | | **53 760** |

`roof_covering` przy HIP bez wpływu `insulation_level` (modifier insulation dotyczy tylko więźby).

### Inne kombinacje (Std, 120 m²)

| `roof_type` | `insulation_level` | `roof_structure` | Uwagi |
|-------------|-------------------|------------------|-------|
| GABLE | ENHANCED | 44 160 | 38 400 + 15% (S-01 regresja) |
| GABLE | PASSIVE | 49 920 | 38 400 + 30% |
| MANSARD | ENHANCED | 74 880 | 69 120 + 5 760 |
| FLAT | ENHANCED | 32 640 | 26 880 + 5 760 (flat −11 520 + 15% od bazy 38 400) |

---

## Golden payload sanity check

**Payload bazowy:** calibrated golden (S-01 + S-05) + pole S-02:

```json
{
  "roof_type": "GABLE"
}
```

Pozostałe pola jak w `e2e/fixtures/golden-questionnaire-payload.ts` (120 m², DEVELOPER, STANDARD, MUNICIPAL/MUNICIPAL/UP_TO_50M, …).

### Dach (Std, `GABLE`)

| slug | Obliczenie | Koszt [PLN] |
|------|------------|-------------|
| roof_structure | 320 × 120 (brak modifiera) | 38 400 |
| roof_covering | 250 × 120 (brak modifiera) | 30 000 |
| **Suma dachu** | | **68 400** |

### Łącznie z S-05 (golden bez regresji)

| Metryka | Wartość |
|---------|---------|
| Suma po S-05 (20 etapów, scope B) | **619 650 PLN** |
| Δ dachu przy `GABLE` | 0 |
| **SUMA po S-02 (GABLE default)** | **619 650 PLN** |
| **PLN/m² użytkowej** | 619 650 ÷ 120 = **5 164** |

Domyślny `GABLE` **nie zmienia** golden totalu — regresja S-05 zachowana.

### Scenariusze total (Std, DEVELOPER, utilities scope B)

| `roof_type` | Δ dachu | **Total [PLN]** |
|-------------|---------|-----------------|
| `GABLE` | 0 | **619 650** |
| `HIP` | +14 100 | **633 750** |
| `MANSARD` | +36 720 | **656 370** |
| `FLAT` | −10 020 | **609 630** |

Obliczenie: 619 650 + Δ dachu (przyłącza i pozostałe etapy bez zmian).

---

## Warianty do testów (Phase 4)

| Scenariusz | Oczekiwany `roof_structure` (Std) | Oczekiwany total (Std) |
|------------|-----------------------------------|------------------------|
| GABLE + golden utilities | 38 400 | **619 650** |
| HIP | 48 000 | **633 750** |
| MANSARD | 69 120 | **656 370** |
| FLAT | 26 880 | **609 630** |
| HIP + ENHANCED (stacking) | 53 760 | 619 650 − 38 400 + 53 760 = **635 010** |

---

## Phase 3 notes (dla implementera)

1. **Jedno pytanie** w `questions[]`: `roof_type` (SINGLE_CHOICE, required), `sortOrder` po `has_attic`.
2. **Sześć modyfikatorów** w `modifiers[]` (brak wierszy dla `GABLE`):

| stageSlug | triggerQuestionSlug | triggerValue | costAdjustmentPerM2 | fixedCostAdjustment | description (fragment) |
|-----------|---------------------|--------------|---------------------|---------------------|--------------------------|
| roof_structure | roof_type | HIP | 0 | 0 | `… [PERCENT:25]` |
| roof_covering | roof_type | HIP | 0 | 0 | `… [PERCENT:15]` |
| roof_structure | roof_type | MANSARD | 0 | 0 | `… [PERCENT:80]` |
| roof_covering | roof_type | MANSARD | 0 | 0 | `… [PERCENT:20]` |
| roof_structure | roof_type | FLAT | 0 | **-11520** | flat, bez tagu percent |
| roof_covering | roof_type | FLAT | 0 | 0 | `… [PERCENT:5]` |

3. `buildStandard: null` na wszystkich wierszach (jak `insulation_level`).
4. **20 etapów** bez zmian; **44 → 50** modyfikatorów łącznie.
5. Owner po merge Phase 3: `pnpm db:seed` (bez `db:migrate`).

---

## Źródła (bibliografia)

| ID | URL | Użyte dla |
|----|-----|-----------|
| Echo/Oferteo-udział | https://echodnia.eu/podkarpackie/jakie-domy-najchetniej-buduja-polacy-coraz-czesciej-rezygnujemy-z-piwnic-i-garazow-sprawdz-najnowsze-analizy-dotyczace-budowy-domow/ar/c9p2-26487669 | GABLE jako dominanta rynku |
| Murator-wycena | https://www.muratorplus.pl/biznes/firmy-i-ludzie/dach-jak-przygotowac-wycene-aa-zgAP-KhS5-MfvY.html | Widełki robocizny dach |
| Markbuild-typy | https://markbuild.pl/dach/jaki-ksztalt-dachu-wybrac-popularne-rodzaje-i-ich-zalety/ | HIP +25–40%, FLAT −15–25% |
| dwkstal-kalkulator | https://dwkstal.pl/ile-kosztuje-dach-kalkulator-cennik-i-checklisty-dla-inwestora/ | HIP cross-check |
| Oferteo-kopertowy | https://www.oferteo.pl/artykuly/dach-kopertowy | HIP ≈ czterospadowy |
| Pruszyński-mansarda | https://pruszynski.com.pl/warto-wiedziec/dach-mansardowy-konstrukcja-i-koszty-merytorycznie-o-dachach/ | MANSARD +30–60% |
| Extradom-płaski | https://www.extradom.pl/porady/artykul-dom-z-plaskim-dachem-ile-kosztuje-i-czym-sie-wyroznia | FLAT CAPEX |
| S-01-calibration | `context/archive/2026-06-09-cost-calibration/calibration-rates.md` | Baseline 320/250 PLN/m² |
