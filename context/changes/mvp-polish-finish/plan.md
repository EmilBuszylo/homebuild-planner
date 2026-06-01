# MVP Polish Capstone (S-10) Implementation Plan

## Overview

Domknięcie fazy post-MVP polish: użytkownik odbiera produkt jako **spójne, gotowe MVP** — jeden język „orientacyjny”, powtarzalne disclaimery, zsynchronizowane etykiety KPI oraz drobne poprawki mobile na ścieżce landing → auth → panel → ankieta → plan. Bez nowych funkcji produktowych (FR-007, FR-010) i bez S-11 (kosztorys/timeline UX).

**Input:** `context/changes/mvp-polish-finish/research.md`

## Current State Analysis

- S-07–S-09 i F-07 dostarczyły hinty, poziomy timeline, shell panelu i Vitest.
- Copy disclaimera w **5+ wariantach** (`landing-trust`, `landing-footer`, `orientational-disclaimer`, `plan-cost-table`, dashboard echo).
- KPI: `plan-snapshot-card` vs `plan-summary-strip` — różne etykiety tych samych pól.
- Ankieta: brak disclaimera przed submit; „wstępny plan” zamiast „orientacyjny”.
- Metadata: root OK; `/`, auth bez `metadata`; app tylko `title`.
- Mobile: drobne niespójności padding/typography/CTA (research).

## Desired End State

1. **Jedno źródło prawdy** dla tekstów orientacyjnych/disclaimer w `src/lib/copy/orientational.ts` (lub równoważna ścieżka).
2. **Każda kluczowa powierzchnia** ma spójny przekaz: landing, panel (pusty + snapshot), ankieta (intro + podsumowanie), plan (bez trzykrotnego powtórzenia tego samego akapitu).
3. **Etykiety KPI** identyczne na dashboardzie i stronie planu.
4. **Metadata PL** na `/`, logowaniu, rejestracji; `description` na stronach app.
5. **CTA/routing:** `signOut` → `routes.login`; rejestracja — jedna forma „Załóż konto”.
6. **Mobile:** wyrównany padding header/shell, `sm:text-3xl` na ankieta, pełna szerokość przycisków nawigacji na mobile, opcjonalne `loading.tsx` dla panelu i ankiety.
7. `pnpm lint`, `pnpm test`, `pnpm build:ci` — zielone.

### Key Discoveries:

- `OrientationalDisclaimer` (`src/components/app/orientational-disclaimer.tsx`) — dobry kandydat na wrapper UI; treść z modułu copy.
- `landing-trust.tsx` — najpełniejszy trust band; zsynchronizować bullet 1 i 3 z modułem.
- Plan page: subtitle + disclaimer + cost footer — do deduplikacji w Phase 2.
- Research: nie zmieniać logiki timeline/kosztorysu (S-11).

## What We're NOT Doing

- S-11: scalony widok kosztorys+timeline, wykresy, grupowanie etapów, gęstość osi timeline.
- Parked: iteracja hintów (roadmap v3), Playfair/breadcrumbs, migracja `(marketing)/`.
- FR-007 notatki użytkownika, FR-010 kalendarz, OAuth.
- Open Graph / Twitter cards (tylko `title` + `description` wystarczą na MVP).
- E2E, nowe testy Vitest (chyba że wyciągnięcie copy do czystych helperów — nie wymagane).
- Zmiana treści hintów w `hints/pl.ts` (poza słowem „orientacyjny” w intro ankiety jeśli dotyczy).

## Implementation Approach

**Copy-first:** Phase 1 wprowadza moduł stringów + aktualizuje komponenty marketing/plan table. Phase 2–3 podpinają app i metadata. Phase 4 mobile. Phase 5 checklista zamknięcia z research (manual matrix).

