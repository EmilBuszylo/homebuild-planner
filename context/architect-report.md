---
title: "Raport architektoniczny — moduł 4 (10xArchitect)"
created: 2026-06-13
type: architect-report
git_commit: feec9185d8af94b9bb468c600a73059ee6248a19
sources:
  - context/map/repo-map.md
  - context/changes/refactor-opportunities/research.md
  - context/changes/refactor-opportunities/plan.md
  - context/domain/01-domain-distillation.md
  - context/domain/02-invariant-aggregate-refactor.md
  - context/domain/03-anti-corruption-layer.md
---

# Raport architektoniczny — home-build-planner

> Synteza modułu 4 · commit `feec9185` · wyłącznie na podstawie artefaktów L2–L5 wymienionych w nagłówku.

---

## 1. Opisane projekty

| Repo | Stack (z artefaktów) | Skala | Gdzie w module |
|---|---|---|---|
| **home-build-planner** (`EmilBuszylo/homebuild-planner`) | Next.js MVP, React, TypeScript, Tailwind, Prisma ORM + PostgreSQL (Supabase host), Supabase Auth, Zod, Vitest, Playwright, Vercel (`01-domain-distillation.md`, `03-anti-corruption-layer.md`) | **Solo** — 100% commitów u jednego autora, bus factor 1 (`repo-map.md:91-96`); roadmap v3 zamknięta, brak otwartych feature change (`repo-map.md:11`) | **L2** mapa · **L3** research refactor-opportunities · **L4** plan C1–C4 · **L5** destylacja domeny + plany INV-GEN-01 i ACL |

Inne repozytoria w module: **BRAK artefaktu**.

---

## 2. Mapa projektu (L2)

**Rdzeń:** silnik pure `plan-generation` + dwa kontrakty hubowe (`validations/questionnaire`, `plan-results`) + orkiestrator zapisu `persist-plan-version` (`repo-map.md:11-12`, `:48-57`).

**Kluczowe wnioski:**

1. **Dwa kontrakty = najszerszy blast radius** — fan-in depcruise: 18← questionnaire, 14← plan-results; zmiana pola w Zod/DTO dotyka ankiety, silnika, UI planu, dashboardu, kalendarza (`repo-map.md:19-20`, `:60-61`).
2. **Write path wąski, read path szeroki** — zapis tylko przez `persist-plan-version` ← 2 handlery; odczyt wyników rozproszony po UI, GET results, kalendarzu (`repo-map.md:21-22`, `:79-85`).
3. **Strefy ryzyka coupling** — RSC→Prisma vs loopback `fetchPlanResults`; `investment-state` sprzężony z `@prisma/client`; dryft assemblera DTO w route zamiast w module (`repo-map.md:106-111`).
4. **Entry pointy** — POST `/api/plans`, GET results, RSC `/moj-plan/:id`, ankieta, dashboard (`repo-map.md:79-85`); cienkie wejścia (strony/routy) — ryzyko **kompozycji**, nie fan-in w górę (`repo-map.md:61-62`).
5. **Unknowns / owner-only** — `pnpm db:migrate`, seed prod, Google OAuth, CI Supabase secrets; procedura prod re-seed po kalibracji — **UNKNOWN** w research (`refactor-opportunities/research.md:345-347`).

Walidacja grafu: `pnpm depcruise`, 168 modułów, 0 cykli (`repo-map.md:6`).

---

## 3. Analiza ficzera (L3)

**Przepływ:** write/read **generacji i prezentacji wyników planu** (kosztorys + timeline), na podstawie `cost-calibration/research.md` — plik `post-flow-analysis/research.md` **nie istnieje** (`refactor-opportunities/research.md:29`). Powiązanie z mapą: **read path szeroki** + **DTO drift** (`repo-map.md:22`, `:108-110`).

**Feature overview:** Użytkownik wypełnia ankietę (Zod + UI) → POST plans / recalculate waliduje wejście → `persist-plan-version` w transakcji tworzy wersję, zapisuje odpowiedzi, uruchamia silnik (filter→schedule→compute), refinement, zapisuje `PlanStageResult` → odczyt przez GET results (assembly DTO) lub loopback `fetchPlanResults` na stronie planu/dashboardu; metadane planu część RSC ładuje bezpośrednio Prisma (`refactor-opportunities/research.md:124-134`).

**Technical debt (top 3):**

| Ryzyko | Opis | Dowód |
|---|---|---|
| **C1 — dryft DTO** | Typ w `plan-results.ts`, składanie inline w `results/route.ts:28-88`, duplikat w calendar export; fetch castuje bez Zod | `refactor-opportunities/research.md:39-40`, `:84-92` |
| **C2 — dual read** | RSC: Prisma dla metadanych/ankiety vs loopback API dla zamrożonych wyników; rozjazd z `lessons.md:5-9` | `refactor-opportunities/research.md:40`, `:124-134` |
| **Luki testowe kontraktu** | Brak testów pustego `stageResults`, brak `fetch-plan-results.test.ts`; blokuje bezpieczne usuwanie loopback | `refactor-opportunities/research.md:48-50`, `:328` |

