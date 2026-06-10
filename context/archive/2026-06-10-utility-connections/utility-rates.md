# Utility connection rates workbook (S-05)

> **Źródło prawdy** dla Phase 3 (`prisma/seed.ts` modyfikatory flat) i Phase 4 (oracle Vitest).  
> Metoda: **flat PLN per wybór ankiety** — wzorzec `garage_gate` / kotłownia `heating`, nie PLN/m².  
> Zakres: **B (full utilities)** — `sewage_disposal`, `water_supply`, `utility_distance_band`.  
> Data: 2026-06-10. Waluta: PLN. Standard budowy = **STANDARD** przy sanity check.

## Założenia mapowania (engine)

| Reguła | Plik |
|--------|------|
| Baza etapu `sewage_connection` / `water_connection` = **0 PLN/m²** | `prisma/seed.ts` (jak `garage_gate`) |
| Koszt = suma `fixedCostAdjustment` z pasujących `StageCostModifier` | `src/lib/plan-generation/compute-costs.ts` |
| `utility_distance_band` add-on **tylko** przy MUNICIPAL na danym etapie | `compute-costs.ts` — `isModifierActive` (Phase 3) |
| `water_connection` ukryty gdy `water_supply === NONE` | `stage-filter.ts` |
| **Brak zmian schema Prisma** — seed-only | `research.md`, lessons |
| **Wyłączone z widełek:** opłaty administracyjne gminy / WiK, eksploatacja, instalacja wewnętrzna (`plumbing` S-01) | roadmap Parked |

## Tier multipliers (flat modifiers)

| Tier | Wzór od Std |
|------|-------------|
| ECONOMY | `round(Std × 0.72)` |
| PREMIUM | `round(Std × 1.45)` |

Spójne z S-01 (`context/archive/2026-06-09-cost-calibration/calibration-rates.md`).

---

## Tabela triggerów — odprowadzenie ścieków (`sewage_disposal`)

