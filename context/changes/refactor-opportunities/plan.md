# Refactor Opportunities Implementation Plan

## Overview

Inkrementalny refactor czterech kandydatów strukturalnych z `research.md`, w kolejności C1→C2→C3→C4. Każda faza jest odwracalna, bez zmian produktowych (freeze-on-write, split form/API schema) i bez migracji schematu DB — wyjątek: owner-only re-seed po fazie 4.

## Current State Analysis

- **C1:** `PlanResultsDto` to typy w `src/lib/plan-results.ts`; składanie inline w `results/route.ts:64-88`; częściowa ekstrakcja notatek w `load-plan-stage-notes.ts`; duplikat mapowania stage w `export-stages-to-calendar.ts:28-75`; brak Zod; `fetch-plan-results.ts:38` castuje JSON.
- **C2:** Trzy RSC powtarzają `prisma.plan.findFirst` z różnymi `select`/`include`: `layout.tsx:17-21`, `dashboard/page.tsx:39-43`, `questionnaire/page.tsx:28-37`. Wyniki planu: loopback `fetchPlanResults` na plan page i dashboard.
- **C3:** `investment-state.ts:1` importuje `InvestmentState` z `@prisma/client`; równoległy Zod enum w `validations/questionnaire.ts:9-17`; `types/domain.ts:1-6` re-eksportuje Prisma bez decoupling.
- **C4:** Stawki w `prisma/seed.ts`; fixtures duplikują dane; guard `calibration-seed-parity.test.ts` + regex parser `parse-seed-calibration.ts`.

### Key Discoveries

- Wszystkie cztery kształty to **świadome decyzje MVP** (S-02, S-09, S-01) — plan poprawia ergonomię, nie koryguje niedokumentowanego błędu.
- Fan-in `plan-results.ts`: 13 direct / 18 transitive — extract assembler **nie zmienia** fan-in typów.
- Loopback fetch centralizuje ownership (IDOR) w GET handler — **zostaje** w tym planie.
- CI: `pnpm lint` → `pnpm test` → `pnpm build:ci`; e2e z seed; **depcruise poza CI**.

## Desired End State

1. **Jeden assembler** `PlanResultsDto` w `src/lib/plan/` + Zod schema + testy kontraktu (GET + fetch client).
2. **Jeden loader** metadanych planu dla RSC (parametryzowany include/select); wyniki nadal przez `fetchPlanResults`.
3. **`investment-state.ts`** zależy od kanonicznego domain union, nie od `@prisma/client`.
4. **Wspólny moduł kalibracji** w `src/lib/plan-generation/calibration/` — fixtures i seed czytają te same definicje; parity test porównuje shared ↔ seed (parser regex opcjonalnie usunięty po fazie 4B).

**Weryfikacja końcowa:** `pnpm lint`, `pnpm test`, `pnpm build:ci` zielone; E2E risk-04 i risk-07 bez regresji (lokalnie lub CI).

## What We're NOT Doing

- Usuwanie loopback `fetchPlanResults` / wspólny RSC loader wyników (ryzyko IDOR; osobna change).
- Zmiana freeze-on-write (przeliczanie na read).
- Merge `PlanCostTable` + `PlanTimeline` (frame S-11).
- Merge `questionnaireFormSchema` + `questionnaireInputsSchema` (lessons.md).
- Questionnaire preload przez GET results API.
- `depcruise` w CI (opcjonalne follow-up poza tym planem).
- Zmiana wartości enum `InvestmentState` ani stawek kalibracji (tylko reorganizacja kodu).
- Migracje Prisma / nowe kolumny.

## Implementation Approach

Fazy sekwencyjne; każda kończy się zielonymi testami. Faza N+1 nie startuje przed manual confirm poprzedniej (jeśli manual verification wymagane). C1 odblokowuje spójniejsze testy DTO; C2 nie dotyka DTO; C3 niezależna od C1/C2; C4 na końcu — najwyższy koszt i zależność od owner re-seed w 4B.

## Critical Implementation Details

**Assembler (C1):** Funkcja pure przyjmuje już załadowane dane (plan id, latest version ze `stageResults` + `responses`, mapa `constructionStage`, `stageNotes`, pola refinement z wersji) — **nie** woła Prisma. Route zostaje odpowiedzialny za auth, query i statusy HTTP.

**Loader (C2):** Questionnaire wymaga `include: { versions: { take: 1, include: { responses: true } } }`; layout tylko `{ id }`; dashboard `{ id, createdAt }`. Jeden moduł z parametrem `variant: 'nav' | 'dashboard' | 'questionnaire'` (lub równoważne options) — **nie** upraszczać do jednego query kosztem questionnaire.

