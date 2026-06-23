---
date: 2026-06-13T10:00:00+02:00
researcher: Cursor Agent (Auto)
git_commit: feec9185d8af94b9bb468c600a73059ee6248a19
branch: master
repository: EmilBuszylo/homebuild-planner
topic: "Refactor opportunities — ranking structural fixes from cost-flow technical debt analysis"
tags: [research, refactor, plan-results, read-path, investment-state, seed-coupling, technical-debt]
status: complete
last_updated: 2026-06-13
last_updated_by: Cursor Agent (Auto)
source_analysis: context/changes/cost-calibration/research.md
---

# Research: Refactor opportunities

**Date**: 2026-06-13  
**Researcher**: Cursor Agent (Auto)  
**Git Commit**: `feec9185d8af94b9bb468c600a73059ee6248a19`  
**Branch**: `master`  
**Repository**: home-build-planner

## Research Question

Na podstawie analizy długu technicznego i ryzyk strukturalnych: **które problemy warto naprawić, w jakim docelowym kształcie i w jakiej kolejności?** Eksploracja bez refaktoru i bez decyzji implementacyjnych.

**Źródło ustaleń:** `context/changes/cost-calibration/research.md` (+ `context/map/repo-map.md`, artifact-1/2/3, `context/foundation/lessons.md`).

**Uwaga:** użytkownik wskazał `context/changes/post-flow-analysis/research.md` — ten plik **nie istnieje** w repozytorium. Jedyny aktywny raport przepływu to `cost-calibration/research.md`; traktowany jako zebrane dowody.

---

## Klasyfikacja problemów (audyt)

### Kandydaci strukturalni (KANDYDAT)

| ID | Problem (skrót) | Źródło |
|---|---|---|
| **C1** | DTO drift — typ w `plan-results.ts`, składanie inline w route (+ duplikat w calendar export) | cost-cal §2.2, repo-map #108, artifact-3 |
| **C2** | Dual read pattern — RSC + Prisma vs loopback API (`fetchPlanResults`) | cost-cal §2.2, repo-map ryzyka, lessons.md |
| **C3** | `investment-state` sprzężony z `@prisma/client` (trzy powierzchnie typu) | cost-cal §2.2, repo-map, artifact-2 |
| **C4** | Seed/stawki poza grafem modułów — triple maintenance seed + fixtures + parser | cost-cal §2.2, §1.4, archive S-01 |

### Nie-kandydaci (wejście do oceny wykonalności / kosztu)

| Problem | Klasyfikacja | Uwaga |
|---|---|---|
| Brak `schedule-timeline.test.ts` | luka testowa | Nie zmienia struktury kodu |
| Brak `fetch-plan-results.test.ts` | luka testowa | Powiązane z C1/C2, ale sama naprawa = testy |
| GET pusty plan (`stageResults` empty) nieassertowany | luka testowa | `results/route.ts:47-51` |
| Persist mockuje `benchmarks: []` | luka integracyjna testów | |
| `computeStageCost` guards bez testów | luka testowa | |
| `filterStages` edge cases bez testów | luka testowa | Plik testowy istnieje; brakuje scenariuszy |
| GET DTO fields bez asercji w mocku | luka testowa | |
| POST 409 duplicate plan bez unit testu | luka testowa | |
| Brak walidacji Zod DTO na read (`fetch-plan-results.ts:38`) | bramka jakości | Cast bez runtime check — follow-up C1, nie osobny refactor strukturalny |
| Regresja sort timeline vs tabela | ryzyko bez testu spójności | S-11 naprawione; brak guard testu |
| Pokrycie linii vitest `--coverage` | unknown | Nie uruchomiono w źródle |
| Bus factor 1 | dług procesowy | |
| Pomyłka slugów S-01 vs cost-calibration | dokumentacja | |
| Owner-only migrate/seed | ograniczenie operacyjne | lessons.md |
| Decyzje odrzucone (merged cost+timeline, wykresy) | świadomy scope | frame S-11 |
| Freeze-on-write / brak przeliczania na read | **decyzja produktowa** | Naprawa = przeprojektowanie pojęć biznesowych, nie struktury — **poza tym researchu** |
| Questionnaire form vs API schema split | **świadome ograniczenie** | lessons.md — RHF vs API refine; nie refactor strukturalny |
| UNKNOWN: procedura re-seed prod | operacyjne | |
| UNKNOWN: puste `MarketBenchmark` w prod | behawioralne | |
| Szeroki fan-in `questionnaire` / `plan-results` | obserwacja architektury | Konsekwencja kontraktów hubowych, nie bug do „naprawy” bez zmiany produktu |

