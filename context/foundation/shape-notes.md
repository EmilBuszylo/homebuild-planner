---
project: "home-build-planner — INV-GEN-01"
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
created: 2026-06-12
updated: 2026-06-12
timeline_budget:
  delivery_weeks: 2
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: change category
      decision: architectural improvement — domain aggregate PlanVersionSnapshot enforces INV-GEN-01
    - topic: primary persona pain
      decision: individual home builder after questionnaire submit
    - topic: why not obvious earlier
      decision: no named domain error; read-path guard too late (GET 404 after successful-looking write)
    - topic: must preserve
      decision: auth, plan ownership, recalculation rate limit — unchanged
  frs_drafted: 7
  quality_check_status: accepted
seed: context/domain/02-invariant-aggregate-refactor.md
---

## Current System

**home-build-planner** — web app MVP dla indywidualnych inwestorów budujących dom. Użytkownik zakłada konto (email + hasło), wypełnia ankietę o parametrach budowy, a system generuje orientacyjny kosztorys etapów i timeline.

**Architektura (skrót):** Next.js App Router, Supabase Auth, dane domenowe przez Prisma/Postgres. Silnik generacji (`plan-generation`: filtr etapów → harmonogram → koszty) + refinement benchmarków. Orkiestracja zapisu w `persist-plan-version.ts` (transakcja: wersja planu + odpowiedzi + wyniki). API write: `POST /api/plans`, `POST .../recalculate`. API read: `GET .../results`. UI: formularz ankiety → redirect na stronę planu.

**Użytkownicy:** indywidualny inwestor/budujący — jeden plan na konto w MVP.

## Vision & Problem Statement

**Delta:** Egzekwować niezmiennik **INV-GEN-01** — udane zakończenie generacji planu musi produkować co najmniej jeden etap nadający się do wyświetlenia kosztorysu i timeline; w przeciwnym razie operacja nie jest sukcesem produktowym.

**Ból:** Po zatwierdzeniu ankiety API write zwraca **201/200** nawet gdy `PlanStageResult` jest pusty. Użytkownik jest przekierowany na `/moj-plan/:id`, a dopiero odczyt wyników (GET) zwraca 404 — widzi stronę błędu mimo wcześniejszego „sukcesu” submitu.

**Dlaczego teraz:** Refaktor domenowy z dokumentu `02-invariant-aggregate-refactor.md` — agregat `PlanVersionSnapshot` jako jedyne legalne miejsce generacji + fail-fast (`EmptyGenerationResultError` → HTTP 422), zamiast połykania pustego wyniku i persystencji pustej wersji.

**Must preserve (explicit):** model auth (email+hasło), własność planu (`plan.userId`), limit przeliczeń w oknie czasowym — bez zmian w tej pracy.

## User & Persona

**Primary persona:** Indywidualny inwestor/budujący dom — wypełnia ankietę w domu, oczekuje kosztorysu i timeline zaraz po zatwierdzeniu. Moment bólu: submit ankiety kończy się redirectem, a na stronie planu zamiast wyników widzi komunikat błędu.

## Access Control

**Obecny model:** Rejestracja i logowanie email + hasło (Supabase Auth). Płaski model użytkownika — brak ról admin/member. Jeden plan na użytkownika w MVP. Tylko właściciel planu (`plan.userId`) może odczytywać wyniki, przeliczać plan i zapisywać notatki etapów.

**Zmiana w tej pracy:** Brak — model auth i granice własności planu pozostają bez zmian. `No changes planned — current model preserved.`

## Success Criteria

### Primary

Fazy 0–2 refaktoru INV-GEN-01 (backend):

1. Użytkownik wypełnia ankietę (bez zmian w flow wejścia).
2. Submit z wejściem produkującym zero etapów po filtrze → serwer **nie** commituje pustej `PlanVersion`.
3. API write (`POST /api/plans`, recalculate) zwraca **422** z kodem błędu domenowego zamiast 201/200.
4. Poprawna ankieta (golden path) → nadal **201** + ≥1 `PlanStageResult` w transakcji.
5. Testy Vitest T1–T8 (unit agregatu + handler) przechodzą; testy kodyfikujące pusty wynik jako sukces są odwrócone.

### Secondary

- Faza 3 (po backendzie): `questionnaire-form.tsx` obsługuje **422** — komunikat PL na formularzu, bez redirectu na pusty plan.

### Guardrails

- Auth, własność planu i rate limit przeliczeń — **bez zmian**.
- Golden path generacji (poprawny payload → 201 + wyniki) — **bez regresji**.

## Functional Requirements

### Plan generation guard (INV-GEN-01)

- FR-001: System odrzuca generację planu, która nie produkuje żadnego etapu nadającego się do wyświetlenia kosztorysu i timeline. Priority: must-have. Change: new
  > Socrates: Counter-argument: fałszywe 422 na edge-case'ach uznawanych za poprawne. Resolution: golden path + T1/T8; 422 tylko przy `stageResults.length === 0`, bez INV-GEN-01b w MVP.
- FR-002: Agregat domenowy egzekwuje INV-GEN-01 w `PlanVersionSnapshot.generate()` przed jakimkolwiek zapisem wersji. Priority: must-have. Change: new
  > Socrates: Brak kontrargumentu — FR stoi.
