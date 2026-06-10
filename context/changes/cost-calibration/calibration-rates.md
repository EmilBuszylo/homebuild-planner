# Calibration rates workbook (S-01)

> **Źródło prawdy** dla Phase 2 (`prisma/seed.ts`) i Phase 3 (oracle Vitest).  
> Metoda: **etap po etapie z cenników PL 2026** — bez skalowania od jednego domu referencyjnego.  
> Data: 2026-06-09. Waluta: PLN. Standard budowy = **STANDARD** przy sanity check, chyba że wiersz mówi inaczej.

## Założenia mapowania (engine)

| Reguła | Plik |
|--------|------|
| `billingArea` = `area / floors` tylko dla `foundations` | `src/lib/plan-generation/effective-area.ts` |
| Pozostałe etapy: `billingArea` = pełna `area` (m² użytkowej) | j.w. |
| Economy / Premium | ~72% / ~145% Standard (zaokrąglone), gdy cennik nie podaje osobno |
| `[PER_UNIT:slug]` | `fixedCostAdjustment × count` |
| `[PERCENT:N]` | bez zmian w S-01 (tylko dokumentacja) |
| **Brak zmian schema Prisma** — tylko seed w Phase 2 | `research.md` |

## Tier multipliers (gdy brak osobnego cennika)

| Tier | Wzór od Standard |
|------|------------------|
| ECONOMY | `round(Std × 0.72)` |
| PREMIUM | `round(Std × 1.45)` |

---

## Tabela etapów (18 slugów)

