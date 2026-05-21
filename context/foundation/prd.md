---
project: "# TODO: project - see Open Questions"
version: 1
status: draft
created: 2026-05-19
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

## Vision & Problem Statement

Osoba prywatna planujaca budowe pierwszego domu w trybie gospodarczym nie ma jasnej mapy etapow, orientacyjnych kosztow i kolejnosci dzialan, przez co budowa jest obarczona wysokim stresem, duza liczba decyzji podejmowanych w ciemno i czasochlonnym researchem.

Najwieksza wartosc daje praktyczne polaczenie orientacyjnej wyceny etapow z harmonogramem zaleznosci, bo dobra kolejnosc prac i ekip ogranicza koszt bledow i pozwala unikac niepotrzebnych dodatkowych wydatkow.

Przy skali 100x wzgledem MVP bazowa regula moze pozostac taka sama, ale warto rozwazyc regionalizacje kosztow i terminow.

## User & Persona

Primary persona: osoba prywatna budujaca pierwszy dom w trybie gospodarczym, bez eksperckiej wiedzy budowlanej i bez budzetu na kompleksowa obsluge "pod klucz".

Moment potrzeby:
- na etapie decyzji "czy mnie na to stac" i pierwszego budzetowania,
- przy planowaniu kolejnosci etapow i terminow ekip,
- w momentach koordynacji wykonawcow, kiedy nie jest jasne co powinno wydarzyc sie najpierw.

Koszt dzis:
- wysoki stres i niepewnosc decyzyjna,
- duzy koszt czasu na samodzielny research i przygotowanie arkuszy,
- ryzyko dodatkowych kosztow wynikajacych z blednej kolejnosci prac.

## Success Criteria

### Primary
- Zalogowany uzytkownik przechodzi dynamiczna ankiete krok po kroku, potwierdza odpowiedzi i otrzymuje orientacyjny kosztorys etapow budowy oraz timeline prac.
- Uzytkownik moze edytowac odpowiedzi ankiety i po ponownym przeliczeniu widzi zaktualizowany kosztorys i timeline.

### Secondary
- Uzytkownik moze korzystac z przypomnien zwiazanych z timeline (integracja z kalendarzem) oraz dopisywac notatki do etapow, aby latwiej koordynowac kontakt z wykonawcami.

### Guardrails
- Wynik generuje sie w rozsadnym czasie i nie blokuje uzytkownika na wielominutowe oczekiwanie.
- Interfejs prezentacji kosztorysu i timeline jest czytelny i wspiera decyzje zamiast dokladac poznawczego chaosu.

## User Stories

### US-01: Uzytkownik generuje i aktualizuje plan budowy domu

- **Given** zalogowany uzytkownik chce zaplanowac budowe domu i ma dostep do ankiety planistycznej
- **When** uzupelnia (lub pomija) pytania, potwierdza odpowiedzi i uruchamia generowanie planu
- **Then** otrzymuje czytelny, orientacyjny kosztorys etapow oraz timeline prac, a po edycji odpowiedzi moze wygenerowac zaktualizowana wersje wynikow

#### Acceptance Criteria
- Uzytkownik moze przejsc ankiete krok po kroku i zatwierdzic odpowiedzi.
- Po zatwierdzeniu system generuje kosztorys i timeline i prezentuje je na ekranie wynikow.
- Uzytkownik moze wrocic do ankiety, zmienic odpowiedzi i uruchomic ponowne przeliczenie.
- Po ponownym przeliczeniu uzytkownik widzi zaktualizowany kosztorys i timeline.

## Functional Requirements

### Authentication
- FR-001: User can create an account using email and password. Priority: must-have
  > Socrates: Counter-argument considered: supporting two signup methods in MVP increases scope. Resolution: reduced MVP scope to email/password signup only.
- FR-002: User can sign in using email and password. Priority: must-have
  > Socrates: Counter-argument considered: external auth dependencies can distract from core value. Resolution: keep sign-in in MVP but limit to email/password.
- FR-011: User can create an account and sign in using a third-party identity provider. Priority: nice-to-have
  > Socrates: Counter-argument considered: social login may delay MVP. Resolution: retained as optional post-MVP capability.

### Questionnaire and planning inputs
- FR-003: User can answer required questionnaire questions needed to generate cost estimate and timeline. Priority: must-have
  > Socrates: Counter-argument considered: too many required inputs can increase drop-off. Resolution: keep required core inputs minimal and focused on decision-critical data.
- FR-004: User can skip a questionnaire question when unsure only when that question is marked optional, and continue the flow. Priority: must-have
  > Socrates: Counter-argument considered: unrestricted skip reduces estimate quality. Resolution: skip is supported with limits to optional questions only.
