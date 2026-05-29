# Questionnaire hints (S-07) Implementation Plan

## Overview

Dodać podpowiedzi przy pytaniach ankiety: krótkie wyjaśnienie znaczenia pytania i orientacyjny wpływ na wycenę/harmonogram. **Treści wyłącznie na froncie** (moduł w `src/lib/questionnaire/hints/`, gotowy pod przyszłe tłumaczenia) — bez migracji DB. UI: `FieldDescription` + Collapsible na krokach 0–2; **te same hinty** na kroku Podsumowania przy każdej odpowiedzi.

## Current State Analysis

- **Model:** `QuestionDefinition` ma `label`, `options`, `validation`, `unit` — brak pola hint (`prisma/schema.prisma:54-64`).
- **Load:** `questionnaire/page.tsx` — `findMany` + props do `QuestionnaireForm`; brak `/api/questionnaire`.
- **Render:** `question-renderers.tsx` — 4 typy pól, brak opisu pod etykietą.
- **Kroki:** `step-content.tsx` — `STEP_FIELDS` mapuje 13 slugów na 3 kroki treści + podsumowanie.
- **Wzorzec UI:** `auth-form-layout.tsx:111-113` — opcjonalny `FieldDescription`.
- **Roadmap S-07:** 2–4 zdania + opcjonalne „rozwiń”; ryzyko mobile (`roadmap.md:76-87`).
- **Lessons:** nie pisać migracji ręcznie; owner-only `db:migrate` — dlatego MVP bez kolumny w DB.

### Key Discoveries:

- Dokładnie **13 slugów** — lista w seedzie `prisma/seed.ts:34-173`.
- Hinty **nie wpływają** na walidację ani API — tylko prezentacja.
- Tooltip (S-08 timeline) **nie** jako główny wzorzec — hover na mobile.
- Collapsible **nie ma** w `components/ui/` — dodać przez shadcn.

## Desired End State

Użytkownik na krokach ankiety 1–3 (indeks 0–2) oraz na **Podsumowaniu** przy każdej odpowiedzi widzi:
1. Etykietę / wartość (jak dziś).
2. Krótki hint (`text-sm text-muted-foreground`).
3. Opcjonalnie „Więcej o tym pytaniu” rozwijające dłuższy tekst (Collapsible).

Weryfikacja: przejście ankiety na mobile (DevTools) + desktop; submit nadal przechodzi `questionnaireInputsSchema`.

## What We're NOT Doing

- Kolumna `hint` w `QuestionDefinition` / seed DB — celowo **front-only** (łatwiejsze i18n później).
- Tooltip-only / ikona bez tekstu.
- Zmiana logiki kosztów, filtrów etapów ani Zod (poza typem slugów hintów).
- Vitest / E2E (F-07 / S-10).
- Pełny stack i18n (next-intl, przełącznik języka) — tylko struktura plików pod tłumaczenia.

## Implementation Approach

1. **Front-only, i18n-ready:** `src/lib/questionnaire/hints/pl.ts` — mapa slug → `{ short, expanded? }`; `question-hints.ts` eksportuje `getQuestionHint()` z domyślnego locale `pl` (później: `hints/en.ts` + parametr locale lub provider).
2. Komponent `QuestionHint` — short zawsze, expanded w Collapsible; prop `variant?: "field" | "summary"` (summary: mniejszy odstęp, ten sam copy).
3. Integracja w `QuestionField` + **wiersze** `questionnaire-summary.tsx` (pod etykietą pytania, przed/obok wartości — layout pionowy na mobile).
4. Copy PL kuratorowane w `hints/pl.ts`; ton MVP: orientacyjnie, „Ty”, bez obietnic cen.

## Critical Implementation Details

**Kolejność w `Field`:** hint **pod** `FieldLabel`, **nad** kontrolką (input/radio/checkbox) — jak w auth. Dla `BooleanField` obecnie etykieta jest w `<label>` z checkboxem; przenieść na wzorzec: `FieldLabel` + hint + wiersz checkbox (spójność z pozostałymi typami).

**Typ mapy:** `Record<QuestionSlug, QuestionHint>` w `hints/pl.ts` gdzie `QuestionSlug` = klucze z `questionnaireInputsSchema`.

**Podsumowanie:** zmienić wiersz z `flex justify-between` na układ kolumnowy: etykieta → `QuestionHint variant="summary"` → wartość wyrównana do prawej lub pod hintem; na wąskim ekranie wartość pod hintem (czytelność).

## Phase 1: Hint content module

### Overview

Treści PL i helper do pobierania hintu po slug.