---

## Summary

- **4 kandydatów strukturalnych** z analizy cost-calibration; reszta to luki testowe, proces lub decyzje produktowe.
- **Werdykt intencjonalności:** wszystkie cztery kandydaty mają **świadome uzasadnienie MVP** w archiwum (S-02, S-09, plan-generation, cost-calibration impl-review F3) — refactor to **ergonomia i spójność**, nie naprawa niedokumentowanego wypadku.
- **Ranking (propozycja na planowanie):** (1) **C1** ekstrakcja assemblera DTO, (2) **C2** wspólny loader planu metadata, (3) **C3** decouple typów investment-state; **C4** wartościowy, ale cięższy — po C1/C3 lub równolegle fazami.
- **Odrzucone jako pierwsze refactory:** ujednolicenie questionnaire przez API results, usunięcie freeze-on-write, merge widoków koszt/timeline.

---

## C1: DTO assembler drift

### Obecny kształt

| Aspekt | Dowód |
|---|---|
| Kontrakt typów-only | **EVIDENCE** — `src/lib/plan-results.ts:1-25` — `PlanResultsDto`, `PlanResultsStageDto`, `PlanStageNoteDto`; brak funkcji składającej |
| Jedyny pełny producent DTO | **EVIDENCE** — `src/app/api/plans/[planId]/results/route.ts:28-88` — Prisma load, join `constructionStage`, `totalCost`, `loadStageNotesForPlan`, mapowanie pól refinement |
| Częściowa ekstrakcja | **EVIDENCE** — `src/lib/plan/load-plan-stage-notes.ts:4-28` — tylko `PlanStageNoteDto` |
| Drugi assembler (nie-DTO) | **EVIDENCE** — `src/lib/google-calendar/export-stages-to-calendar.ts:28-82` — duplikuje mapowanie stage bez `category` (`build-stage-events.ts:6-12` vs `plan-results.ts:1-8`) |
| Konsumenci typ-only | **EVIDENCE** — 13 importerów prod (depcruise): UI plan/dashboard, `fetch-plan-results.ts`, kalendarz, helpers `layout-timeline-stages`, `sort-plan-stages-chronologically` |
| Brak runtime validation | **EVIDENCE** — `src/lib/api/fetch-plan-results.ts:38-39` — `as PlanResultsDto` |
| Testy chronią podzbiór | **EVIDENCE** — `plans-route-handlers.test.ts` — 401/404/500, długość `stages`; brak asercji `totalCost`, `refinementApplied`, pustego `stageResults` |

**INFERENCE:** Route jest zgodny z typem w compile-time; ryzyko to **dryft pól** przy kolejnych rozszerzeniach (historia: refinement + stageNotes = 2 pliki) i **duplikat** w calendar export.

### Werdykt intencjonalności

**Świadome ograniczenie (decyzja nośna).**

- **EVIDENCE** — `e63064a` (2026-05-27): `plan-results.ts` i `results/route.ts` powstały razem w S-02 plan-generation.
- **EVIDENCE** — `context/archive/2026-05-27-plan-generation/plan.md` Phase 2: route = auth + join + payload; typy w osobnym module.
- **EVIDENCE** — `context/archive/2026-05-27-internet-refinement/plan.md`: każde rozszerzenie DTO = typ + route (dwuplikowy workflow zaakceptowany).
- **EVIDENCE** — artifact-3: „stabilny kontrakt, zmienny assembler” — 3 commity na DTO vs więcej na route/UI.

### Wykonalność migracji

| Element | Ocena |
|---|---|
| Istniejąca abstrakcja | Typy + `loadStageNotesForPlan`; brak assemblera / Zod dla wyników |
| Nowa abstrakcja | `assemblePlanResultsDto(...)` w `src/lib/plan/`; opcjonalnie `planResultsSchema` (wzorzec jak questionnaire) |
| Blast radius | Typ hub: **13 direct / 18 transitive** — sam extract **nie zmienia** fan-in; zmiana **kształtu** pól dotyka 13 importerów + schema |
| Osłony | `plans-route-handlers.test.ts`, E2E risk-04/07; **brak** testów `fetchPlanResults` i pełnego kontraktu DTO |
| CI | lint → test → build; e2e z seed; **depcruise nie w CI** |
| Pierwszy krok-prerekwizyt | Extract pure assembler z route **bez zmiany zachowania**; opcjonalnie dodać test pustego `stageResults` i asercje pól refinement przed dalszymi ruchami |
| Blokery | Nowe pola DB → owner-only migrate; assembler nie może importować `test-fixtures` (reguła depcruise) |