### Plan decisions (from research — closed)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Plan disclaimer stack | `OrientationalDisclaimer` + cost-table **krótka** stopka prawna (bez powtórzenia pełnego akapitu); **usunąć** redundantny subtitle na planie lub skrócić do opisu funkcji (bez „orientacyjny”) | Source: Research |
| Register CTA | **„Załóż konto”** wszędzie (login cross-link: „Nie masz konta? Załóż konto”) | Source: Research |
| Metadata | `title` + `description` na `/`, auth, app; bez OG | Source: Research |
| Questionnaire disclaimer | **Intro** (1 zdanie) + **pełny** blok na kroku Podsumowanie przed submit | Source: Research |
| Panel CTA marketing vs app | **Zostawić:** „Przejdź do panelu” (landing) vs „Panel” (nav) — różne konteksty | Source: Plan |
| KPI labels | „Łączny koszt orientacyjny”, „Planowany start”, „Etapy w planie” | Source: Research |

## Phase 1: Shared copy module

### Overview

Centralizacja tekstów orientacyjnych/disclaimer i etykiet KPI.

### Changes Required:

#### 1. Moduł copy

**File**: `src/lib/copy/orientational.ts` (nowy)

**Intent**: Jedno miejsce na stringi używane w UI; komponenty importują stałe.

**Contract**: Eksportować co najmniej:
- `ORIENTATIONAL_DISCLAIMER_PARAGRAPH` — treść obecnego `orientational-disclaimer.tsx`
- `ORIENTATIONAL_TRUST_HEADING` — „Orientacyjnie, na podstawie Twoich odpowiedzi”
- `ORIENTATIONAL_TRUST_BULLETS` — tablica 3 stringów (zsynchronizowana z landing-trust)
- `ORIENTATIONAL_FOOTER_LINE` — jedna linia na footer landing
- `COST_TABLE_DISCLAIMER`, `COST_TABLE_REFINED_APPENDIX` — obecne stałe z `plan-cost-table.tsx` (sformułowanie „orientacyjne indeksy rynkowe” bez ang. „cache” jeśli możliwe po polsku, np. „zapisane indeksy rynkowe”)
- `KPI_LABELS` — `{ totalCost, plannedStart, stageCount }` po polsku

#### 2. Komponent disclaimer

**File**: `src/components/app/orientational-disclaimer.tsx`

**Intent**: Renderować `ORIENTATIONAL_DISCLAIMER_PARAGRAPH` z modułu (bez duplikacji stringa).

**Contract**: API komponentu bez zmian (`export function OrientationalDisclaimer()`).

#### 3. Marketing trust + footer

**Files**: `src/components/marketing/landing-trust.tsx`, `landing-footer.tsx`

**Intent**: Import bulletów i footer line z modułu copy.

**Contract**: Zachować strukturę HTML/sekcji; tylko źródło tekstu się zmienia.

#### 4. Cost table

**File**: `src/components/plan/plan-cost-table.tsx`

**Intent**: Import disclaimer strings z modułu.

**Contract**: Zachowanie logiki `refinementApplied`; tylko stałe tekstowe z modułu.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- Landing trust/footer i plan cost footer brzmią spójnie (czytelność PL)

**Implementation Note**: Po automated OK — pause na manual Phase 1 przed Phase 2.

---

## Phase 2: App surfaces — panel, ankieta, plan

### Overview

Podłączyć copy module do dashboardu, ankiety i strony planu; deduplikacja; KPI labels.

### Changes Required:

#### 1. KPI labels

**Files**: `src/components/app/plan-snapshot-card.tsx`, `plan-summary-strip.tsx`

**Intent**: Użyć `KPI_LABELS` z modułu copy — identyczne etykiety.

**Contract**: Trzy pola: łączny koszt, data startu, liczba etapów.

#### 2. Dashboard

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Empty-state CardDescription i ewentualnie krótka linia trust pod snapshot — z modułu (`ORIENTATIONAL_TRUST_HEADING` lub paragraph skrócony), nie ad-hoc string.

**Contract**: Bez zmiany logiki snapshot/error/empty.

#### 3. Questionnaire

**Files**: `src/app/(app)/questionnaire/page.tsx`, `src/components/questionnaire/questionnaire-summary.tsx`