### Changes Required:

#### 1. Moduł hintów (front-only, i18n-ready)

**Files**:
- `src/lib/questionnaire/hints/types.ts` — `QuestionHint`, `QuestionSlug`
- `src/lib/questionnaire/hints/pl.ts` — mapa 13 slugów (treści PL)
- `src/lib/questionnaire/question-hints.ts` — `getQuestionHint(slug, locale = "pl")` deleguje do `hints/pl.ts`

**Intent**: Jedno źródło copy na froncie; przyszłe `hints/en.ts` bez zmiany komponentów UI.

**Contract**:

```typescript
export type QuestionHint = {
  short: string;
  expanded?: string;
};

export function getQuestionHint(
  slug: string,
  locale?: "pl", // rozszerzalne: "pl" | "en"
): QuestionHint | null;
```

**Treści (tematy do wpisania — pełne PL w implementacji):**

| slug | short (temat) | expanded (temat) |
|------|---------------|------------------|
| `investment_state` | Do jakiego stanu chcesz dojść; decyduje które etapy w planie | Różnica surowy otwarty / zamknięty / deweloperski; wpływ na zakres kosztorysu |
| `starting_state` | Od czego startujesz; etapy już zrobione znikają z planu | Para z celem: start musi być wcześniejszy; przykłady par |
| `build_standard` | Mnożnik kosztów m² na etapach (ekonomiczny / standard / premium) | Orientacyjnie, nie oferta wykonawcy |
| `insulation_level` | Jakość ocieplenia; podbija m.in. fundamenty, dach, ogrzewanie | % w seedzie — bez cm styropianu w etykiecie |
| `area` | Powierzchnia użytkowa → koszty za m² na większości etapów | Zakres 50–500 m² |
| `floors` | Kondygnacje → wpływ na zakres robót (np. stropy) | 1–3 |
| `has_attic` | Poddasze użytkowe — opcjonalne; wpływ na kubaturę/ocieplenie | Krócej niż wymagane pola |
| `garage_spots` | 0 = brak etapu bramy garażowej w planie | Koszt stały za miejsce gdy > 0 |
| `balcony_count` | Koszt za sztukę (modyfikator PER_UNIT) | 0 OK |
| `window_count` | Koszt za sztukę okien | Wpływ na etap stolarki |
| `exterior_door_count` | Koszt za sztukę drzwi zewnętrznych | |
| `terrace_door_count` | Opcjonalne; koszt za sztukę drzwi tarasowych | 0 OK |
| `key_date` | Dzień 0 harmonogramu; daty etapów liczone od tej daty | Orientacyjny plan, nie umowa z ekipą |

Ton: 2–3 zdania w `short` max; `expanded` tylko gdzie potrzeba (stany inwestycji, ocieplenie).

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- TypeScript: mapa pokrywa wszystkie 13 slugów z seed (compile-time lub prosty test typów)

#### Manual Verification:

- Przegląd copy PL przez ownera (akceptacja języka)

**Implementation Note**: Po tej fazie owner może poprawić teksty w jednym pliku bez dotykania UI.

---

## Phase 2: UI — Collapsible + QuestionHint

### Overview

Komponent wizualny i podpięcie we wszystkich typach pytań.

### Changes Required:

#### 1. shadcn Collapsible

**File**: `src/components/ui/collapsible.tsx` (nowy, via CLI)

**Intent**: Dodać prymityw Collapsible do projektu.

**Contract**: `pnpm dlx shadcn@latest add collapsible` zgodnie z `components.json`.

#### 2. QuestionHint

**File**: `src/components/questionnaire/question-hint.tsx` (nowy)

**Intent**: Render short + opcjonalny Collapsible z triggerem „Więcej o tym pytaniu” / „Zwiń”.

**Contract**:
- Props: `{ hint: QuestionHint; variant?: "field" | "summary" }`
- `FieldDescription` dla `short` (`summary`: `text-xs` opcjonalnie)
- Trigger: `button type="button"`, `text-sm`, underline — nie submit formularza
- CollapsibleContent dla `expanded`
- Brak hintu → `null`

**Choice hints (SINGLE_CHOICE):** w `SingleChoiceField` pod etykietą opcji (`Label`) renderować `getQuestionChoiceHint(slug, opt.value)?.short` jako `text-xs text-muted-foreground` w osobnym wierszu (wcięcie pod radiem). `expanded` opcji — opcjonalnie w Collapsible przy opcji lub tylko short na MVP.

#### 3. Integracja w rendererach

**File**: `src/components/questionnaire/question-renderers.tsx`

