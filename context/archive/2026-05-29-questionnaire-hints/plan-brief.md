# Questionnaire hints — Plan Brief

> Full plan: `context/changes/questionnaire-hints/plan.md`

## What & Why

Roadmap **S-07**: użytkownik przy pytaniach ankiety widzi krótką podpowiedź — co oznacza pytanie i jak orientacyjnie wpływa na kosztorys oraz harmonogram (FR-003, FR-004). Bez tego trudno zrozumieć m.in. różnicę stan surowy otwarty vs zamknięty albo wpływ ocieplenia na wiele etapów.

## Starting Point

13 pytań w `QuestionDefinition` (seed), renderowane w `question-renderers.tsx` przez `Field` + `FieldLabel` + `FieldError` — **bez** `FieldDescription` ani hintów. Ankieta ładuje pytania w RSC (`questionnaire/page.tsx`); brak dedykowanego API. Wzorzec pomocy w auth: `FieldDescription` w `auth-form-layout.tsx`.

## Desired End State

Każde pytanie na krokach 0–2 **oraz na Podsumowaniu** ma ten sam hint (krótki tekst + opcjonalne „Więcej”). Treści **tylko na froncie** w `src/lib/questionnaire/hints/pl.ts` (struktura pod przyszłe `en.ts`), bez DB. Mobile: czytelne bez hover/tooltip.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Gdzie trzymać copy | Front `hints/pl.ts` + `getQuestionHint()` | Łatwiejsze tłumaczenia niż seed/DB; wzorzec jak S-08 w kodzie | User + Plan |
| UI pattern | `FieldDescription` + Collapsible | Dotykowe, spójne z auth; tooltip słaby na mobile | Plan |
| Zakres pytań | Wszystkie 13 slugów | Roadmap + podsumowanie z tymi samymi hintami | User + Plan |
| Krok podsumowania | **Te same hinty** przy każdej odpowiedzi | Ponowny kontekst przed wysłaniem | User |
| API / schema | Brak zmian | Hinty UI-only | Plan |

## Scope

**In scope:** moduł hintów (pl + typy), `QuestionHint`, kroki 0–2 + **podsumowanie**, Collapsible, lint/build.

**Out of scope:** hint w seed/DB, pełny i18n switch w MVP, edycja hintów przez użytkownika (FR-007), Vitest (F-07).

## Architecture / Approach

`hints/pl.ts` → `getQuestionHint(slug)`. `QuestionHint` z `variant: field | summary`. Formularz + `questionnaire-summary.tsx` korzystają z tego samego helpera.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Hint content | `hints/pl.ts` + typy, 13 wpisów PL | Zbyt długie copy na mobile |
| 2. UI wiring | Collapsible, form + **summary** | Gęstość podsumowania na mobile |
| 3. Verification | lint, build:ci, smoke | Brak regresji submit |

**Prerequisites:** działająca ankieta (S-01/S-01b).  
**Estimated effort:** ~1–2 sesje, 3 fazy.

## Open Risks & Assumptions

- Copy wymaga akceptacji językowej — jeden plik locale.
- Podsumowanie z hintami może być długie — `summary` variant + Collapsible domyślnie zwinięty dla `expanded`.
- Później: `hints/en.ts` + locale w `getQuestionHint` bez zmiany komponentów.

## Success Criteria (Summary)

- Hint pod każdym pytaniem (kroki 0–2) **i** przy każdej odpowiedzi na Podsumowaniu.
- Mobile bez hover; „Więcej” rozwija dłuższy tekst.
- `pnpm lint` / `pnpm build:ci` OK; ankieta → plan bez regresji.