- FR-003: API write (`POST /api/plans`, recalculate) zwraca HTTP 422 z komunikatem PL gdy generacja jest pusta, zamiast 201/200. Priority: must-have. Change: modified
  > Socrates: Brak kontrargumentu — FR stoi.
- FR-004: Zapis wersji planu odbywa się atomowo przez repozytorium agregatu (wersja + odpowiedzi + wyniki w jednej transakcji lub rollback). Priority: must-have. Change: modified
  > Socrates: Counter-argument: big-bang repo > 2 tygodnie. Resolution: cienki wrapper na `persist-plan-version` — agregat + repo bez pełnego przepisywania warstw.

### Preserved capabilities

- FR-005: Inwestor z poprawną ankietą nadal otrzymuje 201 i co najmniej jeden etap w wynikach (golden path). Priority: must-have. Change: preserved
  > Socrates: Brak kontrargumentu — FR stoi.
- FR-006: Auth email+hasło, własność planu i rate limit przeliczeń działają jak dotychczas. Priority: must-have. Change: preserved
  > Socrates: Brak kontrargumentu — FR stoi.

### UI (secondary scope)

- FR-007: Inwestor widzi komunikat błędu na formularzu ankiety po 422, bez redirectu na stronę pustego planu. Priority: nice-to-have. Change: new
  > Socrates: Brak kontrargumentu — nice-to-have OK.

## User Stories

### US-01: Odrzucenie pustej generacji przy submitcie ankiety

- **Given** zalogowany inwestor z wypełnioną ankietą, której kombinacja stanów start/docelowy nie produkuje żadnego etapu po filtrze
- **When** zatwierdza ankietę (POST plan)
- **Then** API zwraca 422 z komunikatem, że nie udało się wygenerować kosztorysu; w bazie **nie** powstaje wersja planu z pustymi wynikami

#### Acceptance Criteria

- Brak commit transakcji z `PlanStageResult.length === 0` dla nowych write'ów
- Kod błędu domenowego (`EMPTY_GENERATION_RESULT`) obecny w odpowiedzi 422
- Poprawny payload (golden path) nadal daje 201 i redirect — bez regresji

## Business Logic

Udane zakończenie generacji planu wymaga co najmniej jednego etapu nadającego się do wyświetlenia kosztorysu i timeline.

**Było:** System traktował zapis wersji planu jako sukces nawet gdy filtr etapów zwracał pusty wynik — użytkownik dowiadywał się o problemie dopiero przy odczycie wyników.

**Zmiana:** Generacja bez etapów do wyświetlenia nie jest sukcesem produktowym — operacja kończy się błędem domenowym (`EmptyGenerationResultError`), mapowanym na HTTP 422, bez commitu pustej wersji w transakcji.

Wejście: odpowiedzi ankiety (stany start/docelowy, parametry budowy) + katalog etapów. Wyjście: zamrożone wyniki etapów z kosztami i harmonogramem — lub odrzucenie operacji. Użytkownik napotyka regułę przy submitcie ankiety (422 na formularzu po fazie UI) zamiast po redirectzie na pusty plan.

## Non-Functional Requirements

- Pusta generacja zwraca odpowiedź 422 w czasie porównywalnym z obecnym POST — bez dodatkowego oczekiwania użytkownika względem baseline.

## Constraints & Preserved Behavior

- **Auth i własność planu:** bez zmian (email+hasło, `plan.userId`, rate limit przeliczeń).
- **Silnik `plan-generation`:** w fazie 1 pozostaje pure — agregat interpretuje pusty wynik filtra jako błąd domenowy, bez throw w `stage-filter`.
- **Dane legacy:** istniejące puste wersje w DB nie wymagają migracji; GET results nadal może zwracać 404 dla starych rekordów.
- **Zakres implementacji:** cienki wrapper na `persist-plan-version` — bez big-bang przepisywania wszystkich warstw w 2 tygodnie.
- **Breaking API:** 422 zamiast 201/200 dla pustej generacji — akceptowalne; jedyny klient w MVP to własny UI.

## Non-Goals

- **Zmiany auth** — brak OAuth, forgot password, nowych ról; model email+hasło bez zmian.
- **Migracja legacy danych** — brak czyszczenia ani backfillu istniejących pustych wersji planu w DB; GET 404 dla starych rekordów wystarczy.

## Forward: technical-roadmap

- INV-GEN-01b (odrzucenie gdy wszystkie `estimatedCost === 0`) — faza 4 opcjonalna, poza tym change.
- Anti-corruption layer / refactor C1–C4 — osobny change (`context/changes/refactor-opportunities/`).
- Podgląd N etapów przed submitem — osobny produktowy wątek (`context/team/opportunity-map.md`).
- UI 422 (FR-007) — secondary scope po backendzie; nie blokuje zamknięcia shape dla fazy 0–2.

## Quality cross-check

Wszystkie elementy jakościowe spełnione (2026-06-12): Access Control, Business Logic, timeline ≤3 tygodnie, Non-Goals, Preserved behavior — bez luk do `/10x-prd` Open Questions.

