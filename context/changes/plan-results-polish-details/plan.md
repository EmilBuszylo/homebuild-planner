# Plan results polish — timeline mobile (S-11) Implementation Plan

## Overview

Dopracować **poziomy harmonogram** na stronie planu pod **wąskie viewporty**: czytelne etykiety etapów, zrozumiałe poziome przewijanie oraz **wskazówki coachingowe dostępne bez hover** (tap). Kosztorys i harmonogram pozostają **osobnymi** kartami; bez scalonego widoku, wykresów i zmian algorytmu generacji planu.

**Upstream:** `frame.md` (autorytatywne „co planować”).  
**Roadmap:** S-11 (`plan-results-polish-details`), FR-006.

## Decisions locked for this plan

| Topic | Decision | Source |
|-------|----------|--------|
| Leading scope | Timeline mobile UX (scroll, labels, coaching tap) | Frame |
| Merged cost+timeline | **Out** | Frame + S-10 archive |
| Cost table | Tylko **ta sama kolejność chronologiczna** co timeline (bez wykresów/grupowania) | Frame (secondary) |
| Coaching interaction | **Popover** na tap/click jako primary; Tooltip nie jako jedyny kanał | Frame + brak `popover` w UI — dodać shadcn |
| Oś czasu — szerokość | Responsywne `pxPerDay` (np. 12 desktop, 8 &lt; `sm`) w `PlanTimeline` | Plan (zmniejsza scroll bez zmiany danych) |
| Scroll affordance | Widoczna podpowiedź PL nad osią + `aria-label` na regionie przewijania | Plan |
| DB / API | **Brak** zmian schematu, route, `scheduleTimeline` | lessons.md + S-08 |
| Testy | Opcjonalnie 1–2 testy Vitest dla wydzielonego sortowania chronologicznego (jeśli extract) | F-07 pattern |

## Current State Analysis

- Strona planu: `PlanSummaryStrip` → disclaimer → `PlanCostTable` → `PlanTimeline` (`plan/[planId]/page.tsx:96-106`).
- Timeline: stała kolumna etykiet `9.5rem`, `truncate` na nazwie i dacie (`plan-timeline.tsx:33,197-205`); wykres `overflow-x-auto`, `minWidth = totalSpanDays × 12` (`161-214`).
- Kolejność: API `sortOrder asc` (`results/route.ts:32`); timeline sort po `startDay` (`layout-timeline-stages.ts:112-117`); tabela kosztów — kolejność API (`plan-cost-table.tsx:56`).
- Coaching: żółte markery + **Tooltip** „najedź” (`plan-timeline.tsx:124-149,171-173`); hinty z `coaching-hints.ts` (bez zmian treści w tym slice).
- shadcn: `tooltip` jest; **brak** `popover` / `sheet` / `drawer` w `src/components/ui/`.

### Key Discoveries (from frame investigation)

- S-08 dostarczył poziomy Gantt i coaching; S-10 wykluczył merge/charts/timeline density rework.
- Roadmap Parked: scalony widok i kolizje markerów — **nie** w tym planie.
- Questionnaire-hints archive: tooltips jako słaby wzorzec na touch — unikać hover-only.

## Desired End State

Zalogowany użytkownik na stronie planu (mobile ~375px i desktop):

1. Widzi **harmonogram** z czytelną nazwą etapu i zakresem dat (bez „uciętego do niczego” w kolumnie etykiet na mobile).
2. Rozumie, że oś wymaga **przewinięcia w poziomie** (krótka podpowiedź PL, nie tylko ukryty scroll).
3. Może **otworzyć wskazówkę coachingową** dotknięciem ikony — treść czytelna bez myszy.
4. Tabela kosztów pokazuje etapy w **tej samej kolejności chronologicznej** co wiersze harmonogramu (łatwiejsze skanowanie).
5. `pnpm lint`, `pnpm test`, `pnpm build:ci` — zielone.

## What We're NOT Doing

- Scalony widok kosztorys + timeline (roadmap unknown / Parked).
- Wykresy, grupowanie kategorii, nowe kolumny w kosztorysie.
- Zmiana `scheduleTimeline`, generacji kosztów, seedu, `coaching-hints` treści.
- Migracje Prisma, rozszerzenie API results.
- Biblioteki Gantt/chart.
- FR-007 (notatki użytkownika), FR-010 (kalendarz).
- Zaawansowane pakowanie nakładających się etapów na wiele torów (S-08 plan — nie zaimplementowane; poza slice).
- Kolizje wielu markerów na jednym wierszu — tylko jeśli zostanie czas po Phase 3; inaczej kolejny change.

## Implementation Approach

1. **Affordance + density** — copy scroll, responsywne `pxPerDay`, lepszy region przewijania (a11y).
2. **Coaching tap** — dodać `popover`, zamienić marker na Popover-first.
3. **Etykiety mobile** — mniej agresywne `truncate`, responsywna szerokość kolumny etykiet.
4. **Spójność kosztorysu** — wspólne sortowanie chronologiczne (pure helper + opcjonalny test).
5. **Weryfikacja** — lint/test/build + checklista mobile/desktop.

