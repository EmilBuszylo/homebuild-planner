# Timeline Notes (S-03) Implementation Plan

## Overview

Dodać **notatki użytkownika** i flagę **„ważny etap”** (`isPinned`) przypięte do wierszy harmonogramu na stronie planu — FR-007. Persystencja **per plan + `stageSlug`** (nie per `PlanVersion`), żeby notatki przetrwały przeliczenie kosztorysu. Wymaga nowego modelu Prisma i migracji (**owner-only** `pnpm db:migrate`). Bez przypomnień / kalendarza (parked w roadmapie).

## Current State Analysis

- **FR-007** (nice-to-have): notatki lub przypięte zdarzenia na etapach timeline — MVP: tekst + pin, bez dat przypomnienia.
- **Plan page** (`src/app/(app)/plan/[planId]/page.tsx`): RSC ładuje `fetchPlanResults` → `PlanCostTable` + `PlanTimeline` (client).
- **`PlanResultsDto`** (`src/lib/plan-results.ts`): `stages[]` ze `stageSlug`, kosztem, `startDay`, `durationDays` — **brak** notatek użytkownika.
- **`GET /api/plans/[planId]/results`**: ownership `plan.userId === user.id`; join `PlanStageResult` z najnowszego `PlanVersion` — wzorzec IDOR do skopiowania.
- **`PlanStageResult`** jest wersjonowany; **`persistPlanVersionWithResults`** tworzy nową wersję przy recalculate — notatki **nie mogą** żyć na `PlanVersion`.
- **`PlanTimeline`** (`plan-timeline.tsx`): wiersze etapów desktop (etykieta + wykres) i mobile; coaching markery jako `Popover` — wzorzec UI dla notatek.
- **Brak** `PlanStageNote` / podobnego w `schema.prisma`.
- **Coaching notes** (`ConstructionStage.coachingNote`) to treść systemowa — osobna semantyka; nie mieszać z notatkami użytkownika (lekcja z archiwum S-08).

### Key Discoveries:

- Domain API przez Route Handlers + Prisma (`lessons.md`) — nie Supabase table client.
- Agent **edytuje tylko** `schema.prisma`; **nie** tworzy plików w `prisma/migrations/`; **stop** po Phase 1 do owner `pnpm db:migrate`.
- IDOR: istniejący harness `plans-route-handlers.test.ts` + `e2e/risk-01-idor-foreign-plan.spec.ts`.
- Po recalculate lista `stageSlug` może się zmienić (np. `garage_gate` znika) — notatki dla nieistniejących slugów **pozostają w DB**, ale **nie są wyświetlane** (brak wiersza w timeline).

## Desired End State

1. Tabela `PlanStageNote` w Prisma: `(planId, stageSlug)` unique, `body`, `isPinned`, `updatedAt`.
2. `GET /api/plans/[planId]/results` zwraca `stageNotes: Record<stageSlug, { body, isPinned, updatedAt }>` tylko dla slugów obecnych w bieżącej wersji.
3. `PUT /api/plans/[planId]/stage-notes` — upsert / delete (pusty body + `isPinned: false` → usunięcie wiersza); walidacja Zod; 404 gdy plan nie należy do usera lub slug nie jest w bieżącym harmonogramie.
4. UI: na każdym wierszu harmonogramu — ikona pin + ikona notatki (`Popover` z `Textarea`, przycisk „Zapisz”); wizualne wyróżnienie przypiętych etapów.
5. Vitest: ownership 401/404, slug spoza planu 400, happy path upsert.
6. E2E: `e2e/risk-07-stage-notes.spec.ts` — zapis notatki, reload strony, treść widoczna.
7. `pnpm test`, `pnpm lint`, `pnpm build:ci` zielone; owner po migrate: manual smoke na `/moj-plan/:id`.

## What We're NOT Doing

- Daty przypomnienia / push / email (roadmap Parked).
- Notatki globalne per użytkownik (poza planem) — tylko **per plan**.
- Edycja notatek w kosztorysie (`PlanCostTable`) — tylko harmonogram (FR-007 timeline).
- Notatki wersjonowane z `PlanVersion` / historia wersji notatek.
- Współdzielone workspace / multi-user na planie.
- Zmiany silnika kalkulacji, ankiety, seed etapów.
- Automatyczne czyszczenie osieroconych notatek po recalculate (opcjonalne — parked).