**Intent**: W `QuestionField` wywołać `getQuestionHint(question.slug)` i renderować `QuestionHint variant="field"` pod etykietą.

**Contract**: Refaktor `BooleanField` — `FieldLabel` + hint + wiersz checkbox.

#### 4. Hinty na podsumowaniu

**File**: `src/components/questionnaire/questionnaire-summary.tsx`

**Intent**: Przy każdym wierszu odpowiedzi (13 slugów w `STEP_GROUPS`) renderować ten sam `QuestionHint variant="summary"` z `getQuestionHint(slug)` — użytkownik może jeszcze raz przeczytać kontekst przed wysłaniem.

**Contract**:
- Import `QuestionHint` + `getQuestionHint`
- Layout wiersza: kolumna z `question.label`, hint, potem `formatAnswer(...)` (font-medium)
- Zachować grupowanie w `Card` jak dziś

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Desktop: wszystkie 13 pytań na 3 krokach + podsumowanie — hint widoczny
- Mobile (DevTools ~375px): bez hover; „Więcej” rozwija/zwija; podsumowanie czytelne (kolumny)
- `investment_state` + `starting_state`: expanded ma sens po rozwinięciu
- Submit ankiety → plan tworzy się jak wcześniej

---

## Phase 3: Docs and handoff

### Overview

Zaktualizować change, smoke końcowy.

### Changes Required:

#### 1. change.md

**File**: `context/changes/questionnaire-hints/change.md`

**Intent**: Status `implemented` po zakończeniu; notka o pliku hintów.

### Success Criteria:

#### Manual Verification:

- Smoke: `/questionnaire` → wypełnienie → `/plan/[id]` — brak regresji
- Hinty nie zasłaniają przycisków Wstecz/Dalej na mobile

---

## Testing Strategy

### Manual Testing Steps:

1. Nowy plan: krok 1 — sprawdź hinty stan docelowy / start / standard / ocieplenie.
2. Krok 2 — area, floors, opcjonalne pola.
3. Krok 3 — okna/drzwi/data.
4. Edycja istniejącego planu — hinty na krokach i podsumowaniu.
5. Walidacja: puste wymagane pole — błąd + hint nadal widoczny.
6. Podsumowanie: każdy wiersz ma hint; submit bez regresji.

## Performance Considerations

Mapa statyczna w bundlu — zero fetchy; Collapsible domyślnie zamknięty — bez kosztu layoutu dla long text.

## Migration Notes

Brak migracji. Copy **nie** w seedzie — wyłącznie front (`hints/pl.ts`). Przyszłe locale: dodać `hints/en.ts` i rozszerzyć `getQuestionHint`; UI bez zmian.

## References

- `context/foundation/roadmap.md` — S-07
- `context/foundation/prd.md` — FR-003, FR-004
- `context/foundation/lessons.md` — migracje owner-only
- `src/components/auth/auth-form-layout.tsx` — FieldDescription pattern
- `src/lib/plan/coaching-hints.ts` — wzorzec mapy hintów w kodzie
- `context/archive/2026-05-26-questionnaire-refinements/plan.md` — STEP_FIELDS

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Hint content module

#### Automated

- [x] 1.1 Utworzyć `hints/types.ts`, `hints/pl.ts`, `question-hints.ts` z `getQuestionHint`
- [x] 1.2 Dodać 13 wpisów PL (short + expanded) oraz `choices` dla pól SINGLE_CHOICE (stany, standard, ocieplenie)

#### Manual

- [x] 1.3 Owner: akceptacja copy PL w hintach

### Phase 2: UI — Collapsible + QuestionHint

> **Uwaga implementacyjna:** plan zakładał Collapsible + `FieldDescription`; wdrożono wariant **tooltip + ikonka `i`** (pytanie), podkreślenie opcji, `ChoiceHintsGuide` + `SelectedChoiceHintPreview` — lepszy balans UX/UI po iteracji z ownerem.

#### Automated

- [x] 2.1 Dodać shadcn `collapsible` *(nie używane w finalnym UI — usunięte)*
- [x] 2.2 Utworzyć `question-hint.tsx`
- [x] 2.3 Podpiąć hinty w `question-renderers.tsx` (+ refaktor BooleanField)
- [x] 2.4 Podpiąć hinty w `questionnaire-summary.tsx` (`variant="summary"`)

#### Manual

- [x] 2.5 Smoke desktop + mobile: kroki 0–2 **i podsumowanie**

### Phase 3: Docs and handoff

#### Manual

- [x] 3.1 Smoke ankieta → plan; zaktualizować `change.md` → `implemented`