## Critical Implementation Details

- **Popover a11y:** Trigger musi być `<button type="button">` z `aria-expanded` / focus ring; treść wskazówki w PopoverContent (nie tylko w Tooltip). Na desktop można zostawić Tooltip jako *dodatek* tylko jeśli nie psuje touch — **rekomendacja implementera:** jeden Popover dla wszystkich breakpointów (prostsze).
- **`pxPerDay`:** Obliczać w `PlanTimeline` (client) przez `matchMedia('(max-width: 639px)')` + listener lub jednorazowy read przy mount; przekazać do `layoutTimelineStages(..., pxPerDay)`. Nie mutować globalnego `TIMELINE_PX_PER_DAY` exportu na stałe.
- **Sort chronologiczny:** Helper w `src/lib/plan/sort-plan-stages-chronologically.ts` (lub w `layout-timeline-stages.ts` jako named export) — ta sama logika co `layoutTimelineStages` sort (startDay, potem sourceIndex). Użyć w `plan-cost-table.tsx` przed `.map`.

## Phase 1: Scroll affordance and axis density

### Overview

Użytkownik na mobile rozumie poziomy scroll; oś zajmuje mniej pikseli na wąskim ekranie.

### Changes Required:

#### 1. Copy — podpowiedź przewijania

**File**: `src/lib/copy/orientational.ts`

**Intent**: Jedna stała PL dla harmonogramu (spójność z S-10 copy module).

**Contract**: Eksport `PLAN_TIMELINE_SCROLL_HINT` (np. „Przesuń palcem w poziomie, aby zobaczyć całą oś czasu.”).

#### 2. Region przewijania i hint UI

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Nad dual-pane dodać widoczny `text-sm text-muted-foreground` z hintem; na `overflow-x-auto` ustawić `role="region"` + `aria-label` opisujący przewijanie harmonogramu.

**Contract**: Hint widoczny gdy `stages.length > 0`; nie duplikować w CardDescription całego akapitu.

#### 3. Responsywne `pxPerDay`

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Na viewport &lt; `sm` użyć mniejszego `pxPerDay` (np. 8) przy wywołaniu `layoutTimelineStages`.

**Contract**: `timelineMinWidth` i markery liczone z tym samym `pxPerDay` co layout; desktop bez regresji (12px/dzień).

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Mobile ~375px: podpowiedź scroll widoczna; przewijanie osi działa; oś krótsza niż przy 12px/dzień
- Desktop: brak regresji czytelności osi

**Implementation Note**: Po zielonych checkach automated — potwierdzenie manual od ownera przed Phase 2.

---

## Phase 2: Touch-friendly coaching (Popover)

### Overview

Wskazówki coachingowe otwierają się po tap/click, nie tylko po hover.

### Changes Required:

#### 1. shadcn Popover

**File**: `src/components/ui/popover.tsx` (nowy, via `pnpm dlx shadcn@latest add popover`)

**Intent**: Komponent zgodny z `components.json` (radix-sera).

**Contract**: Importowalny `Popover`, `PopoverTrigger`, `PopoverContent` jak w docs shadcn dla tego repo.

#### 2. Coaching marker — Popover-first

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: `CoachingMarker` używa Popover (trigger = istniejący przycisk z ikoną); treść notki jak dziś w TooltipContent.

**Contract**: `aria-label` po polsku bez „najedź” (np. „Wskazówka — dotknij, aby przeczytać”); zamknij Popover przy ponownym tap lub klik poza (domyślne radix). Usunąć Tooltip jako jedyny kanał (dopuszczalne usunięcie TooltipProvider jeśli nieużywany).

#### 3. CardDescription copy

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Zaktualizować opis karty gdy są coaching markery — **dotknij**, nie **najedź**.

**Contract**: Polski UI; spójny ton z resztą app.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Mobile (touch lub emulator): tap na żółtą ikonę otwiera i zamyka wskazówkę
- Desktop: click działa; klawiatura (Enter/Space na trigger, Escape zamyka) — smoke
- Plan z ≥1 coaching marker (typowy seed plan)

**Implementation Note**: Po automated — manual przed Phase 3.

---

## Phase 3: Label column readability on narrow viewports

### Overview

Nazwy etapów i daty nie są bezużytecznie obcięte na mobile.

### Changes Required:

#### 1. Responsywna kolumna etykiet

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Na `max-sm` poszerzyć kolumnę etykiet (np. pełna szerokość nad wykresem **lub** `min-width` większe niż `9.5rem`) — wybór implementera: **rekomendacja** stack na mobile (etykiety nad wykresem w jednej kolumnie) *albo* `w-[11.5rem] sm:w-[9.5rem]` z `line-clamp-2` zamiast `truncate` na nazwie.

**Contract**: Desktop layout dual-pane bez regresji; brak horizontal scroll całej strony (tylko oś jak dziś).

