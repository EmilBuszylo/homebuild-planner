---
project: home-build-planner
version: 1
status: draft
created: 2026-05-25
updated: 2026-05-26
prd_version: 1
main_goal: speed
top_blocker: decisions
---

# Roadmap: home-build-planner

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Osoba prywatna budująca pierwszy dom w trybie gospodarczym nie ma jasnej mapy etapów, orientacyjnych kosztów i kolejności działań. Największą wartość daje praktyczne połączenie orientacyjnej wyceny etapów z harmonogramem zależności — dobra kolejność prac i ekip ogranicza koszt błędów. MVP dostarcza dynamiczną ankietę i na jej podstawie generuje orientacyjny kosztorys etapów budowy oraz timeline prac.

## North star

**S-03: Użytkownik wypełnia ankietę i widzi kosztorys + timeline** — najmniejszy kompletny przepływ (ang. north star), który udowadnia, że produkt działa: zalogowany użytkownik przechodzi ankietę, zatwierdza odpowiedzi i otrzymuje orientacyjny kosztorys etapów oraz harmonogram. Umieszczony najwcześniej, jak pozwalają zależności, bo cała reszta ma sens tylko jeśli to działa.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-01 | supabase-auth-wiring | (foundation) Supabase Auth podpięte; logowanie i rejestracja działają end-to-end | — | FR-001, FR-002 | done |
| F-01b | user-model-sync | (foundation) Model User w Prisma zsynchronizowany z Supabase Auth; rejestracja tworzy rekord User | F-01 | FR-001 | ready |
| F-02 | domain-schema-and-seed | (foundation) Modele domenowe (ankieta, plan, etapy, wyceny) w Prisma + seed lokalnej bazy wiedzy o etapach budowy | F-01, F-01b | FR-003, FR-008 | proposed |
| S-01 | questionnaire-flow | Użytkownik przechodzi ankietę krok po kroku, zatwierdza odpowiedzi | F-01, F-02 | US-01, FR-003, FR-004 | done |
| S-01b | questionnaire-refinements | Ankieta uwzględnia realne mechanizmy wyceny: ocieplenie jako mnożnik %, stan docelowy + startowy, drzwi tarasowe × ilość, balkony | S-01 | FR-003, FR-004, FR-008 | done |
| S-02 | plan-generation | System generuje kosztorys etapów i timeline na podstawie odpowiedzi z ankiety (lokalna baza wiedzy) | S-01, S-01b | US-01, FR-006, FR-008 | done |
| S-03 | first-plan-e2e | Użytkownik wypełnia ankietę i widzi kosztorys + timeline (north star) | S-02 | US-01, FR-003, FR-006, FR-008 | proposed |
| S-04 | internet-refinement | System doprecyzowuje wyceny danymi z internetu | S-03 | FR-009 | proposed |
| S-05 | edit-and-recalculate | Użytkownik edytuje odpowiedzi ankiety i uruchamia ponowne przeliczenie | S-03 | US-01, FR-005 | proposed |
| S-06 | rate-limit-enforcement | System ogranicza liczbę przeliceń na użytkownika zgodnie z ustalonym limitem | S-05 | FR-005, NFR (limit przeliceń) | blocked |

