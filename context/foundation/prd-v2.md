---
project: "home-build-planner — INV-GEN-01"
version: 2
status: draft
created: 2026-06-15
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: 2
  hard_deadline: null
  after_hours_only: true
---

## Current System Overview

**home-build-planner** — web app MVP dla indywidualnych inwestorów budujących dom. Użytkownik zakłada konto (email + hasło), wypełnia ankietę o parametrach budowy, a system generuje orientacyjny kosztorys etapów i timeline.

**Architektura (skrót):** Next.js App Router, Supabase Auth, dane domenowe przez Prisma/Postgres. Silnik generacji (`plan-generation`: filtr etapów → harmonogram → koszty) + refinement benchmarków. Orkiestracja zapisu w `persist-plan-version.ts` (transakcja: wersja planu + odpowiedzi + wyniki). API write: `POST /api/plans`, `POST .../recalculate`. API read: `GET .../results`. UI: formularz ankiety → redirect na stronę planu.

**Użytkownicy:** indywidualny inwestor/budujący — jeden plan na konto w MVP.

## Problem Statement & Motivation

**Luka:** Niezmiennik **INV-GEN-01** nie jest egzekwowany przy zapisie planu — udane zakończenie generacji musi produkować co najmniej jeden etap nadający się do wyświetlenia kosztorysu i timeline; w przeciwnym razie operacja nie jest sukcesem produktowym.

**Ból:** Po zatwierdzeniu ankiety ścieżka zapisu zwraca sukces (HTTP 201/200) nawet gdy wynik generacji jest pusty. Użytkownik jest przekierowany na stronę planu, a dopiero odczyt wyników kończy się błędem „brak wyników” — widzi stronę błędu mimo wcześniejszego „sukcesu” submitu.

**Dlaczego teraz:** Refaktor domenowy (`02-invariant-aggregate-refactor.md`) — agregat `PlanVersionSnapshot` jako jedyne legalne miejsce generacji + fail-fast (błąd domenowy pustej generacji → HTTP 422), zamiast połykania pustego wyniku i persystencji pustej wersji.

**Obecny workaround i koszt:** Strażnik na ścieżce odczytu zwraca błąd dopiero po redirectzie; użytkownik traci zaufanie do produktu („submit się udał, ale planu nie ma”).

**Must preserve (explicit):** model auth (email+hasło), własność planu, limit przeliczeń w oknie czasowym — bez zmian w tej pracy.

## User & Persona

**Primary persona:** Indywidualny inwestor/budujący dom — wypełnia ankietę w domu, oczekuje kosztorysu i timeline zaraz po zatwierdzeniu.

**Zmiana doświadczenia:** Moment bólu (dziś): submit ankiety kończy się redirectem, a na stronie planu zamiast wyników widzi komunikat błędu. Po zmianie (faza UI, secondary): błąd przy pustej generacji pojawia się na formularzu, bez tworzenia „pustego” planu do odczytu.

## Success Criteria

### Primary

Fazy 0–2 refaktoru INV-GEN-01 (backend):

1. Użytkownik wypełnia ankietę (bez zmian w flow wejścia).
2. Submit z wejściem produkującym zero etapów po filtrze → system **nie** zapisuje pustej wersji planu.
3. Ścieżka zapisu zwraca **422** z kodem błędu domenowego zamiast 201/200.
4. Poprawna ankieta (golden path) → nadal **201** + co najmniej jeden zapisany etap wyników w transakcji.
5. Testy automatyczne (unit agregatu + handlery zapisu) przechodzą; testy akceptujące pusty wynik jako sukces są odwrócone.

### Secondary

- Faza 3 (po backendzie): formularz ankiety obsługuje **422** — komunikat PL na formularzu, bez redirectu na pusty plan.

### Guardrails

- Auth, własność planu i limit przeliczeń — **bez zmian**.
- Golden path generacji (poprawny payload → sukces zapisu + wyniki) — **bez regresji**.

## User Stories

### US-01: Odrzucenie pustej generacji przy submitcie ankiety

**Było:** Submit kończył się sukcesem HTTP i redirectem; pusta generacja ujawniała się dopiero na stronie planu.

- **Given** zalogowany inwestor z wypełnioną ankietą, której kombinacja stanów start/docelowy nie produkuje żadnego etapu po filtrze
- **When** zatwierdza ankietę
- **Then** system zwraca 422 z komunikatem, że nie udało się wygenerować kosztorysu; **nie** powstaje wersja planu z pustymi wynikami

#### Acceptance Criteria

- Brak zapisu wersji planu z zerową liczbą wyników etapów dla nowych operacji zapisu
- Kod błędu domenowego pustej generacji obecny w odpowiedzi 422
- Poprawny payload (golden path) nadal daje sukces zapisu i redirect — bez regresji

## Scope of Change

### Plan generation guard (INV-GEN-01)