#### 2. Daty etapu

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Na wąskim ekranie daty czytelne (np. `text-xs` bez `text-[10px]` na mobile, lub druga linia bez truncate).

**Contract**: `formatStageRange` bez zmiany logiki; tylko prezentacja.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Mobile: nazwa ≥1 długiego etapu czytelna (nie jedna linia „…")
- Desktop: układ jak przed Phase 3 (dual-pane)

**Implementation Note**: Po automated — manual przed Phase 4.

---

## Phase 4: Cost table chronological order

### Overview

Kosztorys i harmonogram skanują się w tej samej kolejności etapów.

### Changes Required:

#### 1. Pure sort helper

**File**: `src/lib/plan/sort-plan-stages-chronologically.ts` (nowy)

**Intent**: Funkcja przyjmująca `PlanResultsStageDto[]`, zwracająca kopię posortowaną po `startDay`, tie-break `sortOrder` / indeks wejściowy (zgodnie z `layout-timeline-stages.ts:112-117`).

**Contract**: Eksport nazwany; bez side effects; deterministyczny wynik.

#### 2. Opcjonalny test Vitest

**File**: `src/lib/plan/sort-plan-stages-chronologically.test.ts` (nowy)

**Intent**: 2–3 przypadki: różne `startDay`, remis `startDay` zachowuje stabilność.

**Contract**: `pnpm test` przechodzi.

#### 3. Wire cost table

**File**: `src/components/plan/plan-cost-table.tsx`

**Intent**: Przed renderem tbody posortować `results.stages` helperem.

**Contract**: Footer „Razem” bez zmian; klucze `stageSlug` bez zmian.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- Plan wieloetapowy: pierwszy wiersz tabeli = pierwszy wiersz harmonogramu (chronologia)
- Kwoty i suma bez zmian

**Implementation Note**: Po automated — manual przed Phase 5.

---

## Phase 5: Capstone verification

### Overview

Zamknięcie S-11 — regresja desktop + happy path mobile na planie.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- [ ] Mobile ~375px: scroll hint, czytelne etykiety, tap coaching
- [ ] Desktop: harmonogram + kosztorys bez regresji
- [ ] Brak angielskiego UI na stronie planu (happy path)
- [ ] Nie wprowadzono scalonego widoku ani wykresów

---

## Testing Strategy

### Unit Tests:

- `sort-plan-stages-chronologically.test.ts` — sort edge cases (Phase 4).
- Brak testów komponentów React (poza scope F-07).

### Integration Tests:

- Brak.

### Manual Testing Steps:

1. Zaloguj → plan z pełnym harmonogramem i ≥1 coaching marker.
2. Mobile: przewiń oś, otwórz 2 różne wskazówki tapem.
3. Porównaj kolejność wierszy tabela vs harmonogram.
4. Desktop: hover nie jest wymagany do odczytu wskazówki.

## Performance Considerations

- `matchMedia` listener jeden na mount w `PlanTimeline` — minimalny koszt.
- Popover renderuje treść on demand — OK dla ≤ kilkunastu markerów.

## Migration Notes

Brak migracji DB. Deploy: standard Vercel build.

## References

- Frame: `context/changes/plan-results-polish-details/frame.md`
- Roadmap S-11: `context/foundation/roadmap.md`
- PRD FR-006: `context/foundation/prd.md`
- Prior timeline: `context/archive/2026-05-28-horizontal-timeline-coaching/plan.md`
- S-10 out-of-scope: `context/archive/2026-06-01-mvp-polish-finish/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Scroll affordance and axis density

#### Automated

- [x] 1.1 `pnpm lint` — 5f4c9b3
- [x] 1.2 `pnpm build:ci` — 5f4c9b3

#### Manual

- [x] 1.3 Mobile scroll hint + krótsza oś; desktop bez regresji — 5f4c9b3

### Phase 2: Touch-friendly coaching (Popover)

#### Automated

- [x] 2.1 `pnpm lint` — c2042be
- [x] 2.2 `pnpm build:ci` — c2042be

#### Manual

- [x] 2.3 Tap/click coaching na mobile i desktop — c2042be

### Phase 3: Label column readability on narrow viewports

#### Automated

- [x] 3.1 `pnpm lint` — 88cc1f8
- [x] 3.2 `pnpm build:ci` — 88cc1f8

#### Manual

- [x] 3.3 Czytelne nazwy/daty na ~375px; desktop dual-pane OK — 88cc1f8

### Phase 4: Cost table chronological order

#### Automated

- [ ] 4.1 `pnpm lint`
- [ ] 4.2 `pnpm test`
- [ ] 4.3 `pnpm build:ci`

#### Manual

- [ ] 4.4 Ta sama kolejność etapów w tabeli i harmonogramie

### Phase 5: Capstone verification

#### Automated

- [ ] 5.1 `pnpm lint`
- [ ] 5.2 `pnpm test`
- [ ] 5.3 `pnpm build:ci`

#### Manual

- [ ] 5.4 Checklista S-11 (4 punkty w fazie 5) — wszystkie OK