## Implementation Approach

1. **Schema** — `PlanStageNote` + relacja `Plan.stageNotes`; owner migrate przed API.
2. **API** — rozszerzyć GET results o mapę notatek; osobny PUT do zapisu (mutacje poza GET).
3. **UI** — komponent `StageNoteControls` w `PlanTimeline`; optimistic UI opcjonalnie; minimum: zapis po „Zapisz”, pin natychmiast.
4. **Testy** — handler tests w stylu `plans-route-handlers.test.ts`; E2E risk-07.
5. **Domknięcie** — `change.md` → `implemented`, manual smoke.

## Critical Implementation Details

### Decyzje zamknięte (roadmap → plan)

| # | Decyzja | Wybór |
|---|---------|-------|
| 1 | Persystencja | **Per `Plan` + `stageSlug`** (nie per wersja) |
| 2 | Przypomnienia | **Brak** — tylko tekst (MVP) |
| 3 | „Pinned events” z FR-007 | **`isPinned: boolean`** na tym samym wierszu co notatka |
| 4 | Walidacja `stageSlug` | Tylko slugi z **najnowszego** `PlanVersion.stageResults` |
| 5 | Pusty stan | `body === ""` **i** `isPinned === false` → **delete** wiersza (brak rekordu) |
| 6 | Limit tekstu | **2000** znaków (Zod `.max(2000)`) |
| 7 | Osierocone notatki | Zostają w DB; niewidoczne dopóki etap nie wróci po recalculate |

### Model Prisma (docelowy)

```prisma
model PlanStageNote {
  id        String   @id @default(cuid())
  stageSlug String
  body      String   @default("")
  isPinned  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Cascade)
  planId String

  @@unique([planId, stageSlug])
  @@index([planId])
}
```

Dodać `stageNotes PlanStageNote[]` do `Plan`. FK pod relacją (`lessons.md`).

### Kontrakt API

**Rozszerzenie `PlanResultsDto`:**

```typescript
export type PlanStageNoteDto = {
  body: string;
  isPinned: boolean;
  updatedAt: string; // ISO
};

// PlanResultsDto + stageNotes: Record<string, PlanStageNoteDto>
```

**`PUT /api/plans/[planId]/stage-notes`**

Request body (Zod):

```typescript
{
  stageSlug: string; // min 1
  body: string;      // max 2000, default ""
  isPinned: boolean;
}
```

Responses: `200` z `{ stageSlug, body, isPinned, updatedAt }`; `204` lub `200 { deleted: true }` po usunięciu; `400` invalid slug / validation; `401` / `404` auth/ownership.

Wspólna funkcja `loadPlanForUser(planId, userId)` lub `assertPlanOwner` — reuse w results + stage-notes (DRY w `src/lib/api/plan-access.ts` opcjonalnie).

## Phase 1: Schema Prisma (`PlanStageNote`)

### Overview

Dodać model domenowy i zatrzymać implementację do owner migrate.

### Changes Required:

#### 1. Prisma schema

**File**: `prisma/schema.prisma`

**Intent**: Model `PlanStageNote` + relacja na `Plan` jak w Critical Implementation Details.

