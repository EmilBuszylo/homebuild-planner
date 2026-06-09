---
project: home-build-planner
version: 3
status: draft
created: 2026-06-08
updated: 2026-06-09
prd_version: 1
main_goal: quality
top_blocker: decisions
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
| S-01 | cost-calibration | Widzieć kosztorys oparty na zweryfikowanych stawkach rynkowych, w tym poprawione wyliczenie stanu deweloperskiego | F-01 | FR-005, FR-006, FR-008, FR-009, US-01 | proposed |
| S-02 | questionnaire-roof-type | Wybrać typ dachu w ankiecie (np. dwuspadowy, kopertowy) i otrzymać kosztorys uwzględniający różnice kosztowe wynikające z typu dachu | S-01 | FR-003, FR-004, FR-008 | proposed |
| S-03 | timeline-notes | Dodać notatkę lub oznaczyć etap harmonogramu jako ważny, i wrócić do niej przy kolejnej wizycie | F-01 | FR-007 | proposed |
| S-04 | calendar-export | Wyeksportować wybrane lub wszystkie etapy harmonogramu jako zdarzenia do zewnętrznego kalendarza | F-01 | FR-010 | blocked |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Jakość kalkulacji | `F-01` → `S-01` → `S-02` | Rdzeń v3: najpierw kalibracja stawek (north star), potem rozszerzenie ankiety o typ dachu współdzielący model kosztowy |
| B | Notatki na etapach | `S-03` | Wymaga F-01 (Stream A); niezależny od S-01/S-02 — może być realizowany równolegle z Stream A |
| C | Eksport do kalendarza | `S-04` | Wymaga F-01 (Stream A); zablokowany decyzją o protokole (iCal vs Google Calendar API) |

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
- **Unlocks:** S-01, S-02, S-03, S-04 — automatyczna weryfikacja regresji zanim nowe slices zmienią silnik kalkulacji lub dodają nowe tabele
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
- **Risk:** Zmiana stawek rynkowych może wpłynąć na istniejące plany użytkowników — `/10x-plan` powinien rozważyć strategię migracji (recalculate on next open vs. versioned benchmarks). Sekwencjonowane przed S-02 — typ dachu musi korzystać z poprawionego modelu bazowego.
- **Status:** proposed

### S-02: Rozszerzenie ankiety o typ dachu

- **Outcome:** Użytkownik może wybrać typ dachu w ankiecie (np. dwuspadowy, kopertowy, czterospadowy, mansardowy, płaski) i otrzymuje kosztorys uwzględniający różnice kosztowe wynikające z wybranego typu — konstrukcja dachu, krycie, obróbki.
- **Change ID:** questionnaire-roof-type
- **PRD refs:** FR-003, FR-004, FR-008
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-04
- **Blockers:** —
- **Unknowns:**
  - Które typy dachów są najpopularniejsze w polskim budownictwie jednorodzinnym i jakie są między nimi różnice kosztowe (%, PLN/m² połaci)? Owner: agent (`/10x-research`). Block: no.
  - Czy typ dachu powinien być pytaniem wymaganym czy opcjonalnym (FR-004)? Owner: user. Block: no (można zacząć od wymaganego; `/10x-plan` zaproponuje).
  - Czy nowe pytanie wpływa na DAG kolejności etapów (`predecessorSlugs`) — np. etap dachu zależy od typu? Owner: agent. Block: no.
- **Risk:** Sekwencjonowane po S-01 — dodawanie kosztów dachu przed kalibracją bazowych stawek wymagałoby podwójnej pracy przy walidacji. Nowe pole w modelu ankiety (`RoofType` enum) wymaga migracji schematu — owner musi uruchomić `pnpm db:migrate`.
- **Status:** proposed

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
- **Status:** proposed

### S-04: Eksport etapów do zewnętrznego kalendarza

