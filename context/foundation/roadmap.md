---
project: home-build-planner
version: 3
status: draft
created: 2026-06-08
updated: 2026-06-11
prd_version: 1
main_goal: quality
top_blocker: external-setup
phase: v3-accuracy-and-features
---

# Roadmap: home-build-planner (v3 — dokładność i uzupełnienie funkcji)

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Poprzednia roadmapa (v2 post-MVP polish): `context/foundation/archive/2026-06-08-roadmap.md`.
> Slices poniżej są w kolejności zależności. Tabela "At a glance" to indeks.

## Vision recap

Osoba prywatna planująca budowę pierwszego domu w trybie gospodarczym potrzebuje jasnej mapy etapów, orientacyjnych kosztów i kolejności działań — połączenie wyceny z harmonogramem zależności ogranicza koszt błędów. Rdzeń produktu (ankieta → kosztorys + harmonogram → edycja i przeliczenie) jest zaimplementowany i działa. Faza v3 nie dodaje nowych typów funkcji od zera — skupia się na **wiarygodności kalkulacji** i **uzupełnieniu zaplanowanych nice-to-have** (notatki do etapów, eksport kalendarza), bo dokładne liczby i spójne narzędzie to warunek konieczny realnej wartości dla użytkownika.

## North star

**S-01: Kalibracja kosztów rynkowych** — gwiazda przewodnia tej iteracji (= slice, którego realizacja udowadnia, że produkt spełnia swoją obietnicę — umieszczony jak najwcześniej, bo wszystko inne ma sens tylko wtedy, gdy liczby są prawidłowe).

Jeśli stawki kosztorysowe są błędne — w szczególności stan deweloperski, który według oceny właściciela jest wyliczany nieprawidłowo — produkt nie spełnia swojej obietnicy orientacyjnej wyceny. Skalibrowanie stawek na podstawie researchu rynkowego (FR-008 + FR-009) to warunek wiarygodności całego narzędzia.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | e2e-ci-gate | (foundation) Playwright E2E specs uruchamiają się w GitHub Actions CI na każdym PR | — | FR-001, FR-002, Success Criteria (Guardrails) | done |
| S-01 | cost-calibration | Widzieć kosztorys oparty na zweryfikowanych stawkach rynkowych, w tym poprawione wyliczenie stanu deweloperskiego | F-01 | FR-005, FR-006, FR-008, FR-009, US-01 | done |
| S-05 | utility-connections | Wskazać sposób odprowadzenia ścieków (i opcjonalnie wodę) i zobaczyć osobną pozycję kosztorysu za przyłącza zewnętrzne, oddzieloną od wewnętrznej instalacji wod-kan | S-01 | FR-003, FR-004, FR-008 | done |
| S-02 | questionnaire-roof-type | Wybrać typ dachu w ankiecie (np. dwuspadowy, kopertowy) i otrzymać kosztorys uwzględniający różnice kosztowe wynikające z typu dachu | S-05 | FR-003, FR-004, FR-008 | done |
| S-03 | timeline-notes | Dodać notatkę lub oznaczyć etap harmonogramu jako ważny, i wrócić do niej przy kolejnej wizycie | F-01 | FR-007 | done |
| S-04 | calendar-export | Wyeksportować wybrane lub wszystkie etapy harmonogramu jako zdarzenia do Google Calendar | F-01 | FR-010 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Jakość kalkulacji | `F-01` → `S-01` → `S-05` → `S-02` | Kalibracja wewnętrznych stawek, potem przyłącza mediów (czytelność wod-kan), potem typ dachu |
| B | Notatki na etapach | `S-03` | Wymaga F-01 (Stream A); niezależny od S-01/S-02 — może być realizowany równolegle z Stream A |
| C | Eksport do kalendarza | `S-04` | Wymaga F-01 (Stream A); protokół: **Google Calendar API** (OAuth); owner: projekt Google Cloud przed `/10x-implement` |

## Baseline

