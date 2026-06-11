# Timeline Notes (S-03) — Plan Brief

> Full plan: `context/changes/timeline-notes/plan.md`

## What & Why

Użytkownik budujący dom chce zapisać przy etapie harmonogramu krótką notatkę (np. ustalenia z wykonawcą) i oznaczyć etap jako ważny — i wrócić do tego przy kolejnej wizycie na stronie planu. FR-007 jest nice-to-have, ale domyka produktową obietnicę „timeline + kontekst”, bez wchodzenia w kalendarz zewnętrzny (S-04).

## Starting Point

Strona `/moj-plan/:id` pokazuje kosztorys i poziomy harmonogram (`PlanTimeline`) z systemowymi coaching markers. `PlanStageResult` jest wersjonowany przy recalculate; **brak** tabeli na dane użytkownika przy etapach. API `GET .../results` zwraca tylko wygenerowane koszty i daty.

## Desired End State

Na każdym wierszu harmonogramu: pin „ważny etap” + notatka tekstowa (do 2000 znaków). Zapis przez `PUT /api/plans/:id/stage-notes`; odczyt w `GET .../results` jako `stageNotes`. Notatki **przetrwają przeliczenie** planu (klucz: `planId` + `stageSlug`). Vitest + E2E risk-07 potwierdzają IDOR i persistencję.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Persystencja | **Per plan + stageSlug** | Zgodne z modelem `Plan` i przetrwa recalculate bez kopiowania wersji | Roadmap / Plan |
| Wersjonowanie | **Nie** — notatki na `Plan`, nie `PlanVersion` | Recalculate tworzy nową wersję wyników; notatki mają być „przy moim planie” | Plan |
| Pinned events | **`isPinned` boolean** | Minimalna interpretacja FR-007 bez kalendarza | Plan |
| Przypomnienia | **Poza MVP** | Wymaga schedulera; roadmap Parked | Roadmap |
| Walidacja slug | **Tylko etapy z bieżącej wersji** | Zapobiega notatkom do nieistniejących wierszy | Plan |
| Pusty zapis | **Delete rekordu** | Brak śmieciowych wierszy w DB | Plan |
| UI scope | **Tylko harmonogram** | FR-007 mówi o timeline; kosztorys bez zmian | Plan |

## Scope

**In scope:** `PlanStageNote` Prisma model; owner `db:migrate`; Zod; GET results + PUT stage-notes; UI w `PlanTimeline`; testy handler + E2E risk-07.

**Out of scope:** przypomnienia z datą, eksport kalendarza (S-04), notatki w tabeli kosztów, współdzielenie planów, auto-cleanup osieroconych notatek, edycja `coachingNote` systemowych.

## Architecture / Approach

```
Plan page → GET /results (stages + stageNotes map)
         → PlanTimeline row → StageNoteControls
              → PUT /stage-notes { stageSlug, body, isPinned }
                   → Prisma upsert/delete on PlanStageNote
```

Ownership: ten sam wzorzec co `GET .../results` (`plan.userId === session.user.id`). Recalculate nie dotyka `PlanStageNote`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Schema | `PlanStageNote` + owner migrate | Agent nie może pisać migracji — stop po schema |
| 2. API | PUT + rozszerzony GET results | Slug validation vs dynamiczne etapy |
| 3. UI | Pin + notatka na wierszu timeline | Mobile layout + touch |
| 4. Testy | Vitest IDOR + validation | Mock Prisma jak istniejące handler tests |
| 5. E2E | risk-07 persist po reload | Supabase + migrate w CI |

**Prerequisites:** F-01 done; owner gotowy na `pnpm db:migrate`  
**Estimated effort:** ~2–3 sesje after-hours, 5 faz

## Open Risks & Assumptions

- Osierocone notatki po recalculate (etap zniknął) zostają w DB — świadomy kompromis MVP.
- `PUT` wymaga działającej migracji — Phase 2+ blocked do owner confirm z Phase 1.
- E2E risk-07 to nowy numer — opcjonalna aktualizacja `test-plan.md` w Phase 5.

## Success Criteria (Summary)

- Użytkownik zapisuje notatkę i pin na etapie harmonogramu; widzi je po ponownym wejściu na plan.
- Notatki nie są dostępne dla innego użytkownika (IDOR).
- `pnpm test`, `pnpm build:ci`, `pnpm test:e2e:risk-07` zielone po implementacji.