- **Outcome:** Użytkownik może wyeksportować wybrane lub wszystkie etapy harmonogramu jako zdarzenia do zewnętrznego kalendarza.
- **Change ID:** calendar-export
- **PRD refs:** FR-010
- **Prerequisites:** F-01
- **Parallel with:** S-01, S-02, S-03
- **Blockers:** —
- **Unknowns:**
  - iCal/ICS (plik `.ics` bez OAuth, działa z Google/Apple/Outlook po pobraniu) vs Google Calendar API (OAuth, osobny projekt Google Cloud, consent screen)? Owner: user. Block: yes — ta decyzja determinuje całą implementację, zewnętrzne zależności i zakres pracy.
  - Jeśli Google Calendar API: wymaga Google Cloud project, OAuth 2.0 scope `calendar.events` — Owner: user (konfiguracja zewnętrzna). Block: yes — do czasu konfiguracji projektu zewnętrznego.
- **Risk:** Jeśli iCal — bardzo szybkie do zrealizowania (bezstanowy eksport pliku, zero OAuth). Jeśli Google Calendar API — duże ryzyko opóźnienia z powodu zewnętrznych zależności i procesu weryfikacji OAuth. PRD §shape-notes potwierdza: "google calendar integrations marked nice-to-have" właśnie ze względu na tę zewnętrzną zależność. Sekwencjonowane na końcu; należy rozwiązać Unknown 1 zanim otworzy się `/10x-plan calendar-export`.
- **Status:** blocked

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | e2e-ci-gate | Dodaj E2E do CI (GitHub Actions) | yes | Uruchom `/10x-plan e2e-ci-gate`; specs istnieją, tylko `ci.yml` do wdrożenia |
| S-01 | cost-calibration | Kalibracja stawek rynkowych kosztorysu | yes (po F-01) | Zacznij od `/10x-research cost-calibration` — research cenowy jest krokiem 1 |
| S-02 | questionnaire-roof-type | Rozszerzenie ankiety: typ dachu | no | Po S-01; czeka na skalibrowany model bazowy |
| S-03 | timeline-notes | Notatki do etapów harmonogramu (FR-007) | yes (po F-01) | Można równolegle z S-01; nowa tabela DB → owner uruchamia migrację |
| S-04 | calendar-export | Eksport etapów do kalendarza (FR-010) | no | Zablokowane decyzją iCal vs Google Calendar API; rozwiąż Open Roadmap Q-1 |

## Open Roadmap Questions

1. **iCal (.ics pobierany przez użytkownika) vs Google Calendar API (OAuth) dla FR-010?** Owner: user. Block: S-04 — bez tej decyzji `/10x-plan calendar-export` nie może ruszyć.
2. **Jaka nazwa projektu ma być wpisana jako `project` w PRD frontmatter?** Owner: user. Block: metadane dokumentu (z PRD §Open Questions).
3. **Jaki jest liczbowy limit pełnych przeliczeń planu na użytkownika?** Owner: user. Block: yes — nie zmienione od PRD (z PRD §Open Questions); wpływa na NFR kosztowy.
4. **Która data jest obligatoryjna w ankiecie?** Owner: user. Block: no (z PRD §Open Questions).

## Parked

- **FR-011: Logowanie przez Google** — Why parked: zewnętrzna zależność (OAuth Google), poza zakresem v3; PRD §shape-notes: "google auth moved to nice-to-have".
- **Notatki z przypomnieniami / powiadomieniami** — Why parked: FR-007 w S-03 zakrywa MVP notatek (tekst przypiany); datowane przypomnienia to osobna funkcja wymagająca job schedulera lub zewnętrznej usługi push.
- **Regionalizacja kosztów** — Why parked: PRD §Vision wzmiankuje "100x scale"; kalibracja v3 zakrywa ogólnopolskie widełki; regionalizacja (województwo, miasto) to następna faza po zebraniu pierwszych danych od użytkowników.
- **Pełny coverage testów (component tests, visual regression)** — Why parked: F-01 zamyka lukę E2E w CI; komponenty i visual regression to zakres po v3.
- **Zaawansowana współpraca (shared workspace)** — Why parked: PRD §Non-Goals wprost.
- **Marketplace wykonawców / CRM** — Why parked: PRD §Non-Goals wprost.

## Done

- **F-01: (foundation) Playwright E2E specs (risk-01 IDOR, risk-02 auth, risk-04 generate golden path) uruchamiają się automatycznie w GitHub Actions CI na każdym pull requeście; regresje w auth i ścieżce generowania są wykrywane przed merge.** — Archived 2026-06-09 → `context/archive/2026-06-08-e2e-ci-gate/`. Lesson: —.