**Potwierdzenie ast-grep** (źródło: `cost-calibration/research.md`, cytowane w L3): `plan-results.ts` — **13 direct prod / 18 transitive** importerów; `validations/questionnaire.ts` — **12 direct prod / 19 transitive** (`cost-calibration/research.md:224-225` wskazane przez `refactor-opportunities/research.md:111`, `:17-18`). Kod prod `plan-generation/` bez `@prisma/client` (wyjątek: test-fixtures) — ast-grep + `rg` (`cost-calibration/research.md` §3, wpis #6).

Ranking propozycji: **C1 → C2 → C3 → C4**; wszystkie cztery to świadome trade-offy MVP, refactor = ergonomia, nie naprawa niedokumentowanego błędu (`refactor-opportunities/research.md:73-76`, `:297-305`).

---

## 4. Plan refaktoryzacji (L4)

**Wybrana opcja:** inkrementalny refactor **czterech kandydatów C1–C4** w kolejności faz 1→4, bez zmian produktowych i bez migracji schema (`refactor-opportunities/plan.md:3-5`, `:38-39`).

**Docelowy kształt:**

1. Jeden assembler `PlanResultsDto` + Zod + testy kontraktu (C1).
2. Jeden loader metadanych planu dla RSC; wyniki nadal przez `fetchPlanResults` (C2).
3. `investment-state.ts` na kanonicznym domain union, nie `@prisma/client` (C3).
4. Wspólny moduł kalibracji w `plan-generation/calibration/`; seed jako consumer (C4A/4B).

**Świadomie NIE robimy:** usuwanie loopback fetch, freeze-on-write, merge koszt/timeline, merge schematów ankiety form/API, questionnaire preload przez GET results, `depcruise` w CI, zmiana wartości enum/stawek, migracje Prisma (`plan.md:30-39`).

**Fazy (jedna linia + weryfikacja):**

| Faza | Zakres | Weryfikacja |
|---|---|---|
| **1 (C1)** | Extract `assemblePlanResultsDto`, Zod, testy handler + fetch | Auto: lint, test, build:ci · Ręcznie: plan page + dashboard KPI |
| **2 (C2)** | `loadLatestPlanForUser` — 3 RSC | Auto: lint, test, build:ci · Ręcznie: nav, dashboard, ankieta preload |
| **3 (C3)** | Domain union `InvestmentState` | Auto: lint, test, build:ci, depcruise lokalnie · Ręcznie: filtrowanie stanów w ankiecie |
| **4 (C4)** | Shared calibration + seed consumer (4B owner seed) | Auto: parity + golden oracle · Ręcznie: owner `pnpm db:seed`; opcjonalnie E2E risk-04 |

Gate między fazami: manual confirm po zielonych testach auto (`plan.md:43`, `:119`, `:174`, `:223`, `:289`).

---

## 5. Domena wg DDD (L5)

**Ubiquitous language (skrót):**

| Pojęcie | Sens |
|---|---|
| **Ankieta planistyczna** | Wejście do generacji (`01-domain-distillation.md:65`) |
| **Wersja planu** | Snapshot odpowiedzi + wyników po generacji/przeliczeniu (`:72`) |
| **Wynik etapu** | Zamrożony koszt + timing w wersji (`:73`) |
| **Kosztorys orientacyjny** | Nie wiążąca wycena — non-goal ofert (`:74`, `:126-127` PRD) |
| **Stan inwestycji / startowy** | Filtr etapów harmonogramu (`:67-68`, `:129`) |

**Najważniejsze rozjazdy model↔kod:** (1) lessons: domena tylko przez API vs RSC→Prisma; (2) triple `InvestmentState`; (3) DTO składane inline; (4) FR-009 „internet browsing” vs cache DB (`01-domain-distillation.md:160-171`).

**Niezmiennik #1:** **INV-GEN-01** — udana generacja musi dać ≥1 `PlanStageResult` do wyświetlenia; dziś **naruszany** (201/200 przy pustych wynikach, GET 404 „po fakcie”) (`02-invariant-aggregate-refactor.md:47`, `:79-88`).

**Agregat:** **PlanVersion** (kontekst generacji, A2) — pipeline rozproszony między silnik, persist, route read, DTO (`01-domain-distillation.md:120-127`, `:187-189`).

**Anti-Corruption Layer:** przeciek **`@prisma/client`** — typy przez `types/domain.ts` do silnika pure (4 pliki prod) i UI ankiety (4 komponenty) + singleton `prisma` w 13 plikach prod (RSC, API, lib); **24 pliki prod** łącznie (`03-anti-corruption-layer.md:86-115`, `:159`). Docelowo: `src/lib/domain/` + `src/lib/infrastructure/prisma/`; kryterium grep — ORM tylko w adapterze (`03-anti-corruption-layer.md:557`).

---

## 6. Decyzje, które należą do mnie

**BRAK artefaktu** dziennika decyzji właściciela (kto zaakceptował co w sesji). Z dokumentów wynika:

1. **Ranking C1→C4** to propozycja agenta w research — plan L4 ją **przyjmuje** bez alternatywnej opcji (`research.md:247`, `plan.md:3-5`).
2. **Loopback `fetchPlanResults` zostaje** — zamknięte w planie (ryzyko IDOR); research zostawia jako **UNKNOWN** długoterminowo (`plan.md:32`, `research.md:345`).
3. **INV-GEN-01 i ACL Prisma** to osobne plany domenowe (L5) — **nie** wchodzą w fazę C1–C4; kolejność ACL vs C3 nakładają się (`03-anti-corruption-layer.md` fazy ACL-0…6 vs `plan.md` faza 3).
4. **Procedura prod re-seed (C4B) i depcruise w CI** — **UNKNOWN**; merge kodu możliwy bez deploy seed (`plan.md:321`, `research.md:346-347`).
5. **Freeze-on-write, split form/API, merged views** — odrzucone jako scope; oparte na archiwum frame S-11 i lessons — **BRAK artefaktu**, czy właściciel je ponownie otwierał w module 4.

---

*Koniec raportu · szczegóły liczbowe i cytaty plik:linia → artefakty źródłowe.*
