# App panel polish (S-09) Implementation Plan

## Overview

Dopracować warstwę `(app)` po S-07/S-08: spójny shell z landingiem, przyjazny **hub** na dashboardzie, hierarchia wizualna na stronie planu — bez nowych funkcji produktowych (FR-007, kalendarz, wykresy). Roadmap **S-09**; PRD **FR-006**, NFR mobile/desktop.

## Current State Analysis

- **`(app)/layout.tsx`** — tylko `AppHeader` + `{children}`; brak wspólnego kontenera treści.
- **`app-header.tsx`** — `max-w-4xl`, brak nawigacji (logo + wyloguj); nie sticky jak `landing-header.tsx`.
- **`dashboard/page.tsx`** — wyśrodkowany pionowo/poziomo (`justify-center`), `max-w-md`, tylko data utworzenia planu; brak podsumowania kosztów/harmonogramu.
- **`plan/[planId]/page.tsx`** — `max-w-6xl`, nagłówek + dwa `Card` (`PlanCostTable`, `PlanTimeline`); brak paska KPI; błędy bez CTA.
- **`questionnaire/page.tsx`** — ten sam wzorzec centrowania co dashboard.
- **Dane:** `fetchPlanResults(planId)` + `PlanResultsDto` (`totalCost`, `keyDate`, `stages`) już dostępne przez API — dashboard może je ponownie użyć zamiast duplikować Prisma.

### Key Discoveries:

- Wzorzec wizualny do skopiowania: `landing-header.tsx` (sticky, `max-w-6xl`, nav), `landing-trust.tsx` (disclaimer orientacyjny), `landing-benefits.tsx` (Card + ikona).
- `formatPln` w `src/lib/format/currency.ts` — użyć na dashboardzie i pasku podsumowania planu.
- MVP: jeden plan na użytkownika — `(app)/layout.tsx` może jednym zapytaniem Prisma pobrać `latestPlanId` i przekazać do nagłówka (link „Twój plan”).
- Brak `metadata` na stronach panelu — prosta poprawa w tej samej zmianie.

## Desired End State

Zalogowany użytkownik po wejściu na `/panel`:
1. Widzi **hub** u góry strony (nie wyśrodkowaną „kartę w pustce”): powitanie, stan planu (lub zachęta do ankiety).
2. Ma **nawigację** w nagłówku: Panel, Ankieta, opcjonalnie link do ostatniego planu.
3. Na stronie planu widzi **podsumowanie** (łączny koszt, data startu, liczba etapów) nad kosztorysem i timeline, plus krótki disclaimer jak na landingu.
4. Błędy planu i puste stany mają **CTA** (powrót do panelu, ankieta).

Weryfikacja: `pnpm lint`, `pnpm build:ci`, smoke desktop + mobile (panel → plan → ankieta).

## What We're NOT Doing

- Nowe funkcje: notatki etapów (FR-007), kalendarz (FR-010), wykresy, grupowanie kosztorysu, scalony widok timeline+koszt (→ **S-11**).
- Zmiany logiki generowania planu, API kontraktów poza ewentualnym wspólnym helperem odczytu snapshotu (preferowane: reuse `fetchPlanResults`).
- Vitest / E2E (F-07).
- Pełna migracja landing do `(marketing)/` — poza zakresem; tylko reuse wzorców wizualnych.
- Capstone copy/spójność całego produktu — **S-10**.

## Implementation Approach

1. **Shell first** — wyrównać nagłówek i layout treści (`max-w-6xl`, sticky), potem strony.
2. **Reuse danych** — dashboard z planem wywołuje `fetchPlanResults(plan.id)` (ten sam DTO co strona planu).
3. **Komponenty panelowe** w `src/components/app/` — `AppPageShell`, `PlanSummaryStrip`, opcjonalnie `OrientationalDisclaimer` (skrócona wersja trust band).
4. **Bez migracji DB** — wyłącznie UI/RSC.

## Critical Implementation Details

- **`AppHeader` a `planId`:** `(app)/layout.tsx` (Server Component) pobiera `prisma.plan.findFirst({ where: { userId }, orderBy: createdAt desc }, select: { id: true })` po `getUser()` i przekazuje `latestPlanId` do `AppHeader`. Jedno zapytanie na request panelu — akceptowalne dla MVP.
- **Dashboard + `fetchPlanResults`:** jeśli status `not_found` / `error` (np. plan bez wyników), pokaż hub z datą utworzenia i CTA jak dziś — nie blokuj panelu.
- **Nie centrować** treści ankiety/planu w pionie — `items-start`, `py-8`/`py-10`, spójne z landingiem.