**Intent**:
- Intro: zamienić „wstępny plan” na język orientacyjny (zgodny z modułem).
- Podsumowanie: przed przyciskiem submit — `<OrientationalDisclaimer />` lub paragraph z modułu + krótka linia „Zatwierdzając, akceptujesz…” **nie** — tylko disclaimer orientacyjny (bez ToS — poza scope).

**Contract**: Disclaimer widoczny na ostatnim kroku; nie psuje layoutu narrow shell.

#### 4. Plan page dedupe

**File**: `src/app/(app)/plan/[planId]/page.tsx`

**Intent**: Usunąć lub skrócić subtitle (`88-90`) tak, by nie powtarzał `OrientationalDisclaimer`; zostawić `OrientationalDisclaimer` + sekcje wyników.

**Contract**: Nagłówek strony nadal czytelny (np. tylko „Twój plan budowy” w `h1`).

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- Przejście: panel pusty → ankieta → podsumowanie (disclaimer) → plan (bez „ściany tekstu”)
- Mobile 375px: ankieta + plan czytelne

**Implementation Note**: Pause na manual przed Phase 3.

---

## Phase 3: Metadata, auth CTAs, routing

### Overview

Polskie metadata na brakujących trasach; spójne CTA rejestracji; `signOut` przez `routes`.

### Changes Required:

#### 1. Home metadata

**File**: `src/app/page.tsx`

**Intent**: `export const metadata` — title (np. „Planer budowy domu” lub krótszy marketingowy) + `description` (może reuse root description z `layout` lub import wspólnego stringa).

**Contract**: Nie duplikować długiego opisu w 3 miejscach — opcjonalnie `SITE_DESCRIPTION` w `src/lib/copy/site.ts` lub w `orientational.ts` sibling.

#### 2. Auth pages metadata

**Files**: `src/app/(auth)/login/page.tsx`, `register/page.tsx`

**Intent**: `metadata.title` + `metadata.description` po polsku.

**Contract**: Template z root layout dodaje sufiks `| Planer budowy domu`.

#### 3. App page descriptions

**Files**: `dashboard/page.tsx`, `questionnaire/page.tsx`, `plan/[planId]/page.tsx`

**Intent**: Dodać `description` do istniejącego `metadata` (1 zdanie PL per strona).

#### 4. Login form CTA

**File**: `src/components/auth/login-form.tsx`

**Intent**: Link rejestracji: **„Załóż konto”** (nie „Zarejestruj się”).

#### 5. signOut redirect

**File**: `src/app/(auth)/actions.ts`

**Intent**: `redirect(routes.login)` zamiast hardcoded `"/logowanie"`.

**Contract**: Import `routes` z `@/lib/routes`.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- Zakładki przeglądarki: `/`, `/logowanie`, `/rejestracja`, `/panel` — sensowne tytuły PL
- Wyloguj → URL `/logowanie` w pasku (rewrite)

---

## Phase 4: Mobile polish i loading

### Overview

Drobne poprawki responsive bez redesignu S-09; skeletony dla spójności z plan page.

### Changes Required:

#### 1. Shell / header padding

**Files**: `src/components/app/app-page-shell.tsx`, `app-header.tsx`

**Intent**: Wyrównać horizontal padding — header i shell ten sam pattern (`px-4 sm:px-6`).

**Contract**: Bez zmiany `max-w-6xl`.

#### 2. Questionnaire typography + nav

**Files**: `src/app/(app)/questionnaire/page.tsx`, `step-navigation.tsx`

**Intent**: `h1` z `sm:text-3xl`; przyciski Wstecz/Dalej/Submit `w-full sm:w-auto` w `flex-col sm:flex-row` jak dashboard.

#### 3. Loading skeletons (opcjonalne ale w scope)

**Files**: `src/app/(app)/dashboard/loading.tsx`, `questionnaire/loading.tsx` (nowe)

**Intent**: Prosty skeleton spójny z `plan/[planId]/loading.tsx` (nagłówek + karty).