## Streams

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Auth i dane | `F-01` → `F-01b` → `F-02` | Fundament: auth + model użytkownika + schemat domenowy — odblokują ankietę i generowanie. |
| B | Rdzeń wartości | `S-01` → `S-01b` → `S-02` → `S-03` → `S-05` | Główna ścieżka do gwiazdy przewodniej i edycji; `S-05` parallel with `S-04`. |
| C | Doprecyzowanie | `S-04` | Internet refinement — po north star; parallel with `S-05`. |
| D | Limity i koszty | `S-06` | Blocked na decyzję o limicie przeliceń (Open Question #2). |

## Baseline

Co jest już w codebase na 2026-05-25 (auto-researched + potwierdzone).
Foundations poniżej zakładają, że te warstwy istnieją i NIE budują ich od nowa.

- **Frontend:** present — Next.js 16.2.6 + React 19, Tailwind CSS 4, shadcn/ui (new-york), strony: root landing, `(auth)/login`, `(auth)/register`; komponenty auth w `src/components/auth/`
- **Backend / API:** partial — jeden endpoint `GET /api/health/db` (`src/app/api/health/db/route.ts`); brak Server Actions, brak logiki domenowej
- **Data:** partial — Prisma 6.x, schema z modelem `DbHealth`, singleton `src/lib/prisma.ts`, migracje `init_db_health`; brak modeli domenowych
- **Auth:** partial — formularze login/register (UI-only, RHF + zod, bez API); Supabase Auth NIE podpięte
- **Deploy / infra:** present — `docker-compose.yml` (local Postgres 16 :55432), `.github/workflows/ci.yml` + `deploy.yml`, `vercel.json`, `deploy-plan.md`
- **Observability:** partial — `GET /api/health/db`; brak logowania, error tracking, metryk

## Foundations

### F-01: Podpięcie Supabase Auth

- **Outcome:** (foundation) Supabase Auth podpięte end-to-end; użytkownik może się zarejestrować i zalogować przez istniejące formularze auth; sesja jest walidowana na serwerze.
- **Change ID:** supabase-auth-wiring
- **PRD refs:** FR-001, FR-002
- **Unlocks:** S-01, S-02, S-03, S-05 — każdy slice wymaga zalogowanego użytkownika; bez auth nie ma dostępu do ankiety ani wyników
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Supabase Auth SDK zmienia nazwy kluczy między wersjami; przed implementacją należy sprawdzić aktualne docs pod kątem Publishable/Secret key naming.
- **Status:** done
- **Retro gap:** F-01 nie zawierał modelu `User` w Prisma — auth działa, ale dane domenowe nie mają do czego się podpiąć relacyjnie. Wyodrębniono F-01b aby zamknąć lukę przed F-02.

### F-01b: Model User zsynchronizowany z Supabase Auth

- **Outcome:** (foundation) Model `User` w `prisma/schema.prisma` z Supabase Auth UUID jako PK (`id`). Rejestracja (`register` Server Action) tworzy rekord User w transakcji z `signUp`. Istniejące modele domenowe (Plan, itd.) mają FK relację do User zamiast gołego `userId String`.
- **Change ID:** user-model-sync
- **PRD refs:** FR-001
- **Unlocks:** F-02 — modele domenowe mogą mieć relacje do User; S-01–S-05 — każdy slice operuje na danych powiązanych z użytkownikiem
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Tworzenie rekordu User musi być atomowe z `signUp` — jeśli jedno się powiedzie a drugie nie, zostanie osierocony użytkownik w Supabase bez rekordu w bazie domenowej. Rozwiązanie: try/catch z cleanup lub Supabase DB trigger jako fallback.
- **Status:** ready

### F-02: Schemat domenowy i seed bazy wiedzy

- **Outcome:** (foundation) Modele Prisma dla ankiety, planu, etapów budowy i orientacyjnych wycen. Seed z lokalną bazą wiedzy o etapach i widełkach kosztowych (shape-notes: „lokalna baza wiedzy o etapach i orientacyjnych widełkach, zanim system wykona doprecyzowanie danymi z internetu").
- **Change ID:** domain-schema-and-seed
- **PRD refs:** FR-003, FR-008, Business Logic (wejścia: stan inwestycji, ocieplenie, standard, metraż, data, kondygnacje, poddasze, garaż)
- **Unlocks:** S-01 (ankieta potrzebuje schematu pytań), S-02 (generowanie potrzebuje danych seed)
- **Prerequisites:** F-01, F-01b
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Dokładna lista etapów budowy i widełek kosztowych do seeda — Owner: user. Block: no (można zacząć od przykładowych danych i iterować).
- **Risk:** Schemat ankiety musi być elastyczny na pytania wymagane vs opcjonalne (FR-004); zbyt sztywny model utrudni późniejsze zmiany.
- **Status:** proposed

## Slices

### S-01: Przepływ ankiety

- **Outcome:** Użytkownik przechodzi dynamiczną ankietę krok po kroku, odpowiada na pytania wymagane, pomija opcjonalne i zatwierdza odpowiedzi.
- **Change ID:** questionnaire-flow
- **PRD refs:** US-01, FR-003, FR-004
- **Prerequisites:** F-01, F-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Która data jest obligatoryjna w ankiecie — termin startu czy termin docelowy? (PRD Open Question #3) — Owner: user. Block: no (można wdrożyć z jedną datą wymaganą i drugą opcjonalną).
- **Risk:** Zbyt wiele pytań w MVP zwiększy drop-off; PRD mówi „keep required core inputs minimal".
- **Status:** proposed

### S-01b: Korekta pytań ankiety pod realne mechanizmy wyceny

- **Outcome:** Ankieta uwzględnia realne mechanizmy kosztowe budowy domu: (1) ocieplenie działa jako mnożnik procentowy kosztów per m², nie jako grubość styropianu w cm; (2) stan inwestycji oznacza stan docelowy, z dodatkowym pytaniem o stan startowy — etapy już ukończone są pomijane w kosztach i timeline; (3) drzwi tarasowe mają ilość i cenę zależną od standardu (ekonomiczny = balkonowe, standard = przesuwne smart, premium = HS); (4) nowe pytanie o balkony wpływające na koszt.
- **Change ID:** questionnaire-refinements
- **PRD refs:** FR-003, FR-004, FR-008 (Business Logic: wycena musi być realistyczna)
- **Unlocks:** S-02 — dokładność wyceny zależy od poprawnego modelu pytań i modyfikatorów kosztowych
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Zmiana semantyki `investment_state` i `insulation_level` wymaga aktualizacji seed, Zod schema, formularza i modyfikatorów kosztowych. Istniejące plany (jeśli są w DB) mogą mieć stare wartości — migracja danych planów nie jest w scope (MVP, niska baza użytkowników).
- **Status:** done
- **Detail of changes:**
  1. **Ocieplenie** — `insulation_level` options: usunąć etykiety z cm (np. „15–20 cm"), zmienić na opisy jakościowe. Modifier działa jako procentowy mnożnik kosztów per m² na etapie ocieplenia (i powiązanych etapach jak strop, dach), a nie jako stała kwota.
  2. **Stan inwestycji** — zmiana semantyki `investment_state` na „stan docelowy" (do jakiego etapu inwestor chce dojść w ramach planu). Nowe pytanie `starting_state` (opcje takie same) — etapy z `completedByState ≤ starting_state` zostają pominięte w kosztorysie i timeline.
  3. **Drzwi tarasowe** — zamiana `has_terrace_doors: BOOLEAN` na `terrace_door_count: NUMBER (0–5)`. Cena za sztukę × ilość, zależna od standardu (economy = drzwi balkonowe, standard = przesuwne smart, premium = HS).
  4. **Balkony** — nowe pytanie `balcony_count: NUMBER (0–5)`. Nowe modyfikatory kosztowe na etap `structure` lub dedykowany etap opcjonalny.

### S-02: Generowanie planu (lokalna baza)

- **Outcome:** System analizuje odpowiedzi z ankiety i generuje orientacyjny kosztorys etapów oraz timeline na podstawie lokalnej bazy wiedzy (seed z F-02).
- **Change ID:** plan-generation
- **PRD refs:** US-01, FR-006, FR-008
- **Prerequisites:** S-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jaka forma prezentacji wyniku na MVP — tabela + timeline czy jeden widok? (PRD Open Question #1) — Owner: user. Block: no (można startować od jednego czytelnego wariantu).
- **Risk:** Wynik musi pojawić się w ≤ 100 s (NFR). Przy lokalnej bazie nie powinno być problemu, ale warto weryfikować na realnym seeedzie.
- **Status:** done

### S-03: Pierwsza kompletna ścieżka (north star)

- **Outcome:** Zalogowany użytkownik wypełnia ankietę i widzi kosztorys + timeline — kompletny przepływ end-to-end, od logowania po wynik.
- **Change ID:** first-plan-e2e
- **PRD refs:** US-01, FR-003, FR-006, FR-008
- **Prerequisites:** S-02
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** To jest integracja S-01 + S-02 w spójny UX. Jeśli S-01 i S-02 powstaną w izolacji, integracja może ujawnić niespójności w modelu danych.
- **Status:** proposed

### S-04: Doprecyzowanie danymi z internetu

- **Outcome:** System wykorzystuje dane z internetu do doprecyzowania wycen i timeline w kontekście odpowiedzi użytkownika.
- **Change ID:** internet-refinement
- **PRD refs:** FR-009
- **Prerequisites:** S-03
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:**
  - Jakie źródła internetowe i jaka metoda pobierania danych (scraping, API, LLM browsing)? — Owner: user/team. Block: no (można zacząć od jednego źródła i iterować).
  - Jak zapewnić spójność wyników przy zmiennych danych z internetu? (PRD: „source-quality controls to be defined") — Owner: user/team. Block: no.
- **Risk:** Zmienność danych internetowych może dawać niestabilne wyniki między przeliczeniami; shape-notes sugerują najpierw lokalną bazę jako kotwicę, internet doprecyzowuje — ta kolejność minimalizuje ryzyko.
- **Status:** proposed

### S-05: Edycja odpowiedzi i przeliczenie

- **Outcome:** Użytkownik wraca do ankiety, zmienia odpowiedzi i uruchamia ponowne przeliczenie; widzi zaktualizowany kosztorys i timeline.
- **Change ID:** edit-and-recalculate
- **PRD refs:** US-01, FR-005
- **Prerequisites:** S-03
- **Parallel with:** S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Przeliczenie musi działać w ≤ 100 s (NFR). Jeśli S-04 (internet) jest włączone, przeliczenie będzie wolniejsze — ale S-05 może działać na samej lokalnej bazie.
- **Status:** proposed

### S-06: Limit przeliceń na użytkownika

- **Outcome:** System ogranicza liczbę pełnych przeliceń planu na użytkownika w zdefiniowanym limicie, aby utrzymać koszt operacyjny MVP.
- **Change ID:** rate-limit-enforcement
- **PRD refs:** FR-005, NFR (limit przeliceń)
- **Prerequisites:** S-05
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:**
  - Jaki jest liczbowy limit pełnych przeliceń planu na użytkownika? (PRD Open Question #2, Block: yes) — Owner: user. Block: yes.
- **Risk:** Bez ustalonego limitu nie da się zaimplementować ani przetestować tego slice'a. To jedyny slice z blokerem decyzyjnym.
- **Status:** blocked

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-01 | supabase-auth-wiring | Podpięcie Supabase Auth end-to-end | done | — |
| F-01b | user-model-sync | Model User w Prisma + sync z Supabase Auth | yes | Run `/10x-plan user-model-sync` |
| F-02 | domain-schema-and-seed | Schemat domenowy Prisma + seed bazy wiedzy etapów | no | Wymaga F-01, F-01b |
| S-01 | questionnaire-flow | Przepływ ankiety krok po kroku | done | — |
| S-01b | questionnaire-refinements | Korekta pytań ankiety pod realne mechanizmy wyceny | done | — |
| S-02 | plan-generation | Generowanie kosztorysu i timeline z lokalnej bazy | done | — |
| S-03 | first-plan-e2e | Kompletna ścieżka: ankieta → kosztorys + timeline | no | Wymaga S-02; north star |
| S-04 | internet-refinement | Doprecyzowanie wycen danymi z internetu | no | Wymaga S-03 |
| S-05 | edit-and-recalculate | Edycja odpowiedzi i ponowne przeliczenie | no | Wymaga S-03; parallel with S-04 |
| S-06 | rate-limit-enforcement | Limit przeliceń na użytkownika | no | Blocked: brak ustalonego limitu (OQ #2) |

## Open Roadmap Questions

1. **Jaka forma prezentacji wyniku jest docelowa na MVP?** Tabela + timeline czy jeden widok timeline z kosztami. Owner: user. Block: S-02 (można startować od jednego czytelnego wariantu, ale decyzja wpłynie na UI).
2. **Jaki jest liczbowy limit pełnych przeliceń planu na użytkownika?** Wymagany konkretny próg do finalizacji S-06 i NFR kosztowego. Owner: user. Block: S-06.
3. **Która data jest obligatoryjna w ankiecie?** Termin startu czy termin docelowy (druga opcja może być opcjonalna). Owner: user. Block: S-01 (można wdrożyć z jedną datą wymaganą i drugą opcjonalną).

## Parked

- **FR-011: Logowanie przez Google** — Why parked: PRD §FR-011 Priority: nice-to-have; main_goal: speed → nie na ścieżce must-have.
- **FR-007: Notatki do etapów timeline** — Why parked: PRD §FR-007 Priority: nice-to-have; prosta funkcja do dodania po north star.
- **FR-010: Integracja z Google Calendar** — Why parked: PRD §FR-010 Priority: nice-to-have; zależność od zewnętrznego API.
- **Observability (logi, error tracking, metryki)** — Why parked: NFR nie wymaga ich na launch; zainwestować po north star jeśli będzie potrzeba diagnostyki produkcyjnej.

## Done

- **F-01** supabase-auth-wiring — Supabase Auth podpięte end-to-end (formularze, Server Actions, middleware, dashboard stub). Retro: brak modelu User wyodrębniony do F-01b.
- **S-01** questionnaire-flow — Dynamiczna ankieta krok po kroku (3 kroki + podsumowanie), POST /api/plans z atomową transakcją Prisma, redirect do strony planu. Retro: auto-submit bug naprawiony (type="button" + programmatic handleSubmit); user.upsert dodany defensywnie w tx.
- **S-01b** questionnaire-refinements — 13 pytań: stan docelowy vs startowy (osobne opcje), ocieplenie jako %, drzwi tarasowe × ilość, balkony; walidacja start < cel z czyszczeniem błędu po poprawce.