Stan codebase na **2026-06-08** (auto-researched + potwierdzony przez właściciela). Foundations poniżej zakładają, że poniższe warstwy są gotowe i ich NIE reskafoldują.

- **Frontend:** present — Next.js 16, React 19, Tailwind 4, shadcn/ui (`src/app/`, `src/components/ui/`)
- **Backend / API:** present — Next.js Route Handlers: plans, results, recalculate, health/db (`src/app/api/`)
- **Data:** present — Prisma ORM, PostgreSQL/Supabase, migracje w repo (`prisma/schema.prisma`, `prisma/migrations/`)
- **Auth:** present — Supabase Auth via Server Actions, middleware (`src/app/(auth)/actions.ts`, `src/middleware.ts`)
- **Deploy / infra:** present — GitHub Actions CI + Vercel deploy (`.github/workflows/ci.yml`, `deploy.yml`)
- **Observability:** present — Sentry `@sentry/nextjs` 10.56.0, `GET /api/health/db`
- **E2E (partial):** Playwright specs: risk-01 (IDOR), risk-02 (auth), risk-04 (generate golden path) istnieją lokalnie (`e2e/`); `pnpm test:e2e` działa. CI nie uruchamia E2E — F-01 to zamyka.

**Pokryte przez zarchiwizowane slices (roadmapa v1/v2):** FR-001 (rejestracja), FR-002 (logowanie), FR-004 (pominięcie opcjonalnych pytań), FR-005 (edycja i przeliczenie), FR-006 (widok kosztorysu + timeline).

## Foundations

### F-01: E2E CI gate

- **Outcome:** (foundation) Playwright E2E specs (risk-01 IDOR, risk-02 auth, risk-04 generate golden path) uruchamiają się automatycznie w GitHub Actions CI na każdym pull requeście; regresje w auth i ścieżce generowania są wykrywane przed merge.
- **Change ID:** e2e-ci-gate
- **PRD refs:** FR-001, FR-002, Success Criteria (Guardrails: "wynik generuje się w rozsadnym czasie i nie blokuje uzytkownika")
- **Unlocks:** S-01, S-05, S-02, S-03, S-04 — automatyczna weryfikacja regresji zanim nowe slices zmienią silnik kalkulacji lub dodają nowe tabele
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sekwencjonowane jako pierwsze — dodawanie zmian w silniku kalkulacyjnym (S-01) bez automatycznych testów CI zwiększa ryzyko cichej regresji w istniejącej ścieżce golden path. Specs już istnieją; praca to wyłącznie wdrożenie job-a w `ci.yml`.
- **Status:** done

## Slices

### S-01: Kalibracja kosztów rynkowych

- **Outcome:** Użytkownik widzi kosztorys oparty na zweryfikowanych, skalibrowanych stawkach rynkowych — w szczególności poprawione wyliczenie stanu deweloperskiego i pozostałych etapów budowy, bazujące na aktualnych widełkach cenowych z polskiego rynku (robocizna + materiały).
- **Change ID:** cost-calibration
- **PRD refs:** FR-005, FR-006, FR-008, FR-009, US-01
- **Prerequisites:** F-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:**
  - Jakie są aktualne widełki rynkowe dla stanu deweloperskiego w Polsce (robocizna + materiały, PLN/m²)? Owner: agent (`/10x-research`). Block: no — research do wykonania jako pierwszy krok `/10x-plan cost-calibration`.
  - Które etapy budowy mają największe odchylenia od obecnych stawek w codebase? Owner: agent (analiza `src/lib/plan-generation/`). Block: no.
  - Czy kalibracja zmienia strukturę danych modelu (`MarketBenchmark`) czy tylko wartości seed? Owner: agent (research schema). Block: no.