**Domain union (C3):** Kanoniczne wartości = te z `investmentStateSchema` w `validations/questionnaire.ts`. `types/domain.ts` eksportuje `DomainInvestmentState` jako `z.infer<typeof investmentStateSchema>` (import type-only z validations lub wydzielony const array w domain — implementer wybiera bez duplikacji literałów).

**Calibration (C4):** Seed (`prisma/seed.ts`) nie ma aliasu `@/`. Import shared module: ścieżka względna `../src/lib/plan-generation/calibration/...` lub skrypt seed przez `tsx` z tsconfig paths — zweryfikować lokalnie przed merge. Faza 4B wymaga **owner** `pnpm db:seed` na środowiskach z istniejącą DB tylko jeśli seed logic się zmienia (same values → brak wpływu na runtime).

---

## Phase 1: DTO assembler + contract validation (C1)

### Overview

Wyekstrahować składanie `PlanResultsDto` z route do pure modułu; dodać Zod schema i testy kontraktu (handler + fetch client). Zachowanie HTTP identyczne.

### Changes Required

#### 1. Assembler module

**File:** `src/lib/plan/assemble-plan-results-dto.ts` (new)

**Intent:** Pure function mapująca załadowane dane DB na `PlanResultsDto` — logika przeniesiona z `results/route.ts:54-88`.

**Contract:** Export `assemblePlanResultsDto(input: AssemblePlanResultsInput): PlanResultsDto` gdzie input zawiera: `planId`, latest version (`stageResults`, `responses`, `refinementApplied`, `benchmarkFetchedAt`, `benchmarkSourceName`), `stageDefsBySlug`, `stageNotes`.

#### 2. Zod schema

**File:** `src/lib/validations/plan-results.ts` (new)

**Intent:** Runtime contract dla JSON wyników planu; wzorzec jak `validations/questionnaire.ts`.

**Contract:** `planResultsSchema` + `export type PlanResultsDto = z.infer<typeof planResultsSchema>`. Zaktualizować `src/lib/plan-results.ts` — re-export typu ze schema **lub** zastąpić plik re-exportem (zachować ścieżkę importu `@/lib/plan-results` dla 13 importerów).

#### 3. GET results route

**File:** `src/app/api/plans/[planId]/results/route.ts`

**Intent:** Route = auth + Prisma load + HTTP; delegacja assembly do `assemblePlanResultsDto`; opcjonalnie `planResultsSchema.parse(payload)` przed `NextResponse.json`.

**Contract:** Brak zmian statusów 401/404/500 ani komunikatów błędów.

#### 4. Fetch client

**File:** `src/lib/api/fetch-plan-results.ts`

**Intent:** Zastąpić cast `as PlanResultsDto` przez `planResultsSchema.safeParse`; przy failure zwrócić `{ status: "error" }`.

**Contract:** Sygnatura `FetchPlanResultsResult` bez zmian.

#### 5. Contract tests

**Files:** `src/lib/api/plans-route-handlers.test.ts`, `src/lib/api/fetch-plan-results.test.ts` (new)

**Intent:** Uzupełnić luki z research: test GET gdy `stageResults` puste (`404`, `"Brak wyników dla tego planu"`); asercje `totalCost`, `refinementApplied`, `benchmarkAsOf`, `benchmarkSource` na 200; unit testy fetch (401/404/error/ok) z mock `fetch`.

