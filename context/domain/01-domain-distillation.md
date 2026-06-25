---
title: Destylacja domeny — home-build-planner
created: 2026-06-13
type: domain-distillation
git_commit: feec9185d8af94b9bb468c600a73059ee6248a19
sources:
  - context/foundation/prd.md
  - context/foundation/tech-stack.md
  - context/foundation/roadmap.md
  - context/foundation/lessons.md
  - context/map/repo-map.md
  - context/archive/2026-06-11-timeline-notes/plan.md
  - context/changes/cost-calibration/research.md
  - context/changes/refactor-opportunities/research.md
  - prisma/schema.prisma
limitations:
  - README w korzeniu repo to szablon create-next-app — bez narracji produktowej (context/foundation/prd.md jest źródłem wizji).
  - Brak formalnych ADR; decyzje domenowe rozproszone w context/archive/* i lessons.md.
---

# Destylacja domeny — home-build-planner

## KROK 0 — Kontekst projektu

### Dokumenty źródłowe (przeczytane)

| Dokument | Rola |
|---|---|
| `context/foundation/prd.md` | Wizja, FR/NFR, logika biznesowa, non-goals |
| `context/foundation/tech-stack.md` | Stack, granica Auth vs dane domenowe |
| `context/foundation/roadmap.md` | North star (kalibracja), zrealizowane slice'y |
| `context/foundation/lessons.md` | Reguły architektoniczne wpływające na model |
| `context/map/repo-map.md` | Synteza terytorium i ryzyk coupling |
| `context/archive/2026-06-11-timeline-notes/plan.md` | Decyzje o notatkach per plan |
| `context/changes/cost-calibration/research.md` | Przepływ write/read, blast radius |
| `context/changes/refactor-opportunities/research.md` | Ranking refaktorów strukturalnych |

### Stack i warstwy (gdzie żyje logika biznesowa)

| Warstwa | Lokalizacja | Rola domenowa |
|---|---|---|
| **Persystencja (model)** | `prisma/schema.prisma` | Encje: Plan, PlanVersion, QuestionnaireResponse, PlanStageResult, ConstructionStage, … |
| **Silnik (pure)** | `src/lib/plan-generation/` | Filtrowanie etapów, harmonogram, koszt etapu — bez I/O |
| **Orkiestracja zapisu** | `src/lib/plan/persist-plan-version.ts` | Tx: wersja + odpowiedzi + generacja + refinement + wyniki |
| **Refinement** | `src/lib/plan-refinement/` | Mnożniki rynkowe na wynikach |
| **Walidacja wejścia** | `src/lib/validations/questionnaire.ts` | Schemat ankiety (Zod) |
| **Reguły stanów inwestycji** | `src/lib/investment-state.ts` | Kolejność etapów budowy |
| **API (granica aplikacji)** | `src/app/api/plans/**` | Auth, ownership, HTTP |
| **Read model (DTO)** | `src/lib/plan-results.ts` + `results/route.ts` | Prezentacja zamrożonych wyników |
| **UI** | `src/app/(app)/`, `src/components/` | Ankieta, kosztorys, timeline |
| **Baza wiedzy (seed)** | `prisma/seed.ts` | Etapy, stawki, modyfikatory, benchmarki |
| **Auth (generic)** | Supabase + `src/app/(auth)/actions.ts` | Poza rdzeniem planowania |

**EVIDENCE (tech-stack):** dane domenowe przez Prisma w Route Handlers; Auth przez Server Actions (`context/foundation/tech-stack.md:24`).

---

## KROK 1 — Ubiquitous Language

Terminy w kolejności odkrycia (dokument → kod). Skrót: **Ź** = cytat, **K** = kod.

| Termin | Definicja | Ź (plik:linia) | K (plik:linia) |
|---|---|---|---|
| **Inwestor budujący w trybie gospodarczym** | Primary persona: pierwszy dom, bez eksperckiej wiedzy budowlanej | `context/foundation/prd.md:28` | BRAK w kodzie (persona tylko w copy) — `src/lib/copy/site.ts:2` opis marketingowy |
| **Ankieta planistyczna** | Dynamiczny kwestionariusz krok po kroku; wejście do generacji | `prd.md:43-44`, `prd.md:78-79` (FR-003) | `src/components/questionnaire/questionnaire-form.tsx`; walidacja `src/lib/validations/questionnaire.ts:86-137` |
| **Odpowiedzi ankiety** | Zapisane wartości pytań powiązane z wersją planu | `prd.md:59-65` (edycja → przeliczenie) | `prisma/schema.prisma:170-178` (`QuestionnaireResponse`); `persist-plan-version.ts:25-31` |
| **Stan inwestycji (docelowy)** | Do jakiego etapu użytkownik chce dojść (np. deweloperski) | `prd.md:113` („stan inwestycji … surowy otwarty … deweloperski”) | `questionnaire.ts:87` (`investment_state`); enum `prisma/schema.prisma:22-28` (`InvestmentState`) |
| **Stan startowy** | Od jakiego etapu użytkownik zaczyna | `lessons.md:49-50` (starting vs target) | `questionnaire.ts:88` (`starting_state`); `investment-state.ts:22-27` |
| **Standard budowy** | Economy / Standard / Premium — wpływa na stawkę PLN/m² | `prd.md:113` | `questionnaire.ts:89`; enum `schema.prisma:30-34`; `compute-costs.ts:8-19` |
| **Etap budowy (construction stage)** | Nazwany etap prac z kolejnością, kategorią, stawkami, poprzednikami | `prd.md:22`, `prd.md:115` („zestaw etapów”) | `schema.prisma:66-83` (`ConstructionStage`); seed `prisma/seed.ts` |
| **Plan budowy** | Kontener właściciela na wersje i notatki | `prd.md:55-65` (US-01) | `schema.prisma:140-152` (`Plan`) |
| **Wersja planu** | Snapshot ankiety + wyników po generacji/przeliczeniu | `roadmap.md:63` (FR-005 edycja i przeliczenie) | `schema.prisma:154-168` (`PlanVersion`) |
| **Wynik etapu (stage result)** | Zamrożony koszt orientacyjny + timing dla etapu w danej wersji | `prd.md:115-116`; NFR czytelność `prd.md:104` | `schema.prisma:181-193` (`PlanStageResult`); `generate-plan-results.ts:22-28` |
| **Kosztorys orientacyjny** | Wycena etapów — punkt wyjścia, nie oferta wiążąca | `prd.md:126-127` (non-goals); `prd.md:43` | `src/lib/copy/orientational.ts:1-2`, `:16-17`; UI `plan-cost-table.tsx` |
| **Harmonogram / timeline** | Kolejność etapów w czasie (`startDay`, `durationDays`) | `prd.md:22`, `prd.md:86` (FR-006) | `schedule-timeline.ts:37-80`; pola w `PlanStageResult` |
| **Generowanie planu** | Analiza odpowiedzi → kosztorys + timeline | `prd.md:92-93` (FR-008) | `generate-plan-results.ts:10-29`; entry `persist-plan-version.ts:38-39` |
| **Przeliczenie planu** | Nowa wersja po edycji ankiety | `prd.md:44`, `prd.md:82-83` (FR-005) | `recalculate/route.ts:16+`; `persist-plan-version.ts` |
| **Modyfikator kosztu etapu** | Dopłata warunkowa od odpowiedzi ankiety | `schema.prisma:95-107`; komentarz seed w research | `compute-costs.ts:86-94`; `StageCostModifier` |
| **Benchmark rynkowy / refinement** | Korekta kosztów indeksami per kategoria etapu (FR-009) | `prd.md:94-95` (FR-009 „internet browsing data”) | `schema.prisma:85-93`; `apply-market-benchmarks.ts:27-88`; `persist-plan-version.ts:41-42` |
| **Notatka do etapu** | Tekst użytkownika + pin na wierszu harmonogramu | `prd.md:88-89` (FR-007) | `schema.prisma:195-208` (`PlanStageNote`); `upsert-plan-stage-note.ts:16-63` |
| **Wskazówka coachingowa** | Treść systemowa na etapie (≠ notatka użytkownika) | `timeline-notes/plan.md:16` | `schema.prisma:71` (`coachingNote`); `src/lib/plan/coaching-hints.ts` |
| **Eksport do kalendarza** | Zdarzenia dla etapów w Google Calendar | `prd.md:98-99` (FR-010) | `export-stages-to-calendar.ts`; FR-010 nice-to-have w roadmap |
| **Limit przeliczeń** | Ograniczenie liczby pełnych przeliczeń (koszt operacyjny) | `prd.md:107`; Open Q #3 w `prd.md:134` | `plan-recalc.ts:10-11`, `:20-28`; egzekwowane `recalculate/route.ts:49-56` |
| **Jeden plan na użytkownika (MVP)** | POST tworzy plan tylko gdy brak istniejącego | **INFERENCE** z 409 — nie explicite w PRD | `route.ts:39-44`, `:60-64` |

---

## KROK 2 — Klasyfikacja subdomen

| Obszar / pojęcie | Core / Supporting / Generic | Uzasadnienie (odwołanie do celu produktu) |
|---|---|---|
| **Generowanie kosztorysu + harmonogramu z ankiety** | **Core** | Success Criteria Primary: „orientacyjny kosztorys etapów budowy oraz timeline” (`prd.md:43-44`); FR-006, FR-008 must-have |
| **Kalibracja stawek etapów i modyfikatorów** | **Core** | Roadmap North star S-01: bez wiarygodnych liczb produkt „nie spełnia obietnicy” (`roadmap.md:26-28`) |
| **Filtrowanie etapów wg stanu inwestycji** | **Core** | Logika biznesowa PRD: stan inwestycji jako kluczowe wejście (`prd.md:113`); `stage-filter.ts:16-68` |
| **Ankieta (pytania, walidacja, UX)** | **Supporting** | Enables core; sama forma nie jest przewagą — FR-003/004 wspierają wejście |
| **Refinement benchmarkami (FR-009)** | **Supporting** | Rozszerza core o „doprecyzowanie” orientacyjne; PRD mówi o danych z internetu, implementacja = cache DB |
| **Notatki i pin na timeline (FR-007)** | **Supporting** | Secondary success criteria (`prd.md:47`); nice-to-have w PRD |
| **Eksport Google Calendar (FR-010)** | **Supporting** | Nice-to-have (`prd.md:98-99`); roadmap S-04 done |
| **Prezentacja wyniku (DTO, UI koszt/timeline)** | **Supporting** | Guardrail czytelności (`prd.md:51-52`); nie zmienia reguł wyceny |
| **Auth (email/hasło)** | **Generic** | FR-001/002 must-have, ale nie różnicuje produktu vs inne SaaS (`prd.md:70-73`) |
| **Rate limit przeliczeń** | **Generic** | NFR koszt operacyjny (`prd.md:107`); polityka infrastrukturalna |
| **Copy „orientacyjnie” / disclaimery** | **Supporting** | Non-goal: nie wiążące oferty (`prd.md:126-127`); `orientational.ts` |
| **Persistence Prisma / Supabase** | **Generic** | tech-stack; replaceable infrastructure |

---

## KROK 3 — Kandydaci na agregaty i niezmienniki

> **Uwaga metodologiczna:** W kodzie nie ma warstwy „agregatów” explicite — kandydaci wynikają z `schema.prisma`, PRD i spójności transakcyjnej. Status egzekucji: **egzekwuje** (kod wymusza), **deklaruje** (typ/schema/komentarz), **ignoruje** (luka lub rozjazd).

### A1 — **Plan** (korzeń: `Plan`)

| Niezmiennik | Źródło | Status w kodzie |
|---|---|---|
| Plan należy do dokładnie jednego użytkownika | Access control MVP: płaski model, izolacja per user (`prd.md:119-121`) | **Egzekwuje** — `results/route.ts:42`; `recalculate/route.ts:43`; `stage-notes/route.ts:46` (`plan.userId !== user.id` → 404) |
| MVP: użytkownik ma co najwyżej jeden plan przy pierwszym POST | **INFERENCE** z flow US-01 + 409 | **Egzekwuje** — `route.ts:39-44`, `:60-64` (409 „Plan już istnieje”) |
| Notatki etapów są per **plan**, nie per wersja — przetrwają przeliczenie | `timeline-notes/plan.md:5`, `:13`; `repo-map.md:25` | **Egzekwuje** — `PlanStageNote.planId` (`schema.prisma:204-205`); `persist-plan-version.ts` nie dotyka `PlanStageNote` |
| Notatka tylko dla slugów obecnych w bieżącym harmonogramie | `timeline-notes/plan.md:28-29` | **Egzekwuje** — `upsert-plan-stage-note.ts:28-30` (`activeSlugs`); osierocone slugi w DB — **deklaruje** w planie archiwum, brak auto-cleanup |

### A2 — **PlanVersion** (korzeń w kontekście generacji; dziecko `Plan`)

| Niezmiennik | Źródło | Status w kodzie |
|---|---|---|
| Każda generacja/przeliczenie tworzy **nową wersję** z monotonicznym `versionNumber` | US-01: zaktualizowana wersja wyników (`prd.md:59-65`) | **Egzekwuje** — `PlanVersion.versionNumber` unique per plan (`schema.prisma:167`); `persist-plan-version.ts:18-23` |
| Odpowiedzi ankiety są immutable w ramach wersji (nowa wersja = nowy zestaw wierszy) | **INFERENCE** z modelu wersjonowanego | **Egzekwuje** — `QuestionnaireResponse` FK `planVersionId` (`schema.prisma:175-176`) |
| Wyniki koszt/timing są **zamrożone** w wersji; odczyt nie przelicza silnika | cost-cal research freeze-on-write | **Egzekwuje** — zapis `PlanStageResult` w persist (`persist-plan-version.ts:55-64`); GET składa DTO z DB (`results/route.ts:28-40`) — brak importu `plan-generation` |
| Generacja = filter → schedule → compute w jednym przebiegu | **INFERENCE** z FR-008 | **Egzekwuje** — `generate-plan-results.ts:14-24` |
| Koszty mają charakter **orientacyjny**, nie wiążący | `prd.md:126-127` | **Deklaruje** — copy UI (`orientational.ts:16-17`); **ignoruje** jako reguła domenowa — brak typu/value object „MoneyOrientacyjny” w silniku |
| `starting_state` musi być **wcześniejszy** niż `investment_state` (strict `<`) | `lessons.md:54`; logika PRD stanów | **Egzekwuje** (API) — `questionnaireInputsSchema` refine (`questionnaire.ts:143-150`); UI filtruje (`investment-state.ts:56-66`) |
| Etap w harmonogramie tylko jeśli `completedByState` mieści się między start a target | **INFERENCE** z logiki filtrowania | **Egzekwuje** — `stage-filter.ts:48-65` |
| Przeliczenia pełne limitowane w oknie czasowym | `prd.md:107`; domyślnie 3/24h w kodzie | **Egzekwuje** — `plan-recalc.ts:38-58`; **deklaruje** vs PRD — konkretny próg był Open Question (`prd.md:134`), kod ustala default bez product sign-off w PRD |

### A3 — **ConstructionStage** (+ modyfikatory) — katalog wiedzy

| Niezmiennik | Źródło | Status w kodzie |
|---|---|---|
| Stawki PLN/m² per standard są źródłem prawdy dla kosztu bazowego | Roadmap S-01, FR-008 | **Egzekwuje** runtime — load z DB (`persist-plan-version.ts:33-36`); **ignoruje** spójność repo — seed/fixtures triple maintenance (research C4) |
| Silnik generacji **nie importuje** Prisma (pure) | lessons + depcruise rule | **Egzekwuje** — brak `@prisma/client` w prod `plan-generation/` (cost-cal research §3) |
| Modyfikator distance band aktywny tylko przy municipal water/sewage | **INFERENCE** z domeny mediów S-05 | **Egzekwuje** — `compute-costs.ts:31-48` (`isModifierActive`) |

### A4 — **MarketBenchmark** (refinement)

| Niezmiennik | Źródło | Status w kodzie |
|---|---|---|
| Mnożnik benchmarku w bezpiecznym paśmie | impl-review / NaN guard (archiwum internet-refinement) | **Egzekwuje** — `apply-market-benchmarks.ts:3-4`, `:20-24`, `:52` |
| Brak benchmarków = refinement no-op | cost-cal research | **Egzekwuje** — `apply-market-benchmarks.ts:32-38` |
| FR-009: użycie danych z „internet browsing” | `prd.md:94-95` | **Ignoruje** w runtime — refinement czyta **cache** `MarketBenchmark` z DB (`persist-plan-version.ts:41`), nie live crawl |

### A5 — **PlanStageNote** (osobny mały agregat scoped to Plan)

| Niezmiennik | Źródło | Status w kodzie |
|---|---|---|
| Unikalność `(planId, stageSlug)` | `timeline-notes/plan.md:27` | **Egzekwuje** — `schema.prisma:207` |
| Pusty body i brak pin → usunięcie notatki | `timeline-notes/plan.md:29` | **Egzekwuje** — `upsert-plan-stage-note.ts:32-36` |

---

## KROK 4 — Rozjazdy MODEL vs KOD

| # | Dokument / model mówi | Kod robi | Dowód |
|---|---|---|---|
| 1 | FR-009: system używa **danych z internet browsing** do refinement | Runtime ładuje **zcache’owane** `MarketBenchmark` z Postgres; import benchmarków to osobny skrypt (`benchmarks:import` w schema comment) | `prd.md:94-95`; `schema.prisma:85-86`; `persist-plan-version.ts:41-42` |
| 2 | lessons: UI/RSC woła **tylko HTTP API** dla danych domenowych | RSC `layout`, `dashboard`, `questionnaire` wołają **Prisma bezpośrednio** dla metadanych planu | `lessons.md:5-9`; `layout.tsx:17-21`; `dashboard/page.tsx:39-43`; `questionnaire/page.tsx:28-37` |
| 3 | PRD Open Q #3: **liczbowy limit** przeliczeń do ustalenia | Domyślnie **3 przeliczenia / 24h** z env override | `prd.md:134`; `plan-recalc.ts:10-11`, `:20-28` |
| 4 | PRD Business Logic: **kluczowa data (start lub termin docelowy)** | Schema wymaga **`key_date`** jako pojedyncze pole wymagane | `prd.md:113`; `questionnaire.ts:95`; Open Q #4 `prd.md:135` nierozstrzygnięte |
| 5 | DTO wyniku planu jako kontrakt hubowy | Składanie DTO **inline w route**; brak modułu domenowego/assemblera; fetch **cast** bez Zod | `plan-results.ts:16-25`; `results/route.ts:64-88`; `fetch-plan-results.ts:38-39`; refactor-opportunities C1 |
| 6 | Notatki osierocone (slug zniknął po recalculate) **zostają w DB**, niewidoczne | Schema pozwala na wiersze dla dowolnego slug; GET zwraca notatki tylko dla slugów bieżącej wersji | `timeline-notes/plan.md:23`; `load-plan-stage-notes.ts` (filtrowanie po `slugs` — do weryfikacji w route `:77`) |
| 7 | Non-goal: **brak wiążących ofert** | Egzekwowane copy/UI, nie type system | `prd.md:126-127`; `orientational.ts:16-17`; silnik operuje na `number` bez semantyki „orientacyjny” |
| 8 | `QuestionnaireInputs` type vs pełna walidacja API | Typ `QuestionnaireInputs` = infer **`questionnaireFormSchema`**, nie schema z `.refine()` | `questionnaire.ts:143-163` vs `:174` |
| 9 | Jeden spójny typ `InvestmentState` | Trzy powierzchnie: Prisma enum, Zod infer, `@prisma/client` w `investment-state.ts` | `schema.prisma:22-28`; `questionnaire.ts:17`; `investment-state.ts:1` |
| 10 | FR-010 / Secondary: przypomnienia związane z timeline | Zaimplementowany **eksport** zdarzeń, nie przypomnienia push/email | `prd.md:47`; `timeline-notes/plan.md:37` („Bez przypomnień”); `export-stages-to-calendar.ts` |

---

## KROK 5 — Ranking refaktoru (perspektywa domenowa)

Ocena: **wartość rdzeniowa** (ile chroni core invariant) × **ryzyko** (jak słabo egzekwowane / rozproszone).

| Rank | Kandydat (agregat / obszar) | Wartość rdzeniowa | Ryzyko dziś | Uzasadnienie |
|---:|---|---|---|---|
| **#1** | **PlanVersion + pipeline generacji** (A2) | Najwyższa — cały sens produktu (FR-006/008) | Wysokie — logika rozbita: pure engine + persist + route read assembler; freeze-on-write i orientacyjność nie w jednym module domenowym | Jedyny most write: `persist-plan-version.ts`; read nie woła silnika — dobra decyzja, ale **brak jawnego „GenerationResult”** jako konceptu domenowego |
| **#2** | **Plan** (A1) — granica lifecycle + ownership | Wysoka — izolacja danych użytkownika | Średnie — ownership egzekwowane w API; **1 plan/user** tylko przy POST, nie w schema | Brak aggregate root w kodzie; notatki dobrze odseparowane |
| **#3** | **ConstructionStage katalog** (A3) | Wysoka (S-01 north star) | Wysokie — triple maintenance seed/fixtures (`research C4`) | Wiedza domenowa w seed poza grafem modułów |
| **#4** | **MarketBenchmark / FR-009** (A4) | Średnia — wspiera wiarygodność | Średnie — clamp OK; semantyka PRD vs cache | Rozjazd #1 w tabeli MODEL vs KOD |
| **#5** | **PlanStageNote** (A5) | Niska–średnia (nice-to-have FR-007) | Niskie — dobrze zamknięte w `upsert-plan-stage-note.ts` | Najmniej pilny refactor |

### #1 do refaktoru: **PlanVersion (wynik generacji planu budowy)**

**Dlaczego:** Rdzeń produktu to „ankieta → orientacyjny kosztorys + harmonogram” (`prd.md:43-44`, `roadmap.md:22`). Niezmienniki A2 (nowa wersja przy przeliczeniu, zamrożone `PlanStageResult`, pipeline filter→schedule→compute) są **rozproszone** między `plan-generation/`, `persist-plan-version.ts`, `results/route.ts` i DTO — nie ma jednego miejsca, które **nazywa** i **chroni** „WynikGeneracjiPlanu” jako koncept biznesowy. To tłumaczy ranking refactor-opportunities (C1 assembler DTO) jako **pierwszy krok techniczny**, ale **cel domenowy** szerszy: wyodrębnienie **Application Service / Domain Service** „GeneratePlanVersion” z jawnym kontraktem wejścia (`QuestionnaireInputs` + katalog etapów) i wyjścia (lista wyników etapów + metadata refinement), bez zmiany freeze-on-write.

**Pierwszy krok-prerekwizyt (zgodny z planem refactor-opportunities):** extract `assemblePlanResultsDto` + testy kontraktu — czytelniejsza **read side** agregatu A2; równolegle dokumentacja ubiquitous language dla „Wersja planu” vs „Wynik etapu”.

**Czego NIE refaktorować w tej samej iteracji:** Questionnaire form/API split (lessons — load-bearing); merge koszt/timeline (frame S-11); live internet crawl dla FR-009.

---

## Powiązane artefakty

- `context/changes/refactor-opportunities/plan.md` — plan implementacji C1–C4
- `context/changes/cost-calibration/research.md` — przepływ danych write/read
- `context/map/repo-map.md` — indeks plików krytycznych
