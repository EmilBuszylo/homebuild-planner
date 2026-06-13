# Artifact 3 — Contributors (raport roboczy)

> Status: **roboczy** · Wygenerowano: 2026-06-12 · Zaktualizowano: obszar `plan-results` i okolice  
> Wybrany obszar: **`plan-results.ts` + ekosystem read-path wyników planu** (artifact-2: 14 direct dependents, DTO hub)

## Metoda

- Git: autorzy i commity dotykające plików ekosystemu (maj–czerwiec 2026 — cała dostępna historia; projekt młodszy niż 12 miesięcy)
- `context/archive/` — plany, frame, impl-review przy change'ach dotykających wyników planu
- `context/foundation/prd.md`, `lessons.md` — decyzje produktowe FR-006/007/010
- **Uwaga kontekstowa:** to projekt **solo** (after-hours MVP). „Kontrybutorzy” = praktycznie **jedna osoba + agenci AI**. Raport opisuje **koncentrację wiedzy**, nie zespół.

### Granice wybranego obszaru

```
plan-results.ts  ← kontrakt DTO
    ↑ GET /api/plans/[planId]/results/route.ts
    ↑ fetch-plan-results.ts
    ↑ plan/[planId]/page.tsx
    ├── plan-cost-table.tsx, plan-timeline.tsx
    │     ├── layout-timeline-stages.ts, coaching-hints.ts
    │     ├── stage-note-controls.tsx, calendar-export-controls.tsx
    └── plan-summary-strip.tsx, plan-snapshot-card.tsx (dashboard)
```

Reguła dependency-cruiser: zmiana `PlanResultsDto` → **18 modułów** w blast radius (artifact-2).

---

## 1. Kto najczęściej pracował przy obszarze (ostatnie 12 miesięcy)

### Ludzie (git)

| Autor | Commity w ekosystemie* | Udział | Okres aktywności |
|---|---:|---|---|
| **Emil Buszyło** | ~24+ (wszystkie) | **100%** | 2026-05-26 → 2026-06-12 |

\*Pliki: `plan-results.ts`, `fetch-plan-results`, `results/route`, `components/plan/*`, `plan/[planId]/page`, `plan-summary-strip`, `plan-snapshot-card`, `lib/plan/{layout,sort,coaching}*`

### „Kontrybutorzy” niewidoczni w git

| Rola | Jak widać w historii | Udział w obszarze |
|---|---|---|
| **Cursor / agenci AI** | Commity `feat(timeline-notes): … (phase N)`, implementacja z `plan.md` | Wykonawca kodu UI/API; brak tożsamości git |
| **10x workflow** | `context/archive/*/plan.md`, `frame.md`, `impl-review.md` | Pamięć instytucjonalna zamiast code review od kolegów |

### Intensywność per plik (commity `--follow`)

| Commity | Plik | Interpretacja |
|---:|---|---|
| 9 | `plan/[planId]/page.tsx` | Najczęściej ruszany — kompozycja widoku |
| 7 | `plan-timeline.tsx` | Główny front timeline + notatki + kalendarz |
| 5 | `results/route.ts` | Assembler DTO z DB |
| 4 | `plan-cost-table.tsx` | Tabela kosztów |
| 3 | `plan-results.ts` | Sam kontrakt — **rzadko edytowany, szeroko konsumowany** |
| 3 | `fetch-plan-results.ts` | Most RSC → API |

**Wniosek:** praca skupia się na **UI i route handlerze**, nie na samym pliku DTO — typowy wzorzec stabilnego kontraktu.

---

## 2. Powtarzające się tematy u kontrybutorów

W projekcie solo tematy = **wątki produktowe ownera** powtarzające się w commitach i archiwach change.

### Emil Buszyło — wątki w obszarze plan-results