**Docelowy kształt (nazwa, nie pełna architektura):** jeden moduł assemblera + opcjonalnie wspólny Zod schema obok typów.

---

## C2: Dual read pattern (RSC Prisma vs API fetch)

### Obecny kształt

| Strona / moduł | Wzorzec | Dowód |
|---|---|---|
| `plan/[planId]/page.tsx` | Tylko `fetchPlanResults` | **EVIDENCE** — `:65-66` |
| `dashboard/page.tsx` | **Hybryda:** `prisma.plan.findFirst` + `fetchPlanResults` | **EVIDENCE** — `:39-46` |
| `questionnaire/page.tsx` | Prisma: plan + responses + `questionDefinition` | **EVIDENCE** — `:28-47` |
| `(app)/layout.tsx` | Prisma: `latestPlanId` | **EVIDENCE** — `:17-22` |
| GET results | Ownership + assembly | **EVIDENCE** — `results/route.ts:18-44` |
| Reguła lessons | Domain przez API | **EVIDENCE** — `lessons.md:5-9` — UI/RSC tylko HTTP dla danych domenowych |

**INFERENCE:** Dual pattern to nie „dashboard vs plan” dla wyników — **oba** używają API dla DTO. Rozjazd to **Prisma dla metadanych planu / ankiety** vs **loopback dla zamrożonych wyników**.

**UNKNOWN:** Edge case `getSiteOrigin()` przy loopback w deploy (wspomniane w cost-cal open questions).

### Werdykt intencjonalności

**Świadome ograniczenie (decyzja nośna).**

- **EVIDENCE** — Lesson API routes (`d7617eb`, `ab384f0`, 2026-05-21) **przed** dashboard z danymi domenowymi.
- **EVIDENCE** — `7494d35`: plan page + `fetchPlanResults`; `9804f21`: dashboard tylko Prisma link; `79980f9`: dashboard + snapshot przez fetch (S-09 app-panel-polish).
- **EVIDENCE** — `context/archive/2026-06-01-app-panel-polish/plan.md`: reuse fetch zamiast duplikacji assembly; Prisma w layout OK dla MVP.

### Wykonalność migracji

| Element | Ocena |
|---|---|
| Istniejąca abstrakcja | `fetchPlanResults` + GET route; brak wspólnego server loadera |
| Nowa abstrakcja | `loadLatestPlanForUser(userId)` dla layout/dashboard/questionnaire; opcjonalnie wspólny loader wyników współdzielony route + RSC (eliminacja loopback) |
| Blast radius | Extract latest-plan: **3 pliki RSC**, niski; drop loopback: route + 2 strony + **IDOR semantics** |
| Osłony | Handler tests (ownership w GET); **brak** testów RSC dashboard/questionnaire/layout; E2E risk-04 tylko plan page |
| Pierwszy krok-prerekwizyt | Extract `loadLatestPlanForUser` — identyczne zapytania, bez zmiany API |
| Blokery | Wspólny loader wyników **musi** replikować check `plan.userId === user.id` — ryzyko IDOR; questionnaire **nie powinien** wołać GET results (zły kształt danych) |

**Docelowy kształt:** wspólne loadery server-side; opcjonalnie route woła ten sam assembler co RSC (po C1).

---

## C3: `investment-state` → Prisma enum

### Obecny kształt

| Powierzchnia typu | Źródło | Dowód |
|---|---|---|
| DB enum | `prisma/schema.prisma:22-28` | **EVIDENCE** |
| Logika kolejności | `investment-state.ts:1-104` | **EVIDENCE** — `import type { InvestmentState } from "@prisma/client"` |
| Zod union (ankieta/API) | `validations/questionnaire.ts:9-17` | **EVIDENCE** — osobny `InvestmentState` z infer |
| Re-export ORM | `types/domain.ts:1-6` | **EVIDENCE** — nadal `@prisma/client` |
| Silnik filter | `stage-filter.ts:1-2` | **EVIDENCE** — typ z questionnaire, funkcje z `investment-state` |