## Phase 1: App shell & navigation

### Overview

Wspólny kontener treści i nagłówek spójny z landingiem; nawigacja w panelu.

### Changes Required:

#### 1. AppPageShell

**File**: `src/components/app/app-page-shell.tsx` (nowy)

**Intent**: Jednolity wrapper `mx-auto max-w-6xl px-6 py-8` (lub `py-10` na planie) — DRY dla stron `(app)`.

**Contract**: Eksport `AppPageShell({ children, className? })`; opcjonalny prop `width?: "default" | "narrow"` — ankieta `max-w-2xl` wewnątrz shell lub osobny wariant.

#### 2. AppHeader

**File**: `src/components/app/app-header.tsx`

**Intent**: Wyrównać do `landing-header.tsx`: `sticky`, `backdrop-blur`, `max-w-6xl`, focus ring na linku brandu.

**Contract**: Props: `latestPlanId?: string | null`. Nav: linki `Panel` (`routes.dashboard`), `Ankieta` (`routes.questionnaire`); gdy `latestPlanId` — link `Twój plan` (`routes.plan(latestPlanId)`). Zachować `SignOutButton`. Polskie etykiety.

#### 3. App layout

**File**: `src/app/(app)/layout.tsx`

**Intent**: Auth check nie jest w layout (zostaje per-page); pobrać `latestPlanId` dla zalogowanego użytkownika i przekazać do `AppHeader`.

**Contract**: `getUser()` → jeśli brak user, nie redirect w layout (strony robią redirect); jeśli user — `findFirst` plan → `<AppHeader latestPlanId={...} />`.

#### 4. Questionnaire page layout

**File**: `src/app/(app)/questionnaire/page.tsx`

**Intent**: Usunąć `justify-center` na pełnej wysokości; tytuł u góry, forma pod spodem w `AppPageShell` lub wąskim kontenerze.

**Contract**: Nagłówek wyrównany do lewej (`text-left`); zachować istniejącą logikę danych.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Nagłówek sticky, `max-w-6xl` zgodny z planem/landingiem
- Linki Panel / Ankieta / Twój plan (gdy jest plan) działają
- Ankieta: treść od góry, bez dużej pustej przestrzeni na desktop

**Implementation Note**: Po tej fazie owner potwierdza manualnie przed fazą 2.

---

## Phase 2: Dashboard hub

### Overview

Panel jako hub z kontekstem planu lub zachętą do ankiety.

### Changes Required:

#### 1. Dashboard layout & copy

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Top-aligned hub w `AppPageShell`; nagłówek „Witaj” / „Twój plan budowy” zamiast gołego „Panel”; email opcjonalnie mniejszą czcionką.

**Contract**: Usunąć `items-center justify-center` na `min-h-*`; użyć `AppPageShell`.

#### 2. Plan snapshot (gdy plan + wyniki)

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Po `findFirst` planu wywołać `fetchPlanResults(plan.id)`; przy `status === "ok"` pokazać kartę podsumowania.

**Contract**: Karta (`Card`): `formatPln(totalCost)`, `keyDate` (format PL), liczba `stages.length`; CTA primary → plan, outline → edycja ankiety. Data utworzenia planu jako metadane w karcie.

#### 3. Empty state

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Gdy brak planu — `Card` z krótkim opisem (echo landing hero) + CTA „Rozpocznij ankietę”.

**Contract**: Bez wyśrodkowania całego viewportu; spójny ton „orientacyjnie”.

#### 4. Plan snapshot component (opcjonalnie)

**File**: `src/components/app/plan-snapshot-card.tsx` (nowy, jeśli JSX rośnie)

**Intent**: Wydzielić kartę snapshotu dla czytelności dashboardu.

**Contract**: Props: `PlanResultsDto` + `planCreatedAt: Date`; tylko prezentacja.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Użytkownik z planem: widzi łączny koszt, datę startu, liczbę etapów, CTA do wyników
- Użytkownik bez planu: czytelna zachęta + jeden primary CTA
- Mobile: karta i przyciski bez horizontal overflow

**Implementation Note**: Po tej fazie owner potwierdza manualnie przed fazą 3.

---

## Phase 3: Plan page hierarchy & polish

### Overview

Strona wyników z KPI, disclaimerem, lepszymi stanami błędu i loadingiem.

### Changes Required:

#### 1. PlanSummaryStrip

**File**: `src/components/app/plan-summary-strip.tsx` (nowy)