| Temat | Ewidencja | Implikacja przy zmianie |
|---|---|---|
| **Dwa widoki, nie jeden** | Frame S-11: merged view **odłożony**; kosztorys nad timeline (`horizontal-timeline-coaching`, `plan-results-polish frame.md`) | Nie scalać `PlanCostTable` + `PlanTimeline` bez explicit owner decision (PRD open Q #2) |
| **Mobile timeline** | S-11 leading concern: scroll, gęstość osi, coaching bez hover-only | `plan-timeline.tsx`, `layout-timeline-stages.ts` — dotyk > tooltip |
| **Spójność sortowania** | API `sortOrder` vs timeline `startDay` — naprawione w S-11 (`align cost table order`) | Zmiana sortowania w API wpływa na oba widgety |
| **Notatki per plan, nie per wersja** | `timeline-notes` plan: `PlanStageNote` keyed by `planId` + `stageSlug` | Recalculate nie kasuje notatek; slug może zniknąć z harmonogramu |
| **Coaching ≠ notatki użytkownika** | S-08: `coaching-hints.ts` (system); S-03: `stageNotes` (user) | Nie mieszać pól w DTO ani UI |
| **Refinement metadata w DTO** | `internet-refinement`: `refinementApplied`, `benchmarkAsOf`, `benchmarkSource` | Banner w `plan-cost-table`; NaN guard w refinement (impl-review F1) |
| **Ownership / IDOR** | Wzorzec `plan.userId === user.id` w results + stage-notes | Każdy nowy endpoint w tym obszarze — ten sam check + test |
| **Orientacyjność copy** | `mvp-polish-finish`: `copy/orientational.ts`, disclaimers | Tekst PL obok liczb — nie w `plan-results.ts` |

### Agenci AI — powtarzalne wzorce implementacji

| Temat | Gdzie widać |
|---|---|
| Fazowanie (`phase 1..5`) | timeline-notes, calendar-export |
| Testy handlerów przed E2E | `plans-route-handlers.test.ts`, risk-07 |
| Stop po migracji Prisma | timeline-notes, calendar-export — owner `db:migrate` |
| Rozszerzanie DTO zamiast nowego API | `stageNotes` w `PlanResultsDto`, nie osobny GET |

---

## 3. Co przeczytać przed zmianą (PR-y, decyzje, edge case'y)

`gh` niedostępny w środowisku analizy — **zamiast PR-ów: archiwum change + commity**. Poniżej kolejność lektury.

### Must-read (decyzje architektoniczne)

| Priorytet | Artefakt | Dlaczego |
|---|---|---|
| 1 | `context/archive/2026-05-27-plan-generation/plan-brief.md` + `change.md` | **Geneza** DTO, GET results, pierwszy UI kosztorysu + timeline |
| 2 | `context/archive/2026-06-02-plan-results-polish-details/frame.md` | **Najważniejszy frame** — co jest problemem (mobile timeline), a co świadomie out of scope (merge, wykresy) |
| 3 | `context/archive/2026-06-11-timeline-notes/plan.md` §Critical Implementation Details | Tabela decyzji: per-plan notes, orphan slugs, delete semantics, 2000 znaków |
| 4 | `context/archive/2026-06-11-calendar-export/plan.md` §What We're NOT Doing | Duplikaty w Google Calendar, brak sync po recalculate, tylko `primary` calendar |
| 5 | `context/foundation/prd.md` — FR-006, FR-007, FR-010, open Q #2 | Zakres produktowy wyników |

### Edge case'y (kod + dokumentacja)

| Edge case | Źródło wiedzy | Objaw |
|---|---|---|
| **Notatki dla slugów, które zniknęły po recalculate** | timeline-notes plan §7 | Rekord w DB, brak wiersza w UI — zamierzone |
| **Kolejność wierszy tabela ≠ timeline** | frame S-11 | Naprawione; regresja możliwa przy zmianie `results/route` lub `layout-timeline-stages` |
| **Coaching tylko hover (desktop)** | frame S-11, S-08 | Na mobile użyć Popover — wzorzec już w timeline |
| **`refinementApplied` + NaN costs** | internet-refinement impl-review F1 | Walidacja przy imporcie benchmarków |
| **IDOR na planie obcym** | `e2e/risk-01-idor-foreign-plan.spec.ts` | 404, nie 403 |
| **Pusty plan / brak wersji** | `results/route.ts:47-51` | 404 „Brak wyników” |
| **Ponowny eksport kalendarza** | calendar-export plan | **Nowe** eventy za każdym razem — komunikat PL w UI |
| **`keyDate` brak w responses** | `results/route.ts:61-62` | Pusty string → daty timeline offset od „dziś”? sprawdzić `plan-date.ts` |
| **RSC fetch vs bezpośredni prisma** | dashboard/questionnaire importują prisma; plan page używa `fetchPlanResults` | Niespójność wzorców read — świadoma w Next RSC |

### Commity wartościowe (git show / log)

| Commit (skrót) | Temat |
|---|---|
| `e63064a` | plan-generation: **utworzenie** API results + `plan-results.ts` |
| `02a741a` | internet-refinement: pola DTO refinement |
| `452df7e` | timeline-notes: `stageNotes` w DTO |
| `5790f86` | horizontal timeline + coaching |
| `fe987f1`…`def1e64` | plan-results-polish: mobile, sort align, touch coaching |
| `978a083` | calendar-export: kontrolki w timeline |
| `65a543d` | fix API: JSON 500 + reportError (results route) |

### Testy do odpalenia przed merge

| Test | Co chroni |
|---|---|
| `pnpm test` → handler tests | results ownership, stage-notes, calendar-export |
| `pnpm test:e2e:risk-04` | Golden path: ankieta → wynik |
| `pnpm test:e2e:risk-07` | Notatki persist po reload |
| `pnpm test:e2e:risk-01` | IDOR na planie |
| `pnpm test:e2e:risk-08` | UI eksportu kalendarza (cienki) |
| `pnpm depcruise` | Kontrakt: prod nie importuje test-fixtures; DTO hub |

---

## 4. Rozproszona vs skupiona wiedza

### Werdykt: **skupiona w jednej osobie**, z **instytucjonalnym backupem w `context/archive/`**

```
                    ┌─────────────────────────┐
                    │   Emil Buszyło (owner)   │
                    │   product + integracja   │
                    │   100% git, decyzje PL   │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
     context/archive/     agenci Cursor      plan-results.ts
     (plany, frame,       (implementacja,     (stabilny kontrakt,
      impl-review)         brak pamięci         rzadko edytowany)
                           między sesjami)
```

| Wymiar | Ocena | Uwagi |
|---|---|---|
| **Wiedza domenowa** (co pokazać użytkownikowi) | Skupiona | Owner + PRD; frame S-11 dokumentuje odrzucone ścieżki |
| **Wiedza techniczna** (jak złożyć DTO) | Skupiona + udokumentowana | `results/route.ts` assembler; plany change |
| **Wiedza o edge case'ach** | Częściowo rozproszona | W planach i impl-review; **nie** w komentarzach kodu |
| **Bus factor** | **1** | Brak drugiego developera; nowy kontrybutor → czyta artifact-2 blast radius + archiwum powyżej |
| **Agenci AI** | Wykonawcy bez trwałej pamięci | Każda sesja potrzebuje `AGENTS.md` + plan change; ryzyko „zforgetowania” frame S-11 |

### Co to znaczy praktycznie (solo ≠ brak struktury)

- **Koncentracja** — każde pytanie „dlaczego DTO ma `stageNotes`?” → owner lub `timeline-notes/plan.md`.
- **Rozproszenie iluzoryczne** — wiele commitów i faz, ale **jeden autor git**; „kto wie co” = owner + foldery archiwum.
- **Największa luka wiedzy dla agenta** — decyzje **odrzucone** (merged view, wykresy, sync kalendarza) żyją w frame/plan, nie w typach.

---

## 5. Kogo pytać o co (mapa na solo projekt)

| Pytanie | Kto / gdzie |
|---|---|
| Czy dodać pole do `PlanResultsDto`? | Owner (wpływ na 14+ modułów) + `pnpm depcruise` |
| Czy scalać kosztorys z timeline? | Owner — PRD open Q #2; frame S-11 mówi **nie** domyślnie |
| Notatki po recalculate / orphan slug | `timeline-notes/plan.md` |
| Eksport Google — duplikaty, OAuth | `calendar-export/plan.md` + owner (Google Cloud) |
| Benchmark banner / NaN | `internet-refinement/reviews/impl-review.md` |
| Mobile timeline UX | `plan-results-polish-details/frame.md` |
| Migracja DB (`PlanStageNote`, credentials) | **Owner only** — `pnpm db:migrate` |

---

## 6. Niewyjaśnione / do weryfikacji

- [ ] Historia PR na GitHubie (gh niedostępny) — czy merge był squash/rebase (wpływa na git blame)?
- [ ] Czy owner planuje przenieść read-path RSC z `fetchPlanResults` na wspólną warstwę serwisową (artifact-2 open question)?
- [ ] Po dodaniu drugiego developera: kto reviewuje zmiany DTO — obecnie brak procesu.

## Następny krok

Synteza w `repo-map.md`: sekcja **„plan-results hub — przed zmianą przeczytaj”** z linkami do tego artifactu i trzech commitów genezy (`e63064a`, `452df7e`, `02a741a`).