Importerzy `investment-state`: questionnaire validations, `stage-filter`, `questionnaire-form`, `step-content`, testy (**EVIDENCE** — 6 modułów prod + 2 test).

### Werdykt intencjonalności

**Świadome ograniczenie (decyzja nośna).**

- **EVIDENCE** — `f964e1f` (2026-05-27): plik od początku z importem Prisma.
- **EVIDENCE** — `context/archive/2026-05-27-plan-generation/plan.md` §Phase 1: wspólna kolejność stanów dla silnika i ankiety; single source.
- **EVIDENCE** — `2eb7576` + lessons.md: split form/API schema to osobna decyzja; UI filtruje przez `investment-state.ts`.
- **EVIDENCE** — artifact-2: flaguje coupling jako znane pytanie refactor, nie oversight.

### Wykonalność migracji

| Element | Ocena |
|---|---|
| Istniejąca abstrakcja | `types/domain.ts` istnieje, ale **nie decoupluje** |
| Nowa abstrakcja | Kanoniczny string union (const array lub re-export Zod infer) w `types/domain.ts`; `investment-state.ts` importuje stamtąd |
| Blast radius | **~6 direct / ~20 transitive** (artifact-2); zmiana **wartości** enum → seed + schema + Zod + migrate; zmiana **tylko importu typu** → wąski |
| Osłony | `investment-state.test.ts` (10 przypadków), `questionnaire-inputs.test.ts`, pipeline test, handler 400 on invalid order, persist filter regression, E2E risk-04 pośrednio |
| Pierwszy krok-prerekwizyt | Zamiana importu w `investment-state.ts` na domain union **bez zmiany wartości**; Prisma re-export jako shim |
| Blokery | Zmiana wartości enum → owner-only migrate; fixtures mogą nadal importować Prisma (test-only) |

**Docelowy kształt:** jeden kanoniczny typ domenowy string-union; Prisma enum synchronizowany tylko na granicy persystencji.

---

## C4: Seed / stawki poza grafem modułów

### Obecny kształt

```
prisma/seed.ts (runtime, poza depcruise src)
    ↑ readFileSync + regex parse
parse-seed-calibration.ts
    ↔ calibration-seed-parity.test.ts
    ↔ calibrationStageRateDefs / calibrationModifierDefs (fixtures)
    → fullStagesForCalibration, golden oracle
```

| Aspekt | Dowód |
|---|---|
| Seed poza grafem | **EVIDENCE** — `pnpm depcruise` tylko `src` (`package.json`); brak krawędzi do `prisma/seed.ts` |
| Triple maintenance | **EVIDENCE** — `prisma/seed.ts` + `full-stages-calibration.ts` + `calibration-modifier-defs.ts` |
| Guard | **EVIDENCE** — `calibration-seed-parity.test.ts:14-52` |
| Celowe minimalStages | **EVIDENCE** — `minimal-stages.ts:6-9` — „intentionally stale” |
| Runtime coupling | **INFERENCE** — silnik czyta stawki z DB zseedowanej przez `seed.ts`; brak importu w prod `src` |
| Fragile parser | **EVIDENCE** — `parse-seed-calibration.ts:38-67` — regex na tekście seed |

### Werdykt intencjonalności

**Świadome ograniczenie (decyzja nośna).**

- **EVIDENCE** — `context/archive/2026-06-09-cost-calibration/reviews/impl-review.md` **F3**: triple maintenance → **Fix A: parity test** (Decision: FIXED).
- **EVIDENCE** — `b409f7f` (2026-06-10): dodanie parity test + parser.
- **EVIDENCE** — plan S-01: **zakaz importu `prisma/seed.ts` w Vitest**.
- **EVIDENCE** — reguła depcruise `plan-generation-stays-pure` — seed/fixtures poza silnikiem prod.

### Wykonalność migracji

| Element | Ocena |
|---|---|
| Istniejąca abstrakcja | Wzorzec JSON: `prisma/data/market-benchmarks.json`; brak wspólnego modułu stawek PLN/m² |
| Nowa abstrakcja | `src/lib/plan-generation/calibration/stage-rate-defs.ts` (lub JSON w `prisma/data/`) importowany przez fixtures, potem seed |
| Blast radius | Same values: seed + fixtures + parity test; **change values**: oracle + golden + E2E teksty (risk-04) + plany bez recalculate |
| Osłony | `calibration-seed-parity.test.ts`, golden oracle, `persist-plan-version.test.ts`, risk-04/07 (CI: migrate + seed) |
| Pierwszy krok-prerekwizyt | Shared defs skopiowane verbatim; fixtures importują shared; seed bez zmian; rozszerzyć parity o shared ↔ seed |
| Blokery | Seed import z `src/lib` wymaga ścieżki względnej (seed bez `@/`); prod re-seed **UNKNOWN**; usunięcie parsera dopiero gdy seed czyta shared source |