| trigger | stage_slug | billing | Std PLN | Economy | Premium | source | notes |
|---------|------------|---------|---------|---------|---------|--------|-------|
| `MUNICIPAL` | `sewage_connection` | flat | **12 000** | 8 640 | 17 400 | [OnGeo kanalizacja](https://blog.ongeo.pl/koszt-przylacza-kanalizacji), [Oferteo](https://www.oferteo.pl/artykuly/doprowadzenie-kanalizacji-do-domu) | Turnkey ≤20 m: roboty + materiał + projekt/geodezja; **bez** opłat urzędowych gminy |
| `SEPTIC_TANK` | `sewage_connection` | flat | **7 500** | 5 400 | 10 875 | [Oferteo szambo](https://www.oferteo.pl/artykuly/szambo-betonowe-cena-rodzaje), [Murator szamba 2025](https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-szamb-betonowych-10-m3-i-12-m3-w-2025-roku-ile-kosztuje-szambo-z-montazem-aa-KkNC-SNdm-hhkZ.html) | Szambo ~10 m³ z montażem (typowy dom 4 os.) |
| `TREATMENT_PLANT` | `sewage_connection` | flat | **17 500** | 12 600 | 25 375 | [Dzialkopedia POŚ](https://dzialkopedia.pl/poradnik/oczyszczalnia-przydomowa-formalnosci-i-koszty), [Murator POŚ 2026](https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-przydomowych-oczyszczalni-sciekow-2026-aktualny-cennik-z-montazem-aa-RHkb-QrD3-Xr3W.html) | Oczyszczalnia biologiczna — środek widełek 10–25k |

---

## Tabela triggerów — woda (`water_supply`)

| trigger | stage_slug | billing | Std PLN | Economy | Premium | source | notes |
|---------|------------|---------|---------|---------|---------|--------|-------|
| `MUNICIPAL` | `water_connection` | flat | **8 000** | 5 760 | 11 600 | [Dzialkopedia woda](https://dzialkopedia.pl/poradnik/przylacze-wody-do-dzialki-jak-zalatwic), [Murator przyłącza 2026](https://muratordom.pl/instalacje/przylacza/koszt-przylaczy-mediow-w-2026-ile-zaplacisz-za-prad-wode-kanalizacje-i-gaz-w-nowym-domu-aa-n4VB-nJaq-Prmm.html) | Wodociąg turnkey ≤20 m (baza przed distance add-on) |
| `WELL` | `water_connection` | flat | **22 000** | 15 840 | 31 900 | [Bedroom studnia](https://www.bedroom.pl/ile-kosztuje-wywiercenie-studni-glebinowej-ceny-warunki-oplacalnosc/), [Adrem](https://adrem.org.pl/ile-kosztuje-przylacze-wody-szczegolowy-przewodnik/) | Studnia głębinowa pod klucz (odwiert + pompa + hydrofor); **bez** distance band |
| `NONE` | — | — | **0** | — | — | — | Etap `water_connection` **pomijany** (`stage-filter`) |

---

## Tabela add-onów — odległość od sieci (`utility_distance_band`)

Stosowane **addytywnie** na `sewage_connection` (gdy `MUNICIPAL`) i `water_connection` (gdy `MUNICIPAL`). Przy szambo / POŚ / studni — **ignorowane** (engine gating).

| trigger | stage_slug | billing | Std PLN (add-on) | Economy | Premium | source | notes |
|---------|------------|---------|------------------|---------|---------|--------|-------|
| `UP_TO_50M` | sewage + water | flat add-on | **0** | 0 | 0 | [Dzialkopedia woda](https://dzialkopedia.pl/poradnik/przylacze-wody-do-dzialki-jak-zalatwic) | Baza municipal już zakłada ≤20–50 m |
| `UP_TO_100M` | sewage + water | flat add-on | **+4 000** | +2 880 | +5 800 | Dzialkopedia (51–100 m), kanalizacja ~1,3× woda | Osobny wiersz modyfikatora per etap w seed |
| `UP_TO_200M` | sewage + water | flat add-on | **+7 000** | +5 040 | +10 150 | Dzialkopedia (101–200 m) | j.w. |
| `OVER_200M` | sewage + water | flat add-on | **+12 000** | +8 640 | +17 400 | Dzialkopedia (>200 m) | Orientacyjnie; długie trasy → rozważyć studnię zamiast wodociągu |

---

## Przykładowe sumy przyłączy (Std, bez S-01)

| sewage_disposal | water_supply | distance_band | sewage_connection | water_connection | Suma przyłączy |
|-----------------|--------------|---------------|-------------------|------------------|----------------|
| MUNICIPAL | MUNICIPAL | UP_TO_50M | 12 000 | 8 000 | **20 000** |
| MUNICIPAL | MUNICIPAL | UP_TO_100M | 16 000 | 12 000 | **28 000** |
| SEPTIC_TANK | WELL | UP_TO_50M* | 7 500 | 22 000 | **29 500** |
| TREATMENT_PLANT | NONE | — | 17 500 | 0 | **17 500** |

\* Distance nie doliczane przy SEPTIC/WELL — wartość w ankiecie może być ukryta lub ignorowana w API.

---

## Golden payload sanity check (scope B)

**Payload bazowy:** `validQuestionnairePayload` (S-01) + pola S-05:

```json
{
  "sewage_disposal": "MUNICIPAL",
  "water_supply": "MUNICIPAL",
  "utility_distance_band": "UP_TO_50M"
}
```

Pozostałe pola jak w `e2e/fixtures/golden-questionnaire-payload.ts` (120 m², DEVELOPER, STANDARD, …).

### Przyłącza (Std)

| slug | Obliczenie | Koszt [PLN] |
|------|------------|-------------|
| sewage_connection | flat MUNICIPAL + UP_TO_50M (0) | 12 000 |
| water_connection | flat MUNICIPAL + UP_TO_50M (0) | 8 000 |
| **Suma przyłączy** | | **20 000** |

### Łącznie z S-01

| Metryka | Wartość |
|---------|---------|
| Suma S-01 (18 etapów) | 599 650 PLN |
| + S-05 przyłącza (golden B) | +20 000 PLN |
| **SUMA po S-05** | **619 650 PLN** |
| **PLN/m² użytkowej** | 619 650 ÷ 120 = **5 164** |

Po S-05 golden **przekracza** dolną granicę SDW (~5 000 PLN/m²) dzięki przyłączom — zgodnie z oczekiwaniem roadmapy.

### Warianty do testów (Phase 4)

| Scenariusz | Oczekiwany add-on przyłączy (Std) |
|------------|-----------------------------------|
| MUNICIPAL + MUNICIPAL + UP_TO_100M | 12k+4k + 8k+4k = **28 000** |
| SEPTIC + WELL (distance ukryte) | 7 500 + 22 000 = **29 500** |
| TREATMENT + NONE | 17 500 + 0 = **17 500** |

---

## Phase 3 notes (dla implementera)

1. **Dwa nowe etapy** w `stages[]`: `sewage_connection` (sortOrder 1), `water_connection` (sortOrder 2); istniejące 18 etapów **+2** do sortOrder.
2. **Modyfikatory:** 3× `sewage_disposal` + 2× `water_supply` (MUNICIPAL, WELL) + 4× `utility_distance_band` × **2 etapy** = 8 wierszy distance (osobno na sewage i water).
3. Opcjonalnie: modyfikatory per `build_standard` jak kotłownia — **nie w MVP**; tier Economy/Premium z mnożników powyżej wystarczy jeśli engine mapuje `build_standard` na tier (jak `getCostPerM2ForStandard` — dla flat użyć tego samego switcha w Phase 3).
4. Owner po merge: `pnpm db:seed` (bez `db:migrate`).

---

## Źródła (bibliografia)

| ID | URL | Użyte dla |
|----|-----|-----------|
| OnGeo-kanalizacja | https://blog.ongeo.pl/koszt-przylacza-kanalizacji | sewage MUNICIPAL — składowe, mb |
| Oferteo-kanalizacja | https://www.oferteo.pl/artykuly/doprowadzenie-kanalizacji-do-domu | sewage MUNICIPAL turnkey |
| Oferteo-szambo | https://www.oferteo.pl/artykuly/szambo-betonowe-cena-rodzaje | SEPTIC_TANK |
| Murator-szambo-2025 | https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-szamb-betonowych-10-m3-i-12-m3-w-2025-roku-ile-kosztuje-szambo-z-montazem-aa-KkNC-SNdm-hhkZ.html | SEPTIC_TANK cross-check |
| Dzialkopedia-POŚ | https://dzialkopedia.pl/poradnik/oczyszczalnia-przydomowa-formalnosci-i-koszty | TREATMENT_PLANT |
| Murator-POŚ-2026 | https://muratordom.pl/instalacje/instalacja-kanalizacyjna/ceny-przydomowych-oczyszczalni-sciekow-2026-aktualny-cennik-z-montazem-aa-RHkb-QrD3-Xr3W.html | TREATMENT_PLANT |
| Dzialkopedia-woda | https://dzialkopedia.pl/poradnik/przylacze-wody-do-dzialki-jak-zalatwic | water MUNICIPAL + distance bands |
| Murator-przylacza-2026 | https://muratordom.pl/instalacje/przylacza/koszt-przylaczy-mediow-w-2026-ile-zaplacisz-za-prad-wode-kanalizacje-i-gaz-w-nowym-domu-aa-n4VB-nJaq-Prmm.html | water + sanity |
| Bedroom-studnia | https://www.bedroom.pl/ile-kosztuje-wywiercenie-studni-glebinowej-ceny-warunki-oplacalnosc/ | WELL |
| Adrem-woda | https://adrem.org.pl/ile-kosztuje-przylacze-wody-szczegolowy-przewodnik/ | WELL vs wodociąg |
