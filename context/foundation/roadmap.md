---
project: home-build-planner
version: 2
status: active
created: 2026-05-25
updated: 2026-05-28
prd_version: 1
main_goal: quality
top_blocker: none
phase: post-mvp-polish
---

# Roadmap: home-build-planner (post-MVP polish)

> Faza 2: domknięcie MVP w prostej, dopracowanej formie — bez nowych funkcji „extra”.
> Poprzednia roadmapa MVP: `context/foundation/archive/2026-05-28-roadmap-mvp.md`.
> Slice’y poniżej to wyłącznie praca po zamknięciu funkcjonalnego MVP (S-01…S-06 w **Done**).

## Vision recap

Osoba prywatna budująca pierwszy dom w trybie gospodarczym potrzebuje jasnej mapy etapów, orientacyjnych kosztów i kolejności działań. Rdzeń produktu (ankieta → kosztorys + harmonogram → edycja i przeliczenie) jest zaimplementowany. Ta faza nie dodaje marketplace’u, kalendarza ani notatek użytkownika — skupia się na **czytelności, podpowiedziach i dopracowanym panelu**, żeby MVP było przyjemne w użyciu, a nie tylko „działa technicznie”.

## North star

**S-08: Użytkownik widzi poziomy harmonogram z notkami praktycznymi** — najmniejszy widoczny dowód, że faza polish się udała: na stronie planu widać **kolejność etapów w czasie** (oś pozioma, czytelniejsza niż surowy widok typu Jira) oraz **krótkie wskazówki** (np. podczas fundamentów warto już myśleć o oknach i drzwiach). Bez tego reszta polishu nie spełnia kryterium „fajnego, gotowego MVP” z PRD (prezentacja wyniku wspiera decyzje).

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
|---|---|---|---|---|---|
| F-07 | vitest-minimal-setup | (foundation) Uruchomić `pnpm test` z minimalnym Vitest i kilkoma testami logiki czystej | — | Success Criteria (guardrails), NFR | proposed |
| S-07 | questionnaire-hints | Przy pytaniach ankiety czytać podpowiedź: co oznacza pytanie i jak wpływa na wycenę | — | FR-003, FR-004, Business Logic | ready |
| S-08 | horizontal-timeline-coaching | Na stronie planu widzieć poziomy harmonogram etapów z notkami praktycznymi | — | FR-006, NFR (czytelna prezentacja) | ready |
| S-09 | app-panel-polish | Korzystać z dopracowanego panelu (hub, nawigacja, układ strony planu) zamiast surowego szkieletu | S-08 | FR-006, NFR (mobile) | proposed |
| S-10 | mvp-polish-finish | Doświadczyć spójnego, „gotowego” MVP: copy, disclaimery orientacyjne, mobile, brak surowych krawędzi | S-07, S-08, S-09, F-07 | US-01, FR-003–FR-006, FR-008–FR-009, Success Criteria | proposed |

## Streams

| Stream | Theme | Chain | Note |
|---|---|---|---|
| A | Bezpieczeństwo zmian | `F-07` | Minimalny test stack przed większymi zmianami UI; równolegle z S-07. |
| B | Zrozumienie ankiety | `S-07` | Hinty przy pytaniach (stan surowy otwarty vs zamknięty itd.). |
| C | Harmonogram i panel | `S-08` → `S-09` | Najpierw nowy timeline; potem spójny układ panelu wokół wyników. |
| D | Domknięcie | `S-10` | Capstone po pozostałych slice’ach fazy. |

## Baseline

Stan codebase na **2026-05-28** (auto-researched; faza polish zakłada, że MVP funkcjonalne jest na miejscu).

- **Frontend:** present — Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui; landing marketingowy, `(app)` z headerem, ankieta, strona planu (`plan-cost-table`, `plan-timeline` pionowy)
- **Backend / API:** present — API planów, questionnaire, recalculate, results; Server Actions auth
- **Data:** present — Prisma, modele domenowe, seed etapów i pytań, `MarketBenchmark`, migracje w repo
- **Auth:** present — Supabase Auth + model `User`, middleware
- **Deploy / infra:** present — Docker Postgres lokalnie, GitHub Actions, Vercel
- **Observability:** partial — health endpoint; brak Sentry/logów (poza zakresem tej fazy)

## Foundations

### F-07: Minimalny setup testów (Vitest)

- **Outcome:** (foundation) Vitest skonfigurowany; `pnpm test` uruchamia ≥2 testy jednostkowe dla logiki czystej (np. doprecyzowanie benchmarków, rate limit przeliczeń).
- **Change ID:** vitest-minimal-setup
- **PRD refs:** Success Criteria (guardrails), NFR (jakość utrzymania)
- **Unlocks:** S-10 — bezpieczniejsze domknięcie fazy; regresje przy zmianach w `apply-market-benchmarks` / `plan-recalc`
- **Prerequisites:** —
- **Parallel with:** S-07, S-08
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Scope creep — tylko minimalny setup i 2–3 testy; bez E2E i bez pełnego coverage.
- **Status:** proposed

## Slices

### S-07: Podpowiedzi w ankiecie

- **Outcome:** Użytkownik przy (prawie) każdym pytaniu ankiety widzi hint: co oznacza pytanie (np. stan surowy otwarty vs zamknięty), jak orientacyjnie wpływa na kalkulację i na całość planu.
- **Change ID:** questionnaire-hints
- **PRD refs:** FR-003, FR-004, Business Logic (wejścia: stan inwestycji, ocieplenie, standard…)
- **Prerequisites:** —
- **Parallel with:** F-07, S-08
- **Blockers:** —
- **Unknowns:**
  - Treści hintów: pole w seed (`QuestionDefinition`) vs mapa w kodzie — Owner: team. Block: no (MVP treści może być kuratowana w seed).
