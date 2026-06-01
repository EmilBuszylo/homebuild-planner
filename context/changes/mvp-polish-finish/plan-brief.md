# MVP Polish Capstone (S-10) — Plan Brief

> Full plan: `context/changes/mvp-polish-finish/plan.md`
> Research: `context/changes/mvp-polish-finish/research.md`

## What & Why

Po slice’ach S-07–S-09 produkt **działa**, ale brzmi i wygląda jak zestaw osobnych ekranów: disclaimery w pięciu wariantach, różne etykiety KPI, ankieta bez ostrzeżenia przed submit. S-10 domyka fazę polish — użytkownik ma odczuć **gotowe MVP** (orientacyjnie, bez obietnic wiążącej wyceny), zgodnie z PRD i roadmapą.

## Starting Point

- Landing, panel, ankieta, plan — zaimplementowane (S-03b, S-09, S-07, S-08).
- `OrientationalDisclaimer` istnieje, ale tylko na planie; Vitest + CI (F-07).
- Research zmapował luki copy/metadata/mobile (`research.md`).

## Desired End State

Jedno źródło tekstów orientacyjnych; disclaimery na landing, panelu, ankiecie (podsumowanie) i planie (bez powtórzeń); zsynchronizowane KPI; metadata PL; poprawki mobile; `pnpm lint` / `test` / `build:ci` zielone.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| Copy architecture | `src/lib/copy/orientational.ts` + thin UI wrappers | Uniknięcie driftu stringów | Research |
| Plan page disclaimers | 1× pełny akapit + krótka stopka tabeli | Mniej „ściany tekstu” | Research / Plan |
| Register label | „Załóż konto” | Zgodność z landing CTA | Research |
| Questionnaire disclaimer | Intro + krok Podsumowanie | Ostrzeżenie przed commit odpowiedzi | Research |
| Metadata | title + description, bez OG | MVP wystarczy na SEO/chrome | Research |
| Panel CTA wording | Marketing vs app — różne etykiety OK | Kontekst nawigacji vs konwersja | Plan |
| S-11 scope | Out | Timeline/kosztorys cosmetics później | Roadmap |

## Scope

**In scope:** moduł copy, marketing trust/footer, plan cost table, dashboard, ankieta, plan dedupe, KPI labels, metadata, login CTA, signOut, mobile padding/typography/CTA, loading skeletons panel+ankieta, checklista manualna.

**Out of scope:** S-11, hint UX v3, `(marketing)/` migracja, OG tags, FR-007/010, E2E, redesign shell.

## Architecture / Approach

```
src/lib/copy/orientational.ts  ← single source of strings
        ↓
marketing (trust, footer) | OrientationalDisclaimer | plan-cost-table
        ↓
dashboard | questionnaire (intro + summary) | plan page (deduped header)
        +
metadata (/, auth, app) + routes.login on signOut
        +
mobile tokens (shell/header, questionnaire nav) + optional loading.tsx
```

## Phases at a Glance

| Phase | Delivers | Key risk |
|-------|----------|----------|
| 1. Shared copy | `orientational.ts` + wired marketing/plan table | Over-editing legal tone |
| 2. App surfaces | Dashboard, ankieta, plan, KPI labels | Triple disclaimer |
| 3. Metadata & auth | titles/descriptions, Załóż konto, signOut | Low |
| 4. Mobile + loading | padding, h1, CTA width, skeletons | Scope creep |
| 5. Verification | Full manual capstone checklist | Skipping manual |

**Prerequisites:** S-07, S-08, S-09, F-07 done.  
**Estimated effort:** ~2–3 sesje (5 faz).

## Open Risks & Assumptions

- Zmiana sformułowania „cache bazy” w refinement disclaimer — wymaga akceptacji product (plan: PL „zapisane indeksy”).
- `benchmarkSourceName` może pozostać po angielsku z seed — poza S-10 jeśli nie blokuje UX.
- Manual checklist (Phase 5) jest gate na „gotowe MVP” — nie tylko zielony CI.

## Success Criteria (Summary)

- Użytkownik na całej ścieżce widzi spójny komunikat „orientacyjnie, nie wiążąca oferta”.
- Ankieta ostrzega przed zatwierdzeniem; plan nie powtarza tego samego 3×.
- Mobile nie psuje głównej ścieżki; CI przechodzi z testami.