- FR-005: User can edit previously submitted questionnaire answers and trigger recalculation. Priority: must-have
  > Socrates: Counter-argument considered: recalculation can increase processing cost and latency. Resolution: keep recalculation because planning is iterative; optimize performance as guardrail.

### Results and timeline usage
- FR-006: User can view generated cost estimate by construction stages and a timeline of stages. Priority: must-have
  > Socrates: Counter-argument considered: none strong enough to remove it from MVP. Resolution: kept as written because cost and timeline together are core output.
- FR-007: User can add notes or pinned events to specific timeline stages. Priority: nice-to-have
  > Socrates: Counter-argument considered: notes are productivity support, not core value of first release. Resolution: moved to nice-to-have.

### Generation logic
- FR-008: System can analyze user questionnaire answers to generate an initial stage-based estimate and timeline. Priority: must-have
  > Socrates: Counter-argument considered: none stronger than the value of validated generation. Resolution: kept as core MVP engine.
- FR-009: System can use internet browsing data to refine estimate and timeline in the context of questionnaire answers. Priority: must-have
  > Socrates: Counter-argument considered: internet data volatility may reduce consistency. Resolution: kept for MVP with clear "orientational estimate" framing and source-quality controls to be defined.

### Calendar integration
- FR-010: User can request calendar events creation for selected or all timeline stages, and System can create those events in an external calendar service. Priority: nice-to-have
  > Socrates: Counter-argument considered: external calendar integration may delay release due to external dependency. Resolution: remains nice-to-have outside core MVP path.

## Non-Functional Requirements

- Wynik planu (wycena + timeline) jest widoczny dla uzytkownika w czasie <= 100 sekund od zatwierdzenia ankiety.
- Prezentacja wyniku jest czytelna: kazdy etap pokazuje koszt orientacyjny i miejsce w harmonogramie, bez koniecznosci domyslania sie kolejnosci prac.
- Aplikacja dziala na urzadzeniach mobilnych i desktopowych.
- Dane planu uzytkownika pozostaja dostepne bez automatycznego wygaszania retencji w MVP.
- System ogranicza liczbe pelnych przeliczen planu na uzytkownika w zdefiniowanym limicie, aby utrzymac koszt operacyjny MVP.

## Business Logic

Na podstawie odpowiedzi uzytkownika aplikacja wyznacza timeline etapow budowy domu oraz ich wstepne, orientacyjne wyceny.

Kluczowe wejscia do reguly to: stan inwestycji (np. surowy otwarty/surowy zamkniety/deweloperski), poziom ocieplenia, standard budowy, metraz, kluczowa data (start lub termin docelowy), liczba kondygnacji, poddasze uzytkowe (tak/nie) oraz garaz (liczba stanowisk).

Wynik reguly uzytkownik otrzymuje jako zestaw etapow z orientacyjnymi kosztami i osadzeniem w czasie, tak aby wiedziec kiedy planowac kolejne prace oraz umawianie wykonawcow.

## Access Control

Dostep do aplikacji wymaga logowania.

Model uprawnien na MVP jest plaski: kazdy zalogowany uzytkownik ma ten sam zakres funkcji (brak osobnych rol typu admin/member na tym etapie).

## Non-Goals

- MVP nie obejmuje marketplace ani CRM do pelnego zarzadzania wykonawcami, umowami i rozliczeniami; fokus to plan i orientacyjne koszty.
- MVP nie dostarcza wiazacych ofert cenowych; prezentuje orientacyjne wyceny i harmonogram pomocniczy.
- MVP nie automatyzuje formalnosci urzedowych i procesu pozwolen.
- MVP nie wspiera zaawansowanej wspolpracy wielu uzytkownikow nad jednym planem (brak rozbudowanych trybow shared-workspace).

## Open Questions

1. **Jaka nazwa projektu ma byc wpisana jako `project` w PRD frontmatter?** Owner: user. Block: yes (wymagane do finalizacji metadanych dokumentu).
2. **Jaka forma prezentacji wyniku jest docelowa na MVP?** Tabela + timeline czy jeden widok timeline z kosztami. Owner: user. Block: no (mozna startowac od jednego czytelnego wariantu).
3. **Jaki jest liczbowy limit pelnych przeliczen planu na uzytkownika?** Wymagany konkretny prog do finalizacji FR-005/NFR kosztowego. Owner: user. Block: yes (wplywa na zasady produktu i koszty).
4. **Ktora data jest obligatoryjna w ankiecie?** Termin startu czy termin docelowy (druga opcja moze byc opcjonalna). Owner: user. Block: no (mozna wdrozyc z jedna data wymagana i druga opcjonalna).