- **Risk:** Zbyt długie hinty obciążą mobile — trzymać 2–4 zdania + opcjonalne „rozwiń”.
- **Status:** ready

### S-08: Poziomy harmonogram z notkami praktycznymi

- **Outcome:** Użytkownik na stronie planu widzi **poziomy** harmonogram etapów (kolejność w czasie, daty, opcjonalnie koszt na etapie) w estetyce czytelniejszej niż surowy Jira timeline; przy wybranych etapach pojawiają się **notki coachingowe** (np. w trakcie fundamentów: warto już szukać okien i drzwi — długi czas oczekiwania).
- **Change ID:** horizontal-timeline-coaching
- **PRD refs:** FR-006, NFR (prezentacja wyniku bez domyślania się kolejności)
- **Prerequisites:** —
- **Parallel with:** S-07, F-07
- **Blockers:** —
- **Unknowns:**
  - Zakres notek na MVP (które etapy, kto dostarcza copy PL) — Owner: user. Block: no (można zacząć od 3–5 kluczowych etapów w seed).
  - Czy kosztorys pozostaje tabelą pod timeline, czy scalony widok — Owner: user. Block: no (domyślnie: tabela + timeline, timeline poziomy).
- **Risk:** Złożoność layoutu na mobile — wymaga przewijania poziomego lub zwinięcia etapów; zaplanować w `/10x-plan`.
- **Status:** ready

### S-09: Dopracowany panel aplikacji

- **Outcome:** Użytkownik ma przyjazny hub i spójny układ w `(app)`: dashboard z sensownymi CTA i kontekstem planu, strona planu z hierarchią wizualną (nagłówek, podsumowanie, wyniki), mniej „surowego” centrowania i pustej przestrzeni.
- **Change ID:** app-panel-polish
- **PRD refs:** FR-006, NFR (mobile + desktop)
- **Prerequisites:** S-08
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Kosmetyka bez S-08 może rozjechać się z nowym timeline — dlatego S-08 wcześniej.
- **Status:** proposed

### S-10: Domknięcie MVP (polish capstone)

- **Outcome:** Użytkownik odbiera produkt jako **skończone MVP**: spójny język (orientacyjne wyceny), disclaimery, sprawdzenie mobile, spójność landing ↔ panel ↔ ankieta ↔ plan; bez funkcji spoza PRD must-have.
- **Change ID:** mvp-polish-finish
- **PRD refs:** US-01, FR-003, FR-004, FR-005, FR-006, FR-008, FR-009, Success Criteria (Primary + Guardrails)
- **Prerequisites:** S-07, S-08, S-09, F-07
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** S-10 nie może stać się nieskończonym „jeszcze tylko…” — checklista zamknięcia w planie change.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
|---|---|---|---|---|
| F-07 | vitest-minimal-setup | Vitest + 2–3 testy jednostkowe logiki czystej | yes | Równolegle z S-07/S-08 |
| S-07 | questionnaire-hints | Hinty przy pytaniach ankiety | yes | — |
| S-08 | horizontal-timeline-coaching | Poziomy timeline + notki praktyczne | yes | North star fazy |
| S-09 | app-panel-polish | Dopracowanie panelu i układu planu | no | Po S-08 |
| S-10 | mvp-polish-finish | Capstone: spójne, gotowe MVP | no | Po S-07, S-08, S-09, F-07 |

## Open Roadmap Questions

1. **Które etapy dostają notki coachingowe w pierwszej iteracji?** (fundamenty, stan zamknięty, okna/drzwi?) — Owner: user. Block: S-08 (można wdrożyć 3–5 notek i rozszerzać).
2. **Czy kosztorys zostaje osobną tabelą pod poziomym timeline?** — Owner: user. Block: no (rekomendacja: tabela + timeline).
3. **Jaka nazwa projektu w PRD frontmatter?** — Owner: user. Block: no (metadane dokumentu).

## Parked

- **FR-007: Notatki użytkownika na etapach** — Why parked: nice-to-have; notki w S-08 to copy systemowe (coaching), nie edycja przez użytkownika.
- **FR-010: Google Calendar** — Why parked: PRD nice-to-have; zależność zewnętrzna.
- **FR-011: Logowanie Google** — Why parked: PRD nice-to-have; faza polish = email/hasło.
- **Pełny pakiet testów (E2E, coverage)** — Why parked: tylko F-07 minimal; reszta po MVP polish.
- **Observability (Sentry, metryki)** — Why parked: health-check; nie blokuje „gotowego” MVP UX.

## Done

*(MVP funkcjonalne — bez ponownego planowania slice’ów S-01…S-06.)*

- **F-01** supabase-auth-wiring — Auth end-to-end. → `context/archive/…`
- **F-01b** user-model-sync — Model `User` + sync przy rejestracji.
- **F-02** domain-schema-and-seed — Modele domenowe + seed bazy wiedzy.
- **S-01** questionnaire-flow — Ankieta krok po kroku + POST planu.
- **S-01b** questionnaire-refinements — Stan docelowy/startowy, ocieplenie %, drzwi, balkony.
- **S-02** plan-generation — Kosztorys + timeline z lokalnej bazy.
- **S-03** first-plan-e2e — North star MVP: ankieta → wyniki.
- **S-03b** marketing-landing — Landing produktowy na `/`.
- **S-04** internet-refinement — Doprecyzowanie benchmarkami rynkowymi.
- **S-05** edit-and-recalculate — Edycja ankiety i przeliczenie.
- **S-06** rate-limit-enforcement — Limit 3 przeliczeń / 24h.
