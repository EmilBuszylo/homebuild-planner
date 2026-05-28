---
change_id: rate-limit-enforcement
title: Limit przeliceń na użytkownika (S-06)
status: draft
created: 2026-05-28
---

## Overview

Wdrażamy NFR/FR z PRD: **„System ogranicza liczbę pełnych przeliczeń planu na użytkownika w zdefiniowanym limicie”**. Ma to chronić koszt operacyjny generowania i utrzymać UX bez nagłych spadków wydajności.

Zakładamy MVP-scope: prosta, przewidywalna reguła + czytelny komunikat w UI.

## Current State Analysis

- Generowanie planu:
  - `POST /api/plans` tworzy plan + `PlanVersion(1)` i zapisuje wyniki.
  - Jeśli plan już istnieje → `409` i redirect w UI.
- Przeliczenie:
  - `POST /api/plans/[planId]/recalculate` tworzy nową `PlanVersion` i wyniki.
- Brak rate limitu per-user.
- UI formularza ankiety (`src/components/questionnaire/questionnaire-form.tsx`) pokazuje komunikat z `data.error`.

## Desired End State

1. `POST /api/plans/[planId]/recalculate` odmawia przeliczenia po przekroczeniu limitu (HTTP `429`).
2. Limit jest konfigurowalny (env) i ma sensowne defaulty na dev.
3. UI pokazuje jasny komunikat i nie gubi użytkownika (bez silent fail).
4. Limit liczymy po stronie serwera na podstawie istniejących danych (MVP: bez nowej tabeli).
5. Reguła jest deterministyczna i opisana w `context/changes/rate-limit-enforcement/change.md`.

## Key Decisions (MVP)

### D1: Jaka liczba i jakie okno?

**Bloker z roadmapy:** potrzebujemy konkretnej liczby. Implementacja zakłada konfigurację:

- `PLAN_RECALC_LIMIT` (np. 3)
- `PLAN_RECALC_WINDOW_HOURS` (np. 24)

Plan jest gotowy do wdrożenia po ustawieniu wartości (albo zaakceptowaniu defaultów na MVP).

### D2: Czy startowe wygenerowanie planu liczy się do limitu?

Propozycja MVP:
- Przeliczenia (`recalculate`) podlegają limitowi.
- Startowe wygenerowanie (`POST /api/plans`) jest zawsze dozwolone (bo i tak jest max 1 plan) i **nie** zużywa limitu.

Alternatywa (łatwa do zmiany w kodzie): `POST /api/plans` też liczy się jako 1 w tym samym oknie.

## Implementation Approach

### Liczenie bez nowej tabeli

W transakcji w `POST /api/plans/[planId]/recalculate` robimy:

- `cutoff = now - windowHours`
- `count = tx.planVersion.count({ where: { createdAt: { gte: cutoff }, plan: { userId } } })`
- jeśli `count >= limit` → `429` + payload `{ error, limit, windowHours, retryAfterSeconds? }`

**Concurrency note (MVP):** przy dwóch równoległych requestach można przekroczyć limit o 1. To akceptowalne dla MVP; hard-guarantee wymagałby dedykowanego licznika z blokadą w DB.

### API contract

Dla `429` zwracamy polski komunikat:
- `error`: np. „Zbyt wiele przeliczeń w krótkim czasie. Spróbuj ponownie później.”
- `retryAfterSeconds` (opcjonalnie, jeśli policzymy z najstarszej `PlanVersion` w oknie)

### UI

`QuestionnaireForm` obsługuje `429` i ustawia `serverError` na message z API (fallback do domyślnego).

## Phase 1: Policy & server enforcement

### Overview

Wprowadzić helper do odczytu konfiguracji oraz enforcement w `recalculate` (i opcjonalnie w `POST /api/plans`).

### Changes Required

1. **Config + helper**
   - **New**: `src/lib/rate-limit/plan-recalc.ts`
   - Odczyt `PLAN_RECALC_LIMIT` i `PLAN_RECALC_WINDOW_HOURS` (parse int, fallback).
   - Funkcja `checkPlanRecalcLimit(tx, userId)` → `{ allowed, retryAfterSeconds?, limit, windowHours }`

2. **Enforce in recalculate**
   - **File**: `src/app/api/plans/[planId]/recalculate/route.ts`
   - Po weryfikacji `plan.userId`, przed generacją nowej wersji:
     - wywołanie helpera i `return 429` gdy `allowed=false`.

3. **(Optional) Enforce in create**
   - **File**: `src/app/api/plans/route.ts`
   - Jeśli wybierzemy wariant D2-alt (create liczy się do limitu): analogiczne sprawdzenie przed `persistPlanVersionWithResults`.

### Success Criteria

#### Automated

- `pnpm lint` passes
- `pnpm build:ci` passes

#### Manual

- Po przekroczeniu limitu `POST .../recalculate` zwraca `429` i JSON z `error`

## Phase 2: UX & copy

### Overview

Użytkownik dostaje jasny komunikat w ankiecie, bez redirectów i bez „cichego” błędu.

### Changes Required

1. **UI handling**
   - **File**: `src/components/questionnaire/questionnaire-form.tsx`
   - Obsłużyć `res.status === 429` → `setServerError(data.error ?? ...)`

2. **Copy tuning**
   - Ustalić finalną treść `error` w route handlerze (krótka, po polsku).
   - (Opcjonalnie) dopisać w JSON `retryAfterSeconds` i w UI wyświetlać np. „Spróbuj ponownie za ok. X min”.

### Success Criteria

#### Automated

- `pnpm lint` passes
- `pnpm build:ci` passes

#### Manual

- UI pokazuje komunikat po `429` i nie „gubi” stanu formularza

## Phase 3: Documentation & roadmap sync

### Overview

Utrwalenie decyzji i wartości limitu w artefaktach.

### Changes Required

1. **Change notes**
   - `context/changes/rate-limit-enforcement/change.md`:
     - dopisać przyjętą liczbę limitu + okno
     - dopisać czy create liczy się do limitu (D2)

2. **Roadmap**
   - `context/foundation/roadmap.md`:
     - S-06: status z `blocked` → `done` po wdrożeniu i manual checku

### Success Criteria

#### Manual

- W `change.md` jest zapisana finalna decyzja limitu

---

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Policy & server enforcement

#### Automated

- [x] 1.1 `pnpm lint` passes
- [x] 1.1 `pnpm lint` passes — 018d14e
- [x] 1.2 `pnpm build:ci` passes — 018d14e

#### Manual

- [ ] 1.3 `POST /api/plans/[planId]/recalculate` returns `429` after exceeding limit

### Phase 2: UX & copy

#### Automated

- [x] 2.1 `pnpm lint` passes
- [x] 2.2 `pnpm build:ci` passes

#### Manual

- [ ] 2.3 Questionnaire UI shows a clear message for `429`

### Phase 3: Documentation & roadmap sync

#### Manual

- [ ] 3.1 `change.md` documents the chosen limit + window + scope
- [ ] 3.2 Roadmap S-06 marked `done`