**Contract**: `onDelete: Cascade` z `Plan`; `@@unique([planId, stageSlug])`.

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` passes (bez applied migration lokalnie u agenta)

#### Manual Verification:

- Owner: `pnpm db:migrate` — migracja stosuje się bez błędów
- Owner: `pnpm db:studio` — tabela `PlanStageNote` widoczna (opcjonalnie)

**Implementation Note**: Agent **STOP** po Phase 1 do potwierdzenia ownera. **Nie** uruchamiać `db:migrate`, **nie** pisać `prisma/migrations/`.

---

## Phase 2: API i walidacja

### Overview

Endpoint zapisu + rozszerzenie GET results o notatki; Zod; ownership.

### Changes Required:

#### 1. Zod schema

**File**: `src/lib/validations/plan-stage-note.ts`

**Intent**: `upsertPlanStageNoteSchema` — `stageSlug`, `body` (max 2000), `isPinned`.

#### 2. Domain helpers

**File**: `src/lib/plan/load-plan-stage-notes.ts` (new)

**Intent**: `loadStageNotesForPlan(planId, activeSlugs: string[])` → mapa tylko dla slugów w `activeSlugs`.

**File**: `src/lib/plan/upsert-plan-stage-note.ts` (new)

**Intent**: Upsert lub delete gdy pusty; walidacja slug ∈ activeSlugs.

#### 3. PUT route

**File**: `src/app/api/plans/[planId]/stage-notes/route.ts`

**Intent**: `PUT` handler: auth → ownership → parse body → upsert → JSON.

#### 4. Extend GET results

**File**: `src/app/api/plans/[planId]/results/route.ts`

**Intent**: Po załadowaniu `stageResults`, dołączyć `stageNotes` z `loadStageNotesForPlan`.

**File**: `src/lib/plan-results.ts`

**Intent**: Rozszerzyć typy DTO.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes

#### Manual Verification:

- — (none — testy w Phase 4)

**Implementation Note**: Wymaga owner `pnpm db:migrate` z Phase 1.

---

## Phase 3: UI harmonogramu

### Overview

Kontrolki pin + notatka na wierszach `PlanTimeline`; polski copy.

### Changes Required:

#### 1. Stage note controls

**File**: `src/components/plan/stage-note-controls.tsx` (new, client)

**Intent**: Przycisk pin (`aria-pressed`), ikona notatki → `Popover` + `Textarea` + „Zapisz” / „Anuluj”; wywołanie `fetch PUT` z cookies; komunikat błędu PL.

**Contract**: Props: `planId`, `stageSlug`, `initialNote?: PlanStageNoteDto`, `onSaved(note)`.

#### 2. Plan timeline integration

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Przekazać `planId` + `results.stageNotes`; render `StageNoteControls` w kolumnie etykiet (desktop) i nad wykresem (mobile); klasa wizualna dla `isPinned` (np. `border-l-2 border-amber-500`).

#### 3. Plan page wiring

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Przekazać `planId` do `PlanTimeline` (już ma `results.planId`).

#### 4. Copy PL

**File**: `src/lib/copy/orientational.ts` lub lokalne stałe w komponencie

**Intent**: Etykiety: „Ważny etap”, „Notatka”, „Zapisz notatkę”, placeholder „Kontakt z wykonawcą, ustalenia…”.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` / `pnpm typecheck` pass

#### Manual Verification:

- Wiersz harmonogramu: pin przełącza się i utrzymuje po reload
- Notatka zapisuje się i jest widoczna po odświeżeniu strony
- Etap przypięty wizualnie odróżnia się od pozostałych

**Implementation Note**: Pauza na manual UI przed Phase 4.

---

## Phase 4: Testy Vitest

### Overview

Handler tests ownership + walidacja; regresja GET results.

### Changes Required:

#### 1. Route handler tests

**File**: `src/lib/api/stage-notes-route-handlers.test.ts` (new)

**Intent**: Wzorzec `plans-route-handlers.test.ts`:
- 401 anonymous PUT
- 404 user B → plan user A
- 400 `stageSlug` spoza bieżących etapów
- 200 upsert + delete gdy puste
- GET results zawiera `stageNotes` po zapisie (mock prisma lub integration-style mock tx)

#### 2. Validation unit test

**File**: `src/lib/validations/plan-stage-note.test.ts` (new)

**Intent**: `body` > 2000 odrzucone; pusty slug odrzucony.

#### 3. Regresja

**Files**: istniejące testy importujące `PlanResultsDto` — zaktualizować fixture jeśli wymagane (`stageNotes: {}` default).

### Success Criteria:

#### Automated Verification:

- `pnpm test` passes
- `pnpm build:ci` passes

#### Manual Verification:

- — (none)

---

## Phase 5: E2E i domknięcie

### Overview

Nowy scenariusz Playwright + owner smoke; `change.md` → `implemented`.

### Changes Required:

#### 1. E2E stage notes

**File**: `e2e/risk-07-stage-notes.spec.ts` (new)