- **Risk:** Zmiana stawek rynkowych może wpłynąć na istniejące plany użytkowników — `/10x-plan` powinien rozważyć strategię migracji (recalculate on next open vs. versioned benchmarks). Sekwencjonowane przed S-05 i S-02 — przyłącza i typ dachu muszą korzystać z poprawionego modelu bazowego. Epilog: `plumbing` −10% (tylko instalacja wewnętrzna) — przyłącza w S-05.
- **Status:** done

### S-05: Przyłącza mediów (kanalizacja i woda)

- **Outcome:** Użytkownik wskazuje sposób odprowadzenia ścieków (kanalizacja gminna, szambo, oczyszczalnia) i opcjonalnie źródło wody (wodociąg, studnia); kosztorys pokazuje **osobną pozycję** za przyłącza zewnętrzne — oddzieloną od wewnętrznej instalacji wod-kan (`plumbing`, obniżonej o ~10% w S-01).
- **Change ID:** utility-connections
- **PRD refs:** FR-003, FR-004, FR-008
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** —
- **Unknowns:**
  - Widełki PL 2026: przyłącze sanitarne (municipal), szambo, oczyszczalnia, studnia vs wodociąg? Owner: agent (`/10x-research`). Block: no.
  - Czy w pierwszym slice wchodzi `water_supply` i `utility_distance_band`, czy tylko `sewage_disposal`? Owner: user. Block: no dla planu; yes dla pełnego zakresu implementacji.
  - Odpowietrzenie kanalizacji i kominki wentylacyjne na dachu — osobny pod-slice S-05b czy modyfikator w S-05? Owner: agent. Block: no.
- **Risk:** Nowe pytania ankiety + nowe slugi etapów (`sewage_connection`, `water_connection`) → migracja Prisma; owner uruchamia `pnpm db:migrate`. Opłaty administracyjne gminy świadomie poza zakresem (Parked).
- **Status:** done

### S-02: Rozszerzenie ankiety o typ dachu

- **Outcome:** Użytkownik może wybrać typ dachu w ankiecie (np. dwuspadowy, kopertowy, czterospadowy, mansardowy, płaski) i otrzymuje kosztorys uwzględniający różnice kosztowe wynikające z wybranego typu — konstrukcja dachu, krycie, obróbki.
- **Change ID:** questionnaire-roof-type
- **PRD refs:** FR-003, FR-004, FR-008
- **Prerequisites:** S-05
- **Parallel with:** S-03, S-04
- **Blockers:** —
- **Unknowns:**
  - Które typy dachów są najpopularniejsze w polskim budownictwie jednorodzinnym i jakie są między nimi różnice kosztowe (%, PLN/m² połaci)? Owner: agent (`/10x-research`). Block: no.
  - Czy typ dachu powinien być pytaniem wymaganym czy opcjonalnym (FR-004)? Owner: user. Block: no (można zacząć od wymaganego; `/10x-plan` zaproponuje).
  - Czy nowe pytanie wpływa na DAG kolejności etapów (`predecessorSlugs`) — np. etap dachu zależy od typu? Owner: agent. Block: no.
- **Risk:** Sekwencjonowane po S-05 — typ dachu i przyłącza współdzielą model kosztowy; kalibracja bazowa (S-01) musi być gotowa wcześniej. MVP: seed-only Path A (bez migracji Prisma `RoofType` enum).
- **Status:** done

### S-03: Notatki i zdarzenia przypiete do etapów harmonogramu

- **Outcome:** Użytkownik może dodać notatkę lub oznaczyć etap harmonogramu jako ważny, a treść notatki jest dostępna przy kolejnych wizytach na stronie planu — pomaga koordynować kontakt z wykonawcami.
- **Change ID:** timeline-notes
- **PRD refs:** FR-007
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02, S-04
- **Blockers:** —
- **Unknowns:**
  - Jaki model persystencji notatki — per etap per plan (najprostszy, każdy plan ma własne notatki) czy per etap globalnie dla użytkownika? Owner: user. Block: no (rekomendacja: per plan, zgodna z istniejącą architekturą Prisma `Plan`).
  - Czy notatka ma datę przypomnienia (powiadomienie) czy jest wyłącznie tekstem? Owner: user. Block: no (MVP: tylko tekst; reminder → Parked).