**Docelowy kształt:** jeden moduł/JSON źródłowy dla stawek i modyfikatorów; seed = consumer; parity test = diff guard, nie parser regex.

---

## Refactor opportunities (ranking propozycji)

Ocena: koszt długu vs koszt zmiany, blast radius, odwracalność, istniejące osłony. **To propozycja na osobną sesję planowania — bez prośby o wybór tutaj.**

### #1 — C1: Ekstrakcja assemblera `PlanResultsDto`

| | |
|---|---|
| **Obecny → docelowy** | Inline w `results/route.ts` (+ duplikat calendar) → **`assemblePlanResultsDto()`** w `src/lib/plan/`; opcjonalnie **`planResultsSchema`** (Zod) |
| **Czemu #1** | Najniższy koszt, wysoka odwracalność; adresuje realny dryft (calendar bez `category`, brak testów kontraktu); odblokowuje C2 (wspólny loader bez duplikacji assembly) |
| **Koszt długu** | Każde nowe pole DTO = 2+ pliki; brak runtime validation na fetch; calendar drift |
| **Koszt zmiany** | Niski — pure extract + testy handlera |
| **Blast radius** | Wąski przy extract-only; szeroki dopiero przy zmianie kształtu pól (13←) |
| **Ścieżka inkrementalna** | (1) extract assembler → (2) route thin wrapper → (3) testy pustego planu + pól refinement → (4) opcjonalnie Zod w route + fetch → (5) calendar używa assemblera lub GET |
| **Pierwszy prerekwizyt** | Extract bez zmiany zachowania; zielone `plans-route-handlers.test.ts` + risk-04 |

### #2 — C2: Wspólny loader metadanych planu (`loadLatestPlanForUser`)

| | |
|---|---|
| **Obecny → docelowy** | 3× duplikowane `prisma.plan.findFirst` w layout/dashboard/questionnaire → **jeden loader**; wyniki nadal przez `fetchPlanResults` (faza 1) |
| **Czemu #2** | Redukuje duplikację zgodnie z lessons (częściowo); nie wymaga DB migrate; nie dotyka kontraktu DTO |
| **Koszt długu** | Niespójność read patterns; trudniejsze IDOR review przy rozproszeniu |
| **Koszt zmiany** | Niski–średni |
| **Blast radius** | 3 pliki RSC + ewentualnie `prisma.ts` fan-in |
| **Ścieżka inkrementalna** | (1) extract loader → (2) swap 3 call-site'y → (3) testy loadera → (4) *później* opcjonalnie współdzielenie z route po C1 |
| **Pierwszy prerekwizyt** | Loader z identycznym query jak dziś; **nie** usuwać loopback fetch bez testów ownership |

### #3 — C3: Decouple typów `investment-state` od Prisma

| | |
|---|---|
| **Obecny → docelowy** | `@prisma/client` w `investment-state.ts` → **kanoniczny string union** w `types/domain.ts` (wartości bez zmian) |
| **Czemu #3** | Silnik/UI mogą zależeć od domeny bez ORM; dobrze pokryte testami; wysoka odwracalność |
| **Koszt długu** | Trzy powierzchnie typu; ryzyko drift enum Zod ↔ Prisma ↔ seed |
| **Koszt zmiany** | Niski przy type-only |
| **Blast radius** | ~6 direct importerów; **nie** dotyka persist (2←) ani plan-results |
| **Ścieżka inkrementalna** | (1) domain union → (2) investment-state import → (3) deprecate shim w types/domain → (4) opcjonalnie ujednolicenie z Zod infer |
| **Pierwszy prerekwizyt** | Tylko zmiana importu typu; `investment-state.test.ts` + questionnaire tests green |

### Rozważeni i odrzuceni (na tym etapie eksploracji)

