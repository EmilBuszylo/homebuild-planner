---
change_id: rate-limit-enforcement
title: Limit przeliceń na użytkownika (S-06)
status: draft
created: 2026-05-28
---

## TL;DR

Wdrażamy **limit pełnych przeliczeń planu na użytkownika** (FR/NFR z PRD), żeby kontrolować koszt generowania. Obejmuje ścieżkę `POST /api/plans/[planId]/recalculate` oraz (opcjonalnie) pierwsze generowanie w `POST /api/plans`.

## Kluczowe decyzje

- **Okno limitu**: rolling window (np. ostatnie 24h) liczony po `PlanVersion.createdAt`.
- **Zakres**: limit dotyczy „pełnych przeliczeń” (recalculate); startowe wygenerowanie planu liczy się jako 1 (lub jest zawsze dozwolone — decyzja w planie).
- **Konfiguracja**: wartości limitu w env (np. `PLAN_RECALC_LIMIT` i `PLAN_RECALC_WINDOW_HOURS`) + bezpieczne defaulty na dev.
- **Sposób liczenia**: bez nowej tabeli — `PlanVersion.count` przez relację `plan.userId`.
- **Odpowiedź API**: HTTP `429` + `retryAfterSeconds` (jeśli umiemy policzyć) + polski komunikat.

## Touch points

- Backend: `src/app/api/plans/[planId]/recalculate/route.ts`, opcjonalnie `src/app/api/plans/route.ts`
- UI: `src/components/questionnaire/questionnaire-form.tsx` (obsługa `429`)
- Lib: nowy helper w `src/lib/rate-limit/` (liczenie okna i limitu)

## Weryfikacja

- `429` zwracane po przekroczeniu limitu; UI pokazuje czytelną informację („Zbyt wiele przeliczeń…”).
- Dla świeżego usera — create + recalc działają bez zmian.
- `pnpm lint` i `pnpm build:ci` przechodzą.