- **Risk:** Wymaga nowej tabeli `StageNote` w schemacie Prisma — owner musi uruchomić `pnpm db:migrate`. Niezależny od kalkulacji — może być realizowany równolegle z S-01 przez osobny agent run.
- **Status:** done

### S-04: Eksport etapów do Google Calendar

- **Outcome:** Użytkownik może wyeksportować wybrane lub wszystkie etapy harmonogramu jako zdarzenia bezpośrednio do swojego Google Calendar (po jednorazowej autoryzacji OAuth).
- **Change ID:** calendar-export
- **PRD refs:** FR-010
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Decisions (locked 2026-06-11):**
  - **Protokół:** Google Calendar API (OAuth 2.0), scope `calendar.events` — nie iCal w tym slice.
  - **Zakres MVP:** wybrane lub wszystkie etapy z bieżącego harmonogramu planu; jeden kalendarz docelowy (primary lub wybór użytkownika — do ustalenia w `/10x-plan`).
- **Unknowns:**
  - ~~iCal vs Google Calendar API~~ — **rozstrzygnięte:** Google Calendar API (owner, 2026-06-11).
  - Konfiguracja Google Cloud (projekt, OAuth client ID/secret, consent screen, redirect URI dla localhost + Vercel) — Owner: user. Block: no dla `/10x-plan`; **yes** dla `/10x-implement` bez skonfigurowanych env (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect).
  - Czy użytkownik wybiera kalendarz docelowy z listy, czy zawsze `primary`? Owner: user / plan. Block: no.
- **Risk:** OAuth i consent screen mogą opóźnić wdrożenie vs iCal; PRD §shape-notes traktuje integrację Google jako nice-to-have z zewnętrzną zależnością — akceptowane świadomie. Sekwencjonowane jako ostatni slice v3.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | e2e-ci-gate | Dodaj E2E do CI (GitHub Actions) | yes | Uruchom `/10x-plan e2e-ci-gate`; specs istnieją, tylko `ci.yml` do wdrożenia |
| S-01 | cost-calibration | Kalibracja stawek rynkowych kosztorysu | yes (po F-01) | Zacznij od `/10x-research cost-calibration` — research cenowy jest krokiem 1 |
| S-05 | utility-connections | Przyłącza mediów (kanalizacja / woda) | no | Po S-01; `/10x-research utility-connections` przed planem |
| S-02 | questionnaire-roof-type | Rozszerzenie ankiety: typ dachu | yes | Zarchiwizowano 2026-06-08 |
| S-03 | timeline-notes | Notatki do etapów harmonogramu (FR-007) | no | Zaimplementowano 2026-06-08 |
| S-04 | calendar-export | Eksport etapów do Google Calendar (FR-010) | yes | Decyzja: Google Calendar API; owner: Google Cloud OAuth przed implementacją; `/10x-plan calendar-export` |

## Open Roadmap Questions

1. ~~**iCal vs Google Calendar API dla FR-010?**~~ **Rozstrzygnięte 2026-06-11:** Google Calendar API (OAuth). iCal pozostaje w Parked jako ewentualny fallback bez OAuth.
2. **Jaka nazwa projektu ma być wpisana jako `project` w PRD frontmatter?** Owner: user. Block: metadane dokumentu (z PRD §Open Questions).
3. **Jaki jest liczbowy limit pełnych przeliczeń planu na użytkownika?** Owner: user. Block: yes — nie zmienione od PRD (z PRD §Open Questions); wpływa na NFR kosztowy.
4. **Która data jest obligatoryjna w ankiecie?** Owner: user. Block: no (z PRD §Open Questions).
5. **S-05: Czy `water_supply` i `utility_distance_band` wchodzą w pierwszy slice, czy tylko `sewage_disposal`?** Owner: user. Block: no dla planu S-05; yes dla pełnego zakresu implementacji.