**Contract**: Bez nowych zależności.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm build:ci`

#### Manual Verification:

- iPhone szerokość ~390px: header wyrównany, ankieta CTA pełna szerokość
- Nawigacja do `/panel` i `/ankieta` — krótki flash skeleton akceptowalny

---

## Phase 5: Capstone verification

### Overview

Checklista zamknięcia S-10 — potwierdzenie „gotowego MVP” z roadmapy.

### Changes Required:

#### 1. Checklist w change notes (opcjonalnie)

**File**: `context/changes/mvp-polish-finish/change.md` → `## Notes`

**Intent**: Po implementacji — krótka lista „verified” (owner).

**Contract**: Nie wymagane do merge kodu; można w manual verification.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- [ ] Landing → rejestracja → ankieta → plan: ten sam ton „orientacyjny”
- [ ] Disclaimer na podsumowaniu ankiety przed submit
- [ ] Plan: nie więcej niż 1 pełny akapit disclaimer + krótka stopka tabeli
- [ ] Dashboard snapshot i plan strip — te same etykiety KPI
- [ ] Mobile: panel, ankieta, plan używalne bez poziomego scroll poza timeline (OK)
- [ ] Brak angielskich zdań UI w przejściu happy path

---

## Testing Strategy

### Unit Tests:

- Brak nowych testów wymaganych (copy-only). Uruchomić istniejące `pnpm test`.

### Integration Tests:

- Brak.

### Manual Testing Steps:

1. Gość: `/` → trust/footer copy
2. Rejestracja → ankieta (nowy user) → podsumowanie + disclaimer → plan
3. Edycja ankiety → przelicz → plan (disclaimer + refinement banner jeśli benchmarki)
4. Panel z snapshot — etykiety vs plan strip
5. Wyloguj / zaloguj — ścieżki PL

## Performance Considerations

Copy-only + metadata — brak wpływu na generację planu. Loading skeletons — minimalny koszt RSC.

## Migration Notes

Brak migracji DB. Deploy: standard Vercel build (test w CI już jest).

## References

- Research: `context/changes/mvp-polish-finish/research.md`
- Roadmap S-10: `context/foundation/roadmap.md`
- PRD Success Criteria: `context/foundation/prd.md`
- Prior panel: `context/archive/2026-06-01-app-panel-polish/`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Shared copy module

#### Automated

- [x] 1.1 `pnpm lint` — d25065d
- [x] 1.2 `pnpm test` — d25065d
- [x] 1.3 `pnpm build:ci` — d25065d

#### Manual

- [x] 1.4 Landing trust/footer i plan cost footer — spójny ton PL — d25065d

### Phase 2: App surfaces — panel, ankieta, plan

#### Automated

- [x] 2.1 `pnpm lint` — 5a44470
- [x] 2.2 `pnpm test` — 5a44470
- [x] 2.3 `pnpm build:ci` — 5a44470

#### Manual

- [ ] 2.4 Happy path panel → ankieta → plan (desktop)
- [ ] 2.5 Happy path mobile ~375px

### Phase 3: Metadata, auth CTAs, routing

#### Automated

- [x] 3.1 `pnpm lint` — 5cab010
- [x] 3.2 `pnpm build:ci` — 5cab010

#### Manual

- [ ] 3.3 Tytuły zakładek PL na `/`, auth, `/panel`
- [ ] 3.4 Wyloguj → `/logowanie`

### Phase 4: Mobile polish i loading

#### Automated

- [x] 4.1 `pnpm lint` — 1c49728
- [x] 4.2 `pnpm build:ci` — 1c49728

#### Manual

- [ ] 4.3 Header/shell padding + ankieta CTA na wąskim viewport

### Phase 5: Capstone verification

#### Automated

- [ ] 5.1 `pnpm lint`
- [ ] 5.2 `pnpm test`
- [ ] 5.3 `pnpm build:ci`

#### Manual

- [ ] 5.4 Checklista zamknięcia S-10 (6 punktów w planie) — wszystkie OK