| slug | category | billing | curr Std PLN/m² | target Std PLN/m² | target Econ | target Prem | golden cost (Std)* | source | excerpt |
|------|----------|---------|-----------------|-------------------|-------------|-------------|-------------------|--------|---------|
| foundations | STRUCTURE | footprint 60 m² | 690 | **1050** | 760 | 1520 | 63 000 | [GTF 2026](https://grunttofundament.pl/poradnik/ile-kosztuja-fundamenty-pod-dom-2026), [Onet/KBPL 2026](https://www.onet.pl/styl-zycia/kbpl-2/cennik-budowy-i-izolacji-fundamentow-aktualne-koszty-2026-r/lfzvm9v,0666d3f1) | Ławy+płyta: 460–950 PLN/m² zabudowy; dom 120 m² ~86k PLN → ~1050/m² footprint (orientacyjnie) |
| walls | STRUCTURE | usable 120 m² + mod | 500 (+80) | **720** (+80) | 520 | 1040 | 96 000 | [OnGeo SSO/SDW 2026](https://blog.ongeo.pl/ile-kosztuje-budowa-domu-2026-ceny-za-m2-przyklady), S-02 CLOSED_SHELL anchor | Murowanie w widełkach SSO; +80/m² przy 2 kondygnacjach (seed) |
| floor_slabs | STRUCTURE | usable 120 m² + mod | 300 (+70) | **400** (+70) | 290 | 580 | 55 400† | OnGeo / konstrukcja żelbetowa | Stropy międzykondygnacyjne; †bez balkonu — balkon w modifiers |
| roof_structure | STRUCTURE | usable 120 m² | 235 | **320** | 230 | 465 | 38 400 | OnGeo SSO widełki | Więźba + folia w stanie surowym zamkniętym |
| roof_covering | STRUCTURE | usable 120 m² | 185 | **250** | 180 | 360 | 30 000 | OnGeo / pokrycie dachu | Dachówka/blacha + obróbki |
| windows_doors | STRUCTURE | base 0, per-unit | 0 | **0** | 0 | 0 | 45 600‡ | [Oferteo okna 2026](https://www.oferteo.pl/artykuly/ile-kosztuje-wymiana-okien), rynkowe widełki drzwi | ‡12×2600 + 2×7200 (Std); baza 0 — patrz modifiers |
| electrical | INSTALLATIONS | usable 120 m² | 150 | **265** | 190 | 385 | 31 800 | [Oferteo 2026](https://www.oferteo.pl/artykuly/cennik-uslug-elektrycznych), [pomoc-instalacja.pl](https://pomoc-instalacja.pl/koszt-instalacji-elektrycznej-w-domu-100m2) | Dom 100–120 m²: 28–38k brutto ≈ 230–320 PLN/m²; Std 265 |
| plumbing | INSTALLATIONS | usable 120 m² | 130 | **215** | 155 | 310 | 25 800 | [Aluhaus breakdown](https://www.aluhaus.com.pl/koszt-budowy-domu-praktyczny-przewodnik-dla-inwestora/) (750 PLN/punkt ×15 pkt / 150 m²) | Wod-kan podejścia; ~200 PLN/m² użytkowej |
| heating | INSTALLATIONS | usable 120 m² + **flat** | 220 | **340** + **25 000 flat** | 245 | 495 | 65 800§ | Aluhaus: 195 PLN/m² CO + kotłownia ~35k/150 m² | §120×340 + 25k flat (kotłownia/źródło); **nowy modifier Phase 2** |
| insulation | ENVELOPE | usable 120 m² | 160 | **235** | 170 | 340 | 28 200 | Aluhaus: 310 PLN/m² ścian zewn. (materiał+robocizna) — mapowane na m² użytkowej | Ocieplenie + poddasze; Std bez PASSIVE |
| facade | ENVELOPE | usable 120 m² | 120 | **175** | 125 | 255 | 21 000 | Aluhaus: 27 PLN/m² elewacja (tylko wykończenie) + tynk w bundle z ociepleniem | Tynk elewacyjny / wykończenie ocieplenia |
| interior_plaster | FINISHING | usable 120 m² | 80 | **115** | 85 | 165 | 13 800 | Aluhaus: 63 PLN/m² tynki (450 m² pow. tynk. / 150 m² dom) | Tynki gipsowe wewnętrzne |
| floor_screeds | FINISHING | usable 120 m² | 55 | **78** | 55 | 115 | 9 360 | Aluhaus: 100 PLN/m² posadzki (wylewki) | Wylewki cementowe/anhydrytowe |
| flooring | FINISHING | usable 120 m² | 140 | **210** | 150 | 305 | 25 200 | Aluhaus posadzki wykończeniowe (wyższy standard niż sama wylewka) | Panele/gres z montażem (orientacyjnie) |
| painting | FINISHING | usable 120 m² | 25 | **42** | 30 | 60 | 5 040 | Rynkowe 25–45 PLN/m² malowanie (2 warstwy) | Grunt + 2× malowanie |
| bathroom_fixtures | FINISHING | usable 120 m² | 90 | **155** | 110 | 225 | 18 600 | Aluhaus / biały montaż łazienka (armatura) | Umywalki, WC, baterie — rozłożone na m² domu |
| interior_doors | FINISHING | usable 120 m² | 55 | **92** | 65 | 135 | 11 040 | Rynkowe drzwi wewn. ~2–3k/szt., ~8–12 szt./120 m² | Montaż drzwi wewnętrznych |
| garage_gate | OPTIONAL | flat (0 m² base) | 0 | **0** | 0 | 0 | 12 000¶ | Rynkowe bramy segmentowe 8–15k PLN | ¶flat 12 000 Std (izolacja STANDARD) |

\* Golden cost = `validQuestionnairePayload` (`src/lib/api/test-fixtures/questionnaire-payload.ts`): area 120, floors 2, FROM_SCRATCH→DEVELOPER, STANDARD, garage 1, okna 12, drzwi 2, balkon 1, insulation STANDARD.

---

## Modyfikatory (target Std — Phase 2)

### Per-unit (`[PER_UNIT:…]`)

| stage | trigger | curr Std fixed | **target Std fixed** | Econ | Prem | source |
|-------|---------|----------------|----------------------|------|------|--------|
| windows_doors | build_standard + window_count | 2000 | **2600** | 1500 | 4200 | Oferteo / okna PVC 2026 |
| windows_doors | build_standard + exterior_door_count | 6500 | **7200** | 2800 | 7800 | Drzwi wejściowe segmentowe |
| windows_doors | build_standard + terrace_door_count | 10000 | **11000** | 3200 | 15000 | Drzwi tarasowe (golden: 0 szt.) |
| floor_slabs | build_standard + balcony_count | 14000 | **15000** | 9000 | 22000 | Balkon żelbet + wykończenie |

### Flat (bez PER_UNIT)

| stage | trigger | curr fixed | **target fixed** | notes |
|-------|---------|------------|------------------|-------|
| garage_gate | insulation_level STANDARD | 7000 | **12000** | Brama segmentowa z napędem |
| garage_gate | insulation_level ENHANCED | 10000 | **14000** | |
| garage_gate | insulation_level PASSIVE | 13000 | **16000** | |
| **heating** | **build_standard STANDARD** | — | **25000** | **NOWY** — kotłownia / źródło ciepła (Aluhaus ~35k/150 m²) |
| **heating** | **build_standard ECONOMY** | — | **18000** | **NOWY** |
| **heating** | **build_standard PREMIUM** | — | **38000** | **NOWY** (pompa + wyższy standard) |

### Per-m² flat modifiers (bez zmian logiki, wartości Std)

| stage | trigger | curr +PLN/m² | **target +PLN/m²** |
|-------|---------|--------------|-------------------|
| walls | floors=2 | 80 | **80** (bez zmiany) |
| walls | floors=3 | 150 | **150** |
| floor_slabs | floors=2 | 70 | **70** |
| floor_slabs | floors=3 | 140 | **140** |
| floor_slabs | has_attic=true | 60 | **75** |

### Percent (`[PERCENT:N]`) — bez zmian wartości N w S-01

| stages | ENHANCED | PASSIVE |
|--------|----------|---------|
| insulation, foundations, roof_structure, heating | 15% | 30% |

---

## Golden payload sanity check

**Payload:** `validQuestionnairePayload` — identyczny z `e2e/fixtures/golden-questionnaire-payload.ts`.

| slug | Obliczenie (Std) | Koszt [PLN] |
|------|------------------|-------------|
| foundations | 60 × 1050 | 63 000 |
| walls | 120 × (720 + 80) | 96 000 |
| floor_slabs | 120 × (400 + 70) + 1 × 15 000 | 71 400 |
| roof_structure | 120 × 320 | 38 400 |
| roof_covering | 120 × 250 | 30 000 |
| windows_doors | 12 × 2600 + 2 × 7200 | 45 600 |
| electrical | 120 × 265 | 31 800 |
| plumbing | 120 × 215 | 25 800 |
| heating | 120 × 340 + 25 000 | 65 800 |
| insulation | 120 × 235 | 28 200 |
| facade | 120 × 175 | 21 000 |
| interior_plaster | 120 × 115 | 13 800 |
| floor_screeds | 120 × 78 | 9 360 |
| flooring | 120 × 210 | 25 200 |
| painting | 120 × 42 | 5 040 |
| bathroom_fixtures | 120 × 155 | 18 600 |
| interior_doors | 120 × 92 | 11 040 |
| garage_gate | flat 12 000 | 12 000 |
| **SUMA** | | **606 040** |
| **PLN/m² użytkowej** | 606 040 ÷ 120 | **5 050** |

**Widełki rynkowe SDW 2026:** 5 000–6 500 PLN/m² ([OnGeo](https://blog.ongeo.pl/ile-kosztuje-budowa-domu-2026-ceny-za-m2-przyklady), [domyiwnetrza.com](https://domyiwnetrza.com/ile-kosztuje-budowa-domu-w-2026-aktualne-ceny/)) → **PASS** (dolna połowa widełek, bez sztucznego skalowania jednym mnożnikiem).

**Porównanie z obecnym seedem:** ~399 800 PLN (~3 330 PLN/m²) → wzrost **+51%** łącznie, największe skoki: `heating` (+flat), `walls`, `installations`, `FINISHING`.

---

## Phase 2 notes (dla implementera)

1. **Tylko `prisma/seed.ts` + `market-benchmarks.json`** — zero zmian `schema.prisma`, zero ręcznych plików w `prisma/migrations/`.
2. **Nowe modyfikatory `heating` × `build_standard`** — wymagane do osiągnięcia kosztu kotłowni z cennika Aluhaus.
3. Po merge owner: **drop DB** → `pnpm db:seed` (nie `migrate:dev` — brak zmian schema).
4. `market-benchmarks.json`: wszystkie `multiplier: 1.0` (plan Phase 2).

---

## Źródła (skrót bibliografii)

| ID | URL | Użyte dla |
|----|-----|-----------|
| GTF-2026 | https://grunttofundament.pl/poradnik/ile-kosztuja-fundamenty-pod-dom-2026 | foundations |
| Onet-KBPL-2026 | https://www.onet.pl/styl-zycia/kbpl-2/cennik-budowy-i-izolacji-fundamentow-aktualne-koszty-2026-r/lfzvm9v,0666d3f1 | foundations |
| OnGeo-2026 | https://blog.ongeo.pl/ile-kosztuje-budowa-domu-2026-ceny-za-m2-przyklady | SSO/SSZ/SDW widełki, structure |
| Aluhaus-2026 | https://www.aluhaus.com.pl/koszt-budowy-domu-praktyczny-przewodnik-dla-inwestora/ | instalacje, tynki, ocieplenie, CO |
| Oferteo-elektryka-2026 | https://www.oferteo.pl/artykuly/cennik-uslug-elektrycznych | electrical |
| pomoc-instalacja-2026 | https://pomoc-instalacja.pl/koszt-instalacji-elektrycznej-w-domu-100m2 | electrical (cross-check) |
| domyiwnetrza-2026 | https://domyiwnetrza.com/ile-kosztuje-budowa-domu-w-2026-aktualne-ceny/ | sanity SDW widełki |