## Parked

- **Eksport iCal (.ics) bez OAuth** — Why parked: S-04 realizuje FR-010 przez Google Calendar API; pobierany plik `.ics` może być dodany później jako fallback dla użytkowników bez konta Google.
- **FR-011: Logowanie przez Google** — Why parked: zewnętrzna zależność (OAuth Google), poza zakresem v3; PRD §shape-notes: "google auth moved to nice-to-have".
- **Notatki z przypomnieniami / powiadomieniami** — Why parked: FR-007 w S-03 zakrywa MVP notatek (tekst przypiany); datowane przypomnienia to osobna funkcja wymagająca job schedulera lub zewnętrznej usługi push.
- **Regionalizacja kosztów** — Why parked: PRD §Vision wzmiankuje "100x scale"; kalibracja v3 zakrywa ogólnopolskie widełki; regionalizacja (województwo, miasto) to następna faza po zebraniu pierwszych danych od użytkowników.
- **Opłaty administracyjne przyłączy (gmina, Wodociągi)** — Why parked: wysoka zmienność lokalna; S-05 pokrywa roboty + materiał orientacyjnie, bez opłat urzędowych.
- **Odpowietrzenie kanalizacji — rozbicie na piony/kominki (S-05b)** — Why parked: podfaza po S-05; wymaga pytania o liczbę łazienek lub osobnego modyfikatora dachowego (`roof_covering`).
- **Pełny coverage testów (component tests, visual regression)** — Why parked: F-01 zamyka lukę E2E w CI; komponenty i visual regression to zakres po v3.
- **Zaawansowana współpraca (shared workspace)** — Why parked: PRD §Non-Goals wprost.
- **Marketplace wykonawców / CRM** — Why parked: PRD §Non-Goals wprost.

## Done

- **F-01: (foundation) Playwright E2E specs (risk-01 IDOR, risk-02 auth, risk-04 generate golden path) uruchamiają się automatycznie w GitHub Actions CI na każdym pull requeście; regresje w auth i ścieżce generowania są wykrywane przed merge.** — Archived 2026-06-09 → `context/archive/2026-06-08-e2e-ci-gate/`. Lesson: —.
- **S-01: Użytkownik widzi kosztorys oparty na zweryfikowanych, skalibrowanych stawkach rynkowych — w szczególności poprawione wyliczenie stanu deweloperskiego i pozostałych etapów budowy, bazujące na aktualnych widełkach cenowych z polskiego rynku (robocizna + materiały).** — Archived 2026-06-10 → `context/archive/2026-06-09-cost-calibration/`. Lesson: —.
- **S-05: Użytkownik wskazuje sposób odprowadzenia ścieków (kanalizacja gminna, szambo, oczyszczalnia) i opcjonalnie źródło wody (wodociąg, studnia); kosztorys pokazuje osobną pozycję za przyłącza zewnętrzne — oddzieloną od wewnętrznej instalacji wod-kan (plumbing, obniżonej o ~10% w S-01).** — Archived 2026-06-08 → `context/archive/2026-06-10-utility-connections/`. Lesson: —.
- **S-02: Użytkownik może wybrać typ dachu w ankiecie (np. dwuspadowy, kopertowy, czterospadowy, mansardowy, płaski) i otrzymuje kosztorys uwzględniający różnice kosztowe wynikające z wybranego typu — konstrukcja dachu, krycie, obróbki.** — Archived 2026-06-08 → `context/archive/2026-06-10-questionnaire-roof-type/`. Lesson: —.
- **S-03: Użytkownik może dodać notatkę lub oznaczyć etap harmonogramu jako ważny, a treść notatki jest dostępna przy kolejnych wizytach na stronie planu — pomaga koordynować kontakt z wykonawcami.** — Archived 2026-06-11 → `context/archive/2026-06-11-timeline-notes/`. Lesson: —.