- [new] System odrzuca generację planu, która nie produkuje żadnego etapu nadającego się do wyświetlenia kosztorysu i timeline. Priority: must-have.
  > Socrates: Counter-argument: fałszywe 422 na edge-case'ach uznawanych za poprawne. Resolution: golden path + testy T1/T8; 422 tylko przy zerowej liczbie etapów wynikowych, bez INV-GEN-01b w MVP.
- [new] Agregat domenowy egzekwuje INV-GEN-01 w operacji generacji przed jakimkolwiek zapisem wersji. Priority: must-have.
  > Socrates: Brak kontrargumentu — stoi.
- [modified] Ścieżka zapisu zwraca HTTP 422 z komunikatem PL gdy generacja jest pusta, zamiast 201/200. Priority: must-have.
  > Socrates: Brak kontrargumentu — stoi.
- [modified] Zapis wersji planu odbywa się atomowo (wersja + odpowiedzi + wyniki w jednej transakcji lub rollback). Priority: must-have.
  > Socrates: Counter-argument: big-bang repo > 2 tygodnie. Resolution: cienki wrapper na istniejącej orkiestracji zapisu — agregat + repozytorium bez pełnego przepisywania warstw.

### Preserved capabilities

- [preserved] Inwestor z poprawną ankietą nadal otrzymuje sukces zapisu i co najmniej jeden etap w wynikach (golden path). Priority: must-have.
  > Socrates: Brak kontrargumentu — stoi.
- [preserved] Auth email+hasło, własność planu i limit przeliczeń działają jak dotychczas. Priority: must-have.
  > Socrates: Brak kontrargumentu — stoi.

### UI (secondary scope)

- [new] Inwestor widzi komunikat błędu na formularzu ankiety po 422, bez redirectu na stronę pustego planu. Priority: nice-to-have.
  > Socrates: Brak kontrargumentu — nice-to-have OK.

## Constraints & Compatibility

- **Auth i własność planu:** bez zmian (email+hasło, właściciel planu, limit przeliczeń).
- **Silnik generacji etapów:** w fazie 1 pozostaje bez zmian semantyki filtra — agregat interpretuje pusty wynik filtra jako błąd domenowy, bez throw w samym filtrze.
- **Dane legacy:** istniejące puste wersje w storage nie wymagają czyszczenia ani uzupełniania; ścieżka odczytu nadal może zwracać „brak wyników” dla starych rekordów.
- **Zakres implementacji:** cienki wrapper na istniejącej orkiestracji zapisu — bez big-bang przepisywania wszystkich warstw w 2 tygodnie.
- **Kompatybilność API:** 422 zamiast 201/200 dla pustej generacji — akceptowalne; jedyny klient w MVP to własny UI.

**Jakość na granicy produktu:**

- Pusta generacja zwraca odpowiedź 422 w czasie porównywalnym z obecnym czasem odpowiedzi przy zapisie planu — bez dodatkowego oczekiwania użytkownika względem baseline.

## Business Logic Changes

Udane zakończenie generacji planu wymaga co najmniej jednego etapu nadającego się do wyświetlenia kosztorysu i timeline.

**Było:** System traktował zapis wersji planu jako sukces nawet gdy filtr etapów zwracał pusty wynik — użytkownik dowiadywał się o problemie dopiero przy odczycie wyników.

**Zmiana:** Generacja bez etapów do wyświetlenia nie jest sukcesem produktowym — operacja kończy się błędem domenowym pustej generacji, mapowanym na HTTP 422, bez zapisu pustej wersji w transakcji.

Wejście: odpowiedzi ankiety (stany start/docelowy, parametry budowy) + katalog etapów. Wyjście: zamrożone wyniki etapów z kosztami i harmonogramem — lub odrzucenie operacji. Użytkownik napotyka regułę przy submitcie ankiety (422 na formularzu po fazie UI) zamiast po redirectzie na pusty plan.

## Access Control Changes

**Obecny model:** Rejestracja i logowanie email + hasło. Płaski model użytkownika — brak ról admin/member. Jeden plan na użytkownika w MVP. Tylko właściciel planu może odczytywać wyniki, przeliczać plan i zapisywać notatki etapów.

**Zmiana w tej pracy:** Brak — model auth i granice własności planu pozostają bez zmian. No access control changes — current model preserved.

## Non-Goals

- **Zmiany auth** — brak OAuth, forgot password, nowych ról; model email+hasło bez zmian.
- **Migracja legacy danych** — brak czyszczenia ani uzupełniania istniejących pustych wersji planu; ścieżka odczytu „brak wyników” dla starych rekordów wystarczy.
- **INV-GEN-01b** — odrzucenie gdy wszystkie koszty etapów = 0 (faza opcjonalna, poza tym change).
- **Anti-corruption layer / refactor C1–C4** — osobny change.
- **Podgląd N etapów przed submitem** — osobny produktowy wątek.

## Open Questions

_Brak otwartych pytań — shape cross-check accepted (2026-06-12)._