**Intent**: Pasek nad `PlanCostTable`: 3 statystyki (łączny koszt, data rozpoczęcia, liczba etapów) w responsywnym gridzie (`grid-cols-1 sm:grid-cols-3`).

**Contract**: Props: `PlanResultsDto`; użyć `formatPln`, format daty `pl-PL`.

#### 2. OrientationalDisclaimer

**File**: `src/components/app/orientational-disclaimer.tsx` (nowy)

**Intent**: Kompaktowa wersja `landing-trust` — 1–2 zdania pod paskiem KPI lub nad tabelą.

**Contract**: Sekcja `text-sm text-muted-foreground`, bez duplikowania całej listy z landingu.

#### 3. Plan page composition

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: `AppPageShell` + `PlanSummaryStrip` + disclaimer + `Separator` + `PlanCostTable` + `PlanTimeline`; poprawić stany błędu.

**Contract**: `not_found` / `error`: `Card` lub blok z `Button` → `routes.dashboard`, opcjonalnie outline → ankieta. Sukces: kolejność jak wyżej.

#### 4. Loading skeleton

**File**: `src/app/(app)/plan/[planId]/loading.tsx`

**Intent**: Dopasować do nowego layoutu (pasek KPI + karty), `min-h` jak strona docelowa (`calc(100svh - 3.5rem)`).

#### 5. Route metadata

**Files**: `src/app/(app)/dashboard/page.tsx`, `questionnaire/page.tsx`, `plan/[planId]/page.tsx`

**Intent**: Eksport `metadata` z polskimi tytułami (np. „Panel”, „Ankieta”, „Twój plan budowy”).

**Contract**: `export const metadata: Metadata` per Next.js 16 App Router.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Plan: KPI widoczne nad kosztorysem; disclaimer czytelny; separator między sekcjami
- Błąd 404 planu: CTA powrót do panelu
- Loading bez skoku layoutu pod nagłówkiem
- Mobile: timeline nadal przewijalny poziomo; KPI w kolumnie

**Implementation Note**: Po tej fazie pełny smoke: panel → plan → edycja ankiety → przeliczenie.

---

## Testing Strategy

### Manual Testing Steps:

1. Konto bez planu: panel → ankieta → plan → panel pokazuje snapshot.
2. Konto z planem: nawigacja z nagłówka; edycja ankiety; powrót do planu.
3. Nieistniejący `planId` w URL: komunikat + CTA panelu.
4. DevTools ~375px: nagłówek, karty, timeline.
5. Wylogowanie z dowolnej strony `(app)`.

## Performance Considerations

- Layout: +1 lekkie zapytanie Prisma (`id` planu) — pomijalne.
- Dashboard z planem: +1 `fetchPlanResults` (internal fetch) — ten sam koszt co wejście na stronę planu; akceptowalne dla MVP.

## Migration Notes

Brak zmian schematu.

## References

- `context/foundation/roadmap.md` — S-09
- `context/foundation/prd.md` — FR-006, NFR
- `src/components/marketing/landing-header.tsx` — wzorzec nagłówka
- `src/components/marketing/landing-trust.tsx` — disclaimer
- `src/lib/api/fetch-plan-results.ts` — DTO wyników
- `context/archive/2026-05-28-horizontal-timeline-coaching/` — timeline (nie zmieniać logiki S-08)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: App shell & navigation

#### Automated

- [x] 1.1 Dodać `AppPageShell` i podpiąć w layout / ankiecie
- [x] 1.2 Odświeżyć `AppHeader` (sticky, nav, `latestPlanId`)
- [x] 1.3 `(app)/layout.tsx` — przekazanie `latestPlanId` do nagłówka

#### Manual

- [ ] 1.4 Smoke: nawigacja + ankieta od góry (desktop + mobile)

### Phase 2: Dashboard hub

#### Automated

- [ ] 2.1 Przebudować `dashboard/page.tsx` (hub, bez centrowania)
- [ ] 2.2 Snapshot planu przez `fetchPlanResults` + karta KPI
- [ ] 2.3 Empty state w `Card`

#### Manual

- [ ] 2.4 Smoke: panel z planem i bez planu

### Phase 3: Plan page hierarchy & polish

#### Automated

- [ ] 3.1 `PlanSummaryStrip` + `OrientationalDisclaimer`
- [ ] 3.2 Składać stronę planu + stany błędu z CTA
- [ ] 3.3 `loading.tsx` + `metadata` na stronach `(app)`

#### Manual

- [ ] 3.4 Smoke: plan → ankieta → przeliczenie; mobile timeline