**Contract:** Istniejące testy ownership (Risk #1) muszą pozostać zielone.

### Success Criteria

#### Automated Verification

- `pnpm lint`
- `pnpm test`
- `pnpm typecheck` (jeśli osobny skrypt w package.json)
- `pnpm build:ci`

#### Manual Verification

- `/moj-plan/:id` — kosztorys i timeline renderują te same dane co przed refactorem
- Dashboard snapshot card — KPI bez regresji

**Implementation Note:** Po zielonych automated — manual verify przed fazą 2.

---

## Phase 2: Shared plan metadata loader (C2)

### Overview

Wyekstrahować powtarzające się `prisma.plan.findFirst` z RSC do jednego modułu. **Nie** zmieniać `fetchPlanResults` ani questionnaire preload shape.

### Changes Required

#### 1. Loader module

**File:** `src/lib/plan/load-latest-plan-for-user.ts` (new)

**Intent:** Jedno miejsce dla zapytań „najnowszy plan użytkownika” z wariantami query.

**Contract:** Export funkcji z parametrem wariantu:
- `'nav'` → `{ id }` (layout)
- `'dashboard'` → `{ id, createdAt }`
- `'questionnaire'` → plan + latest version + responses (jak dziś `questionnaire/page.tsx:28-37`)

Zwraca `null` gdy brak planu.

#### 2. RSC call sites

**Files:** `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/(app)/questionnaire/page.tsx`

**Intent:** Zamienić inline Prisma na loader; zachować identyczne zachowanie redirect/render.

**Contract:** Brak zmian w URL, copy PL, ani w wywołaniu `fetchPlanResults` na dashboard.

#### 3. Loader tests

**File:** `src/lib/plan/load-latest-plan-for-user.test.ts` (new)

**Intent:** Mock Prisma; assert poprawne `where`/`orderBy`/`select`/`include` per wariant.

**Contract:** Co najmniej 3 przypadki (nav, dashboard, questionnaire) + brak planu.

### Success Criteria

#### Automated Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification

- Nawigacja header — link do ostatniego planu działa
- Dashboard — pusty stan vs stan z planem
- Ankieta — edycja wczytuje poprzednie odpowiedzi

**Implementation Note:** Po zielonych automated — manual verify przed fazą 3.

---

## Phase 3: Decouple investment-state from Prisma (C3)

### Overview

Kanoniczny typ domenowy dla stanów inwestycji bez importu `@prisma/client` w `investment-state.ts`. **Bez zmiany wartości enum.**

### Changes Required

#### 1. Domain type

**File:** `src/lib/types/domain.ts`

**Intent:** Dodać kanoniczny `DomainInvestmentState` (string union zgodny z `investmentStateSchema`). Zachować istniejące re-exporty Prisma dla modeli silnika — nie usuwać w tej fazie.

**Contract:** Wartości: `FROM_SCRATCH` | `FOUNDATIONS` | `OPEN_SHELL` | `CLOSED_SHELL` | `DEVELOPER` — identyczne z Prisma enum i Zod.

#### 2. investment-state module

**File:** `src/lib/investment-state.ts`

**Intent:** Zamienić `import type { InvestmentState } from "@prisma/client"` na `DomainInvestmentState` (lub re-export z domain).

**Contract:** Publiczne API funkcji bez zmian sygnatur runtime; `investmentStateOrder` nadal wyczerpujący.

#### 3. Verification

**Files:** istniejące testy — bez zmian oczekiwanych wartości

**Intent:** `investment-state.test.ts`, `questionnaire-inputs.test.ts`, `plans-route-handlers.test.ts` (recalculate 400) — wszystkie zielone.

**Contract:** `pnpm depcruise` lokalnie — brak nowych naruszeń; `investment-state.ts` nie importuje `@prisma/client`.

### Success Criteria

#### Automated Verification

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`
- `pnpm depcruise` (lokalnie)

#### Manual Verification

- Ankieta krok 1 — filtrowanie stanów start/docelowy działa (matrix FROM_SCRATCH→DEVELOPER, FOUNDATIONS→OPEN_SHELL)

**Implementation Note:** Po zielonych automated — manual verify przed fazą 4.

---

## Phase 4: Shared calibration definitions (C4)

### Overview

Dwuetapowo: (4A) wspólny moduł + fixtures; (4B) seed jako consumer. Wartości stawek **bez zmian** — tylko single source of truth w kodzie.

### Changes Required

#### 1. Shared calibration module (4A)

**Files:** `src/lib/plan-generation/calibration/stage-rate-defs.ts`, `src/lib/plan-generation/calibration/modifier-defs.ts` (new — nazwy implementera mogą być skrócone jeśli spójne)

**Intent:** Przenieść definicje skopiowane verbatim z obecnego seed/fixtures.

**Contract:** Eksport struktur używanych przez `full-stages-calibration.ts` i `calibration-modifier-defs.ts`.

#### 2. Fixtures refactor (4A)

**Files:** `src/lib/plan-generation/test-fixtures/full-stages-calibration.ts`, `calibration-modifier-defs.ts`

**Intent:** Import z shared module zamiast lokalnych duplikatów.

**Contract:** Golden oracle i `generate-plan-results.test.ts` — identyczne wyniki numeryczne.

#### 3. Parity test update (4A)

**File:** `src/lib/plan-generation/calibration-seed-parity.test.ts`

**Intent:** Dodać asercję shared module ↔ parsed seed (obok istniejącego fixtures ↔ seed).

**Contract:** Wszystkie istniejące asercje parity nadal przechodzą.

#### 4. Seed consumer (4B)

**File:** `prisma/seed.ts`

**Intent:** Import stage/modifier defs ze shared module (relative path); usunąć zduplikowane literały tam gdzie bezpieczne.

**Contract:** `pnpm db:seed` działa lokalnie; seed idempotentny jak dziś.

#### 5. Parser deprecation (4B, optional)

**File:** `src/lib/plan-generation/test-fixtures/parse-seed-calibration.ts`

**Intent:** Jeśli seed importuje shared — parity może porównywać shared ↔ seed bez regex; parser usunąć **tylko** gdy testy przechodzą bez niego.

**Contract:** Nie łamać reguły „nie importuj seed w Vitest” — shared module jest w `src/lib/`, nie seed.

### Success Criteria

#### Automated Verification

- `pnpm lint`
- `pnpm test` (w tym `calibration-seed-parity.test.ts`, golden oracle)
- `pnpm build:ci`
- `pnpm depcruise` (lokalnie)

#### Manual Verification

- Owner: `pnpm db:seed` po 4B na lokalnej Docker Postgres — potwierdzenie braku błędów seed
- Opcjonalnie lokalnie: `pnpm test:e2e:risk-04` jeśli env skonfigurowane

**Implementation Note:** Faza 4B wymaga owner confirm seed na DB przed uznaniem change za complete.

---

## Testing Strategy

### Unit Tests

- **C1:** assembler pure (opcjonalny `assemble-plan-results-dto.test.ts`), rozszerzone handler tests, nowy `fetch-plan-results.test.ts`
- **C2:** `load-latest-plan-for-user.test.ts`
- **C3:** istniejące — regression only
- **C4:** parity + golden oracle — regression; brak zmiany oczekiwanych liczb

### Integration / E2E

- Risk-04 (generate golden path) — indirect guard C1 + C4
- Risk-07 (stage notes) — indirect guard C1 DTO `stageNotes`

### Manual Testing Steps

1. Plan page — koszty, timeline, notatki
2. Dashboard — snapshot gdy plan istnieje
3. Ankieta — edycja z preload
4. Po C4 — owner seed lokalnie

## Performance Considerations

Brak oczekiwanego wpływu — refactor strukturalny bez dodatkowych query. Loader C2 nie dodaje round-tripów.

## Migration Notes

- Brak migracji Prisma.
- C4B: owner `pnpm db:seed` na środowiskach dev/staging/prod według procedury ownera (procedura prod **UNKNOWN** w research — nie blokuje merge kodu, blokuje deploy seed).

## References

- Research: `context/changes/refactor-opportunities/research.md`
- Source analysis: `context/changes/cost-calibration/research.md`
- Lessons: `context/foundation/lessons.md`
- Archive S-01: `context/archive/2026-06-09-cost-calibration/reviews/impl-review.md` (F3)
- Handler tests: `src/lib/api/plans-route-handlers.test.ts`

## Progress

### Phase 1: DTO assembler + contract validation (C1)

#### Automated

- [x] 1.1 `pnpm lint` — 9c9ffdc
- [x] 1.2 `pnpm test` — 9c9ffdc
- [x] 1.3 `pnpm build:ci` — 9c9ffdc

#### Manual

- [ ] 1.4 Plan page — kosztorys i timeline bez regresji
- [ ] 1.5 Dashboard snapshot — KPI bez regresji

### Phase 2: Shared plan metadata loader (C2)

#### Automated

- [x] 2.1 `pnpm lint` — 8946004
- [x] 2.2 `pnpm test` — 8946004
- [x] 2.3 `pnpm build:ci` — 8946004

#### Manual

- [ ] 2.4 Header nav — link do ostatniego planu
- [ ] 2.5 Dashboard — pusty vs z planem
- [ ] 2.6 Ankieta — preload odpowiedzi

### Phase 3: Decouple investment-state from Prisma (C3)

#### Automated

- [x] 3.1 `pnpm lint`
- [x] 3.2 `pnpm test`
- [x] 3.3 `pnpm build:ci`
- [x] 3.4 `pnpm depcruise` (lokalnie)

#### Manual

- [ ] 3.5 Ankieta krok 1 — filtrowanie stanów inwestycji

### Phase 4: Shared calibration definitions (C4)

#### Automated

- [ ] 4.1 `pnpm lint`
- [ ] 4.2 `pnpm test`
- [ ] 4.3 `pnpm build:ci`
- [ ] 4.4 `pnpm depcruise` (lokalnie)

#### Manual

- [ ] 4.5 Owner: `pnpm db:seed` lokalnie po 4B
- [ ] 4.6 Opcjonalnie: `pnpm test:e2e:risk-04` lokalnie
