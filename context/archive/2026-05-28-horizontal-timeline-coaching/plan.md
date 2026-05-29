# Poziomy harmonogram z notkami praktycznymi (S-08) Implementation Plan

## Overview

Zastąpić pionowy `PlanTimeline` poziomą osią czasu na stronie planu: czytelna kolejność etapów w czasie (z uwzględnieniem równoległych prac), daty od `key_date`, oraz krótkie **notki coachingowe** z bazy wiedzy (np. zamówienia okien podczas fundamentów). Kosztorys pozostaje w `PlanCostTable` nad harmonogramem. Bez biblioteki wykresów, bez notatek użytkownika (FR-007).

**Roadmap:** S-08 (`horizontal-timeline-coaching`), north star fazy post-MVP polish.  
**Upstream:** `research.md` w tym change folderze.

## Decisions locked for this plan

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Notki w DB | `ConstructionStage.coachingNote String?` | Oddzielne od `description` (zakres robót vs porada) |
| Notki v1 (seed) | **7 slugów** — patrz sekcja „Coaching notes (v1)” poniżej | Research: praktyka usera + poradniki PL ([research.md](research.md#coaching-notes--research-praktyka--internet)) |
| Koszt na osi | Nie — tylko w tabeli | Roadmap + mniej szumu wizualnego |
| Kolejność renderu | Po `startDay`, potem `sortOrder` | Oś czasu; równoległe etapy ten sam `startDay` |
| Nakładanie etapów | Wiele „torów” (wierszy) gdy przedziały się nakładają | Odzwierciedla `scheduleTimeline()` (elektryka + hydraulika równolegle) |
| Scroll | `overflow-x-auto` + min-width na osi | Wzorzec `plan-cost-table.tsx`; bez nowego shadcn `scroll-area` |
| Szerokość strony | `max-w-4xl` → `max-w-6xl` na stronie planu | Więcej miejsca na oś; reszta panel polish w S-09 |
| Testy | Poza scope S-08 | F-07 (`vitest-minimal-setup`) osobno |

## Current State Analysis

- `src/components/plan/plan-timeline.tsx` — pionowa lista (`border-l`, kropki), bez notek.
- `GET /api/plans/[planId]/results` — `PlanResultsStageDto` bez `coachingNote`; join `ConstructionStage` tylko `name`, `category`.
- `scheduleTimeline()` — równoległe etapy możliwe; lista w API w kolejności `PlanStageResult.sortOrder`, nie chronologicznej.
- Seed: 18 etapów, każdy ma `description` (zakres), brak pól pod coaching.

### Key Discoveries

- `prisma/schema.prisma:66-82` — `ConstructionStage` gotowe na nowe pole opcjonalne.
- `lessons.md` — migracja `pnpm db:migrate` **owner-only**; agent przygotowuje plik SQL, zatrzymuje się przed implementacją wymagającą żywego pola.
- `context/foundation/roadmap.md` — mobile risk: poziomy scroll lub zwinięcie; FR-007 (notatki user) parked.

## Desired End State

Zalogowany użytkownik na `/moj-plan/[planId]` widzi:

1. **Kosztorys** — bez zmian funkcjonalnych (tabela nad harmonogramem).
2. **Harmonogram poziomy** — oś od daty `key_date`; etapy jako segmenty/karty w kolejności czasu; równoległe prace na osobnych torach gdy się nakładają.
3. **Notki coachingowe** — pod wybranymi etapami (ikona/info + 1–3 zdania PL), tylko gdy `coachingNote` w seedzie jest ustawione.

### Verification

- Plan z wieloma etapami (w tym równoległymi po `walls`) — oś nie myli kolejności; nakładające się przedziały na różnych torach.
- Widoczne notki na typowym pełnym planie m.in. `foundations`, `walls`, `electrical`, `plumbing` (łącznie 7 slugów).
- Mobile: poziome przewijanie bez ucinania treści; daty czytelne.
- `pnpm lint` i `pnpm build:ci` przechodzą.
- Po migracji ownera: `pnpm db:seed` uzupełnia `coachingNote`; istniejące plany działają bez re-generacji (notki z KB przy GET).

## What We're NOT Doing

- Notatki edytowalne przez użytkownika (FR-007).
- Integracja kalendarza (FR-010).
- Zmiana algorytmu `scheduleTimeline` lub kosztów.
- Biblioteki Gantt/chart (Chart.js, vis-timeline, itp.).
- Duplikowanie kosztu na kafelkach osi.
- Pełny redesign panelu / dashboardu (S-09).
- Vitest w tym change (F-07).

## Implementation Approach

1. Dodać `coachingNote` do schematu + seed (3 slugi).
2. Rozszerzyć `PlanResultsStageDto` i route results.
3. Wydzielić czystą funkcję układu osi (`layout-timeline-stages.ts`) — sortowanie, przypisanie torów przy nakładaniu, meta pod UI.
4. Przebudować `PlanTimeline` na poziomy układ (Tailwind + shadcn `Card`).
5. Lekko poszerzyć kontener strony planu + skeleton loading.

## Coaching notes (v1)

Treści zatwierdzone w research (2026-05-28). Notka = wyprzedzenie kolejnej ekipy / zamówienia, nie zamiennik `description`.

| slug | coachingNote |
|------|----------------|
| `foundations` | Trwają fundamenty — to dobry moment, żeby **porozmawiać z producentem okien i drzwi** (wybór, wstępna wycena). Produkcja często trwa **kilka–kilkanaście tygodni** — im wcześniej złożysz zamówienie, tym mniejsze ryzyko przestoju po dachu. |
| `walls` | Wchodzisz w murowanie — **jeśli nie masz jeszcze zamówionych okien i drzwi**, zrób to teraz. Po wykonaniu otworów i dachu będzie można zmierzyć, ale kolejka u producenta i tak liczy się od dziś. |
| `roof_covering` | Dach i obrys budynku są na finiszu — **warto już umawiać elektryka i hydraulika** (bruzdy, podejścia). Dobre ekipy instalacyjne mają obłożenie kilka–kilkanaście tygodni do przodu. |
| `windows_doors` | Etap montażu stolarki — **jeśli okna nie są jeszcze w produkcji**, może być za późno bez opóźnienia kolejnych prac. Montaż zwykle po suchych ścianach i gotowym dachu, **przed** tynkami wewnątrz. |
| `electrical` | Zaraz startują (lub trwają) prace elektryczne podtynkowe — **poszukaj ekipy tynkarskiej** na termin po zakończeniu bruzd. Tynki przed instalacjami w ścianach to najczęstszy powód drogich poprawek. |
| `plumbing` | Hydraulika startuje równolegle z elektryką — **warto już pytać o wylewki** (termin po tynkach i ogrzewaniu w Twoim harmonogramie). Ekipy od jastrychu też bywają zarezerwowane z wyprzedzeniem. |
| `interior_plaster` | Przed tynkami upewnij się, że **instalacje w ścianach są domknięte** (przewody, puszki, podejścia). Po tynkach zaczynają się prace mokre na podłodze — bez sensu kucać świeże ściany. |

Pozostałe etapy: `coachingNote: null`.

## Critical Implementation Details

- **Owner migration gate:** Po dodaniu pliku w `prisma/migrations/`, agent **STOP** i prosi ownera o `pnpm db:migrate` + `pnpm db:seed` + potwierdzenie. Dopiero potem implementacja API/UI zakłada kolumnę w DB.
- **Nakładanie intervali:** Dla każdego etapu `[startDay, startDay + durationDays)`. Przypisz `trackIndex` greedy: pierwszy wolny tor bez kolizji z już umieszczonymi na tym torze. Etapy z `durationDays === 0` — minimalna szerokość wizualna (1 dzień lub stała min-width CSS).
- **Oś X:** `totalSpan = max(startDay + durationDays)` po stages; pozycja `left% = (startDay / totalSpan) * 100`, `width% = (durationDays / totalSpan) * 100` (clamp min-width na karcie dla czytelności nazwy).
- **Równoległe etapy, ten sam start:** mogą dzielić tor jeśli interval się nie nakłada; jeśli nakładają — osobne tory.
- **Dostępność:** Lista etapów ma tekstowe daty (nie tylko pozycja); notka w `role="note"` lub `aria-describedby` przy karcie etapu.

## Phase 1: Schema, migration, seed

### Overview

Pole `coachingNote` w bazie wiedzy + **7 treści PL** (tabela „Coaching notes (v1)” powyżej).

### Changes Required:

#### 1. Prisma schema

**File**: `prisma/schema.prisma`

**Intent**: Opcjonalna notka coachingowa per etap budowy.

**Contract**: Na modelu `ConstructionStage` dodać `coachingNote String?` pod `description`.

#### 2. Migration SQL

**File**: `prisma/migrations/<timestamp>_add_coaching_note_to_construction_stage/migration.sql`

**Intent**: `ALTER TABLE` dodające nullable kolumnę `coachingNote`.

**Contract**: Tylko dodanie kolumny; bez zmiany istniejących wierszy.

#### 3. Seed

**File**: `prisma/seed.ts`

**Intent**: Ustawić `coachingNote` w upsertach etapów (tylko wybrane slugi).

**Contract**: Wpisz dokładnie teksty z sekcji **Coaching notes (v1)** w tym planie (7 slugów). Pozostałe etapy: `coachingNote: null`.

### Success Criteria:

#### Automated Verification:

- [ ] Plik migracji istnieje i jest spójny ze schematem.

#### Manual Verification:

- [ ] Owner: `pnpm db:migrate` + `pnpm db:seed` — bez błędów.
- [ ] `pnpm db:studio` lub SQL: kolumna `coachingNote` widoczna; **7 etapów** ma tekst (lista w sekcji Coaching notes v1).

**⛔ STOP po Phase 1** aż owner potwierdzi migrację.

## Phase 2: API and DTO

### Overview

Przekazać `coachingNote` do klienta w wynikach planu.

### Changes Required:

#### 1. DTO

**File**: `src/lib/plan-results.ts`

**Intent**: Typ stage z opcjonalną notką.

**Contract**: `PlanResultsStageDto` + `coachingNote?: string | null`.

#### 2. Results route

**File**: `src/app/api/plans/[planId]/results/route.ts`

**Intent**: Dołączyć `coachingNote` z `ConstructionStage` do każdego stage w payloadzie.

**Contract**: `select` rozszerzyć o `coachingNote`; mapowanie `coachingNote: def?.coachingNote ?? null`.

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm lint`
- [ ] `pnpm build:ci` (bez migracji na CI — generate only; lokalnie po migracji pełny build)

#### Manual Verification:

- [ ] `GET /api/plans/:id/results` JSON zawiera `coachingNote` dla `foundations` po seedzie.

## Phase 3: Timeline layout utilities

### Overview

Czysta logika sortowania i torów pod UI — bez React.

### Changes Required:

#### 1. Layout helper

**File**: `src/lib/plan/layout-timeline-stages.ts` (new)

**Intent**: Przygotować dane do renderu poziomej osi.

**Contract**:

- Input: `PlanResultsStageDto[]`
- Output: `{ stages: Array<Stage & { trackIndex: number; endDay: number }>, totalSpanDays: number }` posortowane po `(startDay, stageSlug)`.
- `assignTracks(intervals)` — algorytm greedy opisany w Critical Implementation Details.
- Eksportować typy tylko jeśli potrzebne UI; bez zależności od Prisma/React.

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm lint`

#### Manual Verification:

- [ ] Krótki komentarz w planie implementera lub konsola dev: plan z równoległymi etapami po `walls` dostaje `trackIndex > 0` dla co najmniej jednego z nich.

## Phase 4: Horizontal timeline UI

### Overview

Zastąpić pionowy markup poziomą osią z notkami.

### Changes Required:

#### 1. PlanTimeline component

**File**: `src/components/plan/plan-timeline.tsx`

**Intent**: Pozioma oś w `Card`; segmenty etapów; notka coachingowa pod kartą gdy present.

**Contract**:

- Użyć `layoutTimelineStages(results.stages)`.
- Kontener: `overflow-x-auto` (jak tabela kosztów).
- Wewnątrz: wiersze torów (`trackIndex`), w każdym torze karty pozycjonowane `left`/`width` w % względem `totalSpanDays` (min-width na karcie, np. `min-w-[8rem]`).
- Karta: `name`, zakres dat (`addDaysToIsoDate`), `durationDays` w nawiasie.
- Gdy `coachingNote`: blok pod kartą — `text-sm text-muted-foreground`, prefiks „Wskazówka:” lub ikona `Info` z `lucide-react` (jeśli już w projekcie).
- Nagłówek Card: „Harmonogram prac” + opis z datą kotwicy (zachować obecny copy pattern).
- Usunąć pionowy `border-l` / listę `<ol>`.

#### 2. Plan page width

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Więcej miejsca na oś.

**Contract**: `max-w-4xl` → `max-w-6xl` na głównym wrapperze.

#### 3. Loading skeleton

**File**: `src/app/(app)/plan/[planId]/loading.tsx`

**Intent**: Skeleton przypominający poziomy pas (kilka prostokątów w rzędzie), nie wysoki pionowy blok.

**Contract**: Zachować strukturę nagłówka + tabela + poziomy pasek placeholder.

### Success Criteria:

#### Automated Verification:

- [ ] `pnpm lint`
- [ ] `pnpm build:ci`

#### Manual Verification:

- [ ] Desktop: oś przewija się poziomo gdy wiele etapów; kolejność zgodna z datami.
- [ ] Mobile (DevTools): przewijanie palcem, tekst notki czytelny.
- [ ] Plan bez notki na etapie — karta bez bloku „Wskazówka”.
- [ ] Polski copy; brak regresji kosztorysu.

## Phase 5: Docs and handoff

### Overview

Zamknąć unknowns roadmapy i przygotować pod implement review.

### Changes Required:

#### 1. Change notes

**File**: `context/changes/horizontal-timeline-coaching/change.md`

**Intent**: Po implementacji: `status: implemented`, krótki Notes z decyzją layoutu.

**Contract**: Aktualizacja ręczna na końcu `/10x-implement` (nie w tej fazie planu).

#### 2. Roadmap (optional, po archive)

**File**: `context/foundation/roadmap.md`

**Intent**: S-08 → `done` przez `/10x-archive`, nie w tym planie.

### Success Criteria:

#### Manual Verification:

- [ ] Przejście E2E: ankieta → plan → harmonogram poziomy + 3 notki widoczne na typowym planie pełnym.
- [ ] `/10x-impl-review horizontal-timeline-coaching` gotowy do uruchomienia.

## Open Risks & Assumptions

- **Copy PL:** Treści notek w seedzie wymagają Twojej akceptacji językowej — łatwa poprawka bez zmiany kodu.
- **Gęstość osi:** Przy 15+ etapach oś może być długa — akceptowane (scroll); ewentualne skrócenie etykiet w S-09.
- **CI bez DB:** `build:ci` nie weryfikuje kolumny; pełny `pnpm build` lokalnie po migracji.

## References

- `context/changes/horizontal-timeline-coaching/research.md`
- `context/foundation/roadmap.md` — S-08
- `context/foundation/prd.md` — FR-006, Success Criteria guardrails
- `context/foundation/lessons.md` — API routes, owner-only migrate
- `context/archive/2026-05-27-plan-generation/plan.md` — pierwotna spec timeline

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Schema, migration, seed

#### Automated

- [x] 1.1 Dodać `coachingNote` do `ConstructionStage` w `schema.prisma`
- [x] 1.2 Dodać plik migracji SQL

#### Manual

- [ ] 1.3 Owner: `pnpm db:migrate` + `pnpm db:seed` + potwierdzenie agentowi

### Phase 2: API and DTO

#### Automated

- [x] 2.1 Rozszerzyć `PlanResultsStageDto` o `coachingNote`
- [x] 2.2 Zaktualizować `GET .../results` (select + mapowanie)

### Phase 3: Timeline layout utilities

#### Automated

- [x] 3.1 Dodać `src/lib/plan/layout-timeline-stages.ts` (sort + tracks + totalSpan)

### Phase 4: Horizontal timeline UI

#### Automated

- [x] 4.1 Przebudować `plan-timeline.tsx` (pozioma oś + notki)
- [x] 4.2 Poszerzyć wrapper strony planu do `max-w-6xl`
- [x] 4.3 Zaktualizować `loading.tsx` skeleton

#### Manual

- [ ] 4.4 Smoke: desktop + mobile, plan z równoległymi etapami, widoczność 3 notek

### Phase 5: Docs and handoff

#### Manual

- [ ] 5.1 E2E smoke ankieta → plan; przygotować impl-review