| Kandydat / kierunek | Dlaczego niżej / odrzucony |
|---|---|
| **C4** shared calibration defs | Wysoki koszt (seed + fixtures + parity + E2E); **świadomy guard już istnieje** (impl-review F3); sensowny jako **faza 2–4** po C1/C3, nie pierwszy ruch |
| Drop loopback / RSC direct loader wyników | Średnie ryzyko IDOR; wymaga C1 + testów ownership; **UNKNOWN** deploy origin |
| Questionnaire → GET results API | **Odrzucony** — zły kształt danych (edycja vs frozen DTO) |
| Freeze-on-write → recompute on read | **Odrzucony** — decyzja produktowa FR-006/008, nie refactor strukturalny |
| Merge PlanCostTable + PlanTimeline | **Odrzucony** — frame S-11 explicit out of scope |
| Questionnaire form/API schema merge | **Odrzucony** — load-bearing lesson (RHF regression) |
| Samo dodanie testów (bez C1–C4) | Poza rankingiem refactor — wejście jako prerekwizyty (np. testy przed C2 loopback removal) |
| depcruise w CI | Procesowe ulepszenie; warto po C3/C4 zmianach grafu — nie osobny kandydat strukturalny |

### Sugerowana kolejność faz (propozycja)

```
C1 extract assembler (+ testy kontraktu)
    → C2 loadLatestPlanForUser
    → C3 domain union investment-state
    → C4 shared calibration defs (seed consumer na końcu)
```

---

## Code References

- `src/lib/plan-results.ts:1-25` — kontrakt DTO (typy)
- `src/app/api/plans/[planId]/results/route.ts:28-88` — assembler inline
- `src/lib/api/fetch-plan-results.ts:12-39` — loopback read
- `src/app/(app)/dashboard/page.tsx:39-46` — hybryda Prisma + fetch
- `src/app/(app)/plan/[planId]/page.tsx:65-66` — fetch-only
- `src/lib/investment-state.ts:1-9` — coupling Prisma
- `src/lib/plan-generation/calibration-seed-parity.test.ts` — guard seed ↔ fixtures
- `context/foundation/lessons.md:5-9` — domain via API routes
- `context/changes/cost-calibration/research.md` — źródłowa analiza długu

---

## Architecture Insights

1. **„Dług” vs „decyzja”:** większość kandydatów to udokumentowane trade-offy MVP (S-02, S-09, S-01), nie przypadkowa złożoność — refactor poprawia ergonomię, nie koryguje błędu architektonicznego.
2. **Kontrakty hubowe** (`questionnaire`, `plan-results`) mają szeroki fan-in **z definicji** — nie da się „naprawić” bez zmiany granic produktu.
3. **C1 + C2** tworzą naturalną parę: jeden assembler + opcjonalnie wspólny loader eliminują duplikację bez naruszania freeze-on-write.
4. **Testy jako prerekwizyty:** luki z §2.1 cost-cal nie są kandydatami strukturalnymi, ale **blokują bezpieczne usunięcie loopback** (C2 faza 2) i **potwierdzają C1**.

---

## Historical Context

- `context/changes/cost-calibration/research.md` — pełna analiza przepływu, dług, blast radius (wejście)
- `context/map/repo-map.md` — decyzje mapy #1–#8, ryzyka coupling
- `context/archive/2026-05-27-plan-generation/` — geneza DTO + GET + fetch
- `context/archive/2026-06-01-app-panel-polish/` — dashboard hybrid read
- `context/archive/2026-06-09-cost-calibration/reviews/impl-review.md` — F3 seed parity
- `context/archive/2026-06-02-plan-results-polish-details/frame.md` — odrzucone merge widoków

---

## Open Questions (pozostawione na planowanie)

1. **UNKNOWN:** Czy docelowo loopback fetch ma zniknąć na plan/dashboard, czy zostaje jako enforcement IDOR w jednym miejscu?
2. **UNKNOWN:** Procedura prod re-seed po C4 — blokuje ostatnią fazę seed-import.
3. **UNKNOWN:** Czy dodać depcruise do CI przed czy po C4?
4. **INFERENCE:** C4 parser regex — kiedy bezpiecznie usunąć (tylko gdy seed importuje shared module).

---

## Related Research

- `context/changes/cost-calibration/research.md` — analiza źródłowa (post-flow-analysis nie istnieje)
- `context/map/artifact-2-structure.md` — fan-in, kontrakty
- `context/map/artifact-3-contributors.md` — semantyka DTO, must-read archiwum