**Intent**: Setup jak risk-04 (`generate-user.setup.ts`); POST plan → `/moj-plan/:id` → otwórz notatkę na pierwszym etapie → wpisz tekst → zapisz → reload → `expect` tekst widoczny. Opcjonalnie: toggle pin.

**File**: `package.json`

**Intent**: Skrypt `test:e2e:risk-07` (opcjonalnie, jak risk-04).

#### 2. Dokumentacja test-plan (opcjonalnie, minimal)

**File**: `context/foundation/test-plan.md`

**Intent**: Jedna linia w tabeli ryzyk: #7 Stage notes → plik + handler test (jeśli owner akceptuje rozszerzenie test-plan w tym slice).

### Success Criteria:

#### Automated Verification:

- `pnpm test:e2e:risk-07` passes (lokalnie + CI po merge, jeśli secrets skonfigurowane)

#### Manual Verification:

- Owner: pin + notatka na 2 różnych etapach; recalculate planu → notatki na wspólnych slugach zostają
- Owner: plan bez notatek — brak regresji UI

**Implementation Note**: Zaktualizować `change.md` → `implemented` po Phase 5.

---

## Testing Strategy

### Unit Tests:

- Zod `plan-stage-note` — max length, required fields
- `upsert-plan-stage-note` — delete on empty (pure helper jeśli wydzielony)

### Integration Tests:

- `stage-notes-route-handlers.test.ts` — IDOR, slug validation
- Regresja `plans-route-handlers.test.ts` GET results shape

### Manual Testing Steps:

1. Zapis notatki + reload — treść persisted
2. Pin bez tekstu — gwiazdka aktywna, popover pusty OK
3. Recalculate z tym samym zestawem etapów — notatki bez zmian
4. Recalculate zmieniający zestaw (np. `garage_spots: 0`) — notatka dla znikniętego etapu niewidoczna
5. User B nie może PUT notatki do planu user A (curl / E2E risk-01 regresja)

## Performance Considerations

- Jedno `findMany` notatek per GET results (`where: { planId, stageSlug: { in: slugs } }`) — O(liczba etapów) ≤ 20.
- PUT pojedynczy wiersz — bez batch w MVP.

## Migration Notes

- **Owner:** `pnpm db:migrate` po merge Phase 1 (agent nie tworzy plików migracji).
- Istniejące plany: `stageNotes` puste `{}` — brak backfill.
- Recalculate **nie kopiuje** notatek — żyją na `Plan`, nie na wersji.

## References

- PRD FR-007: `context/foundation/prd.md`
- Roadmap S-03: `context/foundation/roadmap.md`
- Lessons: `context/foundation/lessons.md` (Prisma migrate owner-only, API routes, FK grouping)
- Wzorzec IDOR: `src/lib/api/plans-route-handlers.test.ts`, `e2e/risk-01-idor-foreign-plan.spec.ts`
- Wzorzec UI Popover: `src/components/plan/plan-timeline.tsx` (coaching markers)
- Archiwum coaching vs user notes: `context/archive/2026-05-28-horizontal-timeline-coaching/research.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema Prisma (`PlanStageNote`)

#### Automated

- [x] 1.1 `pnpm db:generate` passes after schema change — a96ab23

#### Manual

- [x] 1.2 Owner: `pnpm db:migrate` applies cleanly

### Phase 2: API i walidacja

#### Automated

- [x] 2.1 `pnpm lint` passes — 452df7e
- [x] 2.2 `pnpm typecheck` passes — 452df7e

#### Manual

- [x] 2.3 — (none)

### Phase 3: UI harmonogramu

#### Automated

- [x] 3.1 `pnpm lint` and `pnpm typecheck` pass after UI changes — cebac7e

#### Manual

- [ ] 3.2 Pin + note save visible on timeline; persists after reload

### Phase 4: Testy Vitest

#### Automated

- [x] 4.1 `pnpm test` passes (stage-notes handlers + validation)
- [x] 4.2 `pnpm build:ci` passes

#### Manual

- [ ] 4.3 — (none)

### Phase 5: E2E i domknięcie

#### Automated

- [ ] 5.1 `pnpm test:e2e:risk-07` passes

#### Manual

- [ ] 5.2 Owner smoke: notes survive recalculate for shared stage slugs
