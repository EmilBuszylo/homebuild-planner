# Artifact 1 — Territory (raport roboczy)

> Status: **roboczy** · Wygenerowano: 2026-06-12 · Zaktualizowano: analiza git (180 commitów)  
> Źródła: `git log --name-only`, `context/archive/`, `context/foundation/roadmap.md`, metadane change

## Metoda

1. **Historia produktowa** — `change.md` w archiwum (28 zmian, 2026-05-25 → 2026-06-12).
2. **Aktywność w git** — 180 commitów z listą plików (`git log --name-only`); ok. 188 obiektów w `rev-list` (niewielka rozbieżność merge/rebase).
3. **Uwaga o zakresie czasu:** commity w bieżącym clone mają daty wyłącznie z **2026-06**; aktywność z **maja 2026** jest widoczna w archiwum change, ale nie w datach git (prawdopodobny rebaseline historii). Poniższe procenty dotyczą dostępnej historii git; sekcja „stale aktywne” łączy oba źródła.

### Filtr szumu (stosowany w analizie kodu)

| Kategoria | Wzorce / pliki | Commity (szac.) | Dlaczego odfiltrować |
|---|---|---|---|
| Lockfile | `pnpm-lock.yaml` | 10 (~5,5%) | Automatyczny output `pnpm install`; nie sygnalizuje intencji produktowej |
| Snapshoty testów | `*.snap`, `__snapshots__/` | 0 | Brak w repo (Vitest bez snapshotów) |
| Pliki generowane | `node_modules/`, `.next/`, `@prisma/client` | 0 w git | Poza repo; `prisma generate` w postinstall |
| Dokumentacja change | `context/changes/**`, `context/archive/**`, `context/foundation/**` | 118 / 35 / 45 katalogów | Artefakty workflow 10x, nie runtime |
| Agent infra | `.cursor/hooks/**`, `.cursor/hooks.json` | 66 katalog `.cursor/` | Konfiguracja Cursor; nie produkt |
| Masowe formatowanie | brak dedykowanych commitów | — | Nie wykryto commitów typu „format only” |
| Lokalizacje / copy PL | `src/lib/copy/**`, `src/lib/questionnaire/hints/pl.ts` | 9 obszarów | Tekst UI, nie logika; zmiany towarzyszą feature, nie definiują terytorium |
| Assety statyczne | `public/*.svg` | ≤2 | Rzadko ruszane |
| Root meta | `AGENTS.md`, `package.json` | 16 / 15 | Onboarding i manifest; osobna warstwa „build/meta” |

**Analiza „kodu produktowego”** poniżej: wyklucza `context/**`, `AGENTS.md`, `.cursor/**`, lockfile.

---

## 1. Stale aktywne katalogi i pliki (ostatnie miesiące)

### Definicja „stale aktywny”

Katalog lub plik pojawia się w **≥10 commitach** (≈5,5% historii) albo w **≥3 zarchiwizowanych change'ach** z maja–czerwca 2026.

### Rdzeń runtime — katalogi (git, bez szumu)

| Commity | % commitów | Katalog | Rola |
|---:|---:|---|---|
| 38 | 21% | `src/lib/plan-generation/` | Silnik kosztorysu i harmonogramu |
| 32 | 18% | `src/app/(app)/` | Panel: dashboard, ankieta, plan |
| 31 | 17% | `src/components/questionnaire/` | UI ankiety |
| 25 | 14% | `prisma/` | Schema + seed (baza wiedzy) |
| 24 | 13% | `e2e/` | Testy przeglądarkowe |
| 24 | 13% | `src/app/api/` | Publiczne Route Handlers |
| 18 | 10% | `src/lib/validations/` | Schematy Zod (wejście API/ankieta) |
| 15 | 8% | `src/app/(auth)/` | Logowanie, rejestracja, Server Actions |
| 14 | 8% | `src/lib/api/` | Testy handlerów + fetch helper |
| 13 | 7% | `src/components/plan/` | Kosztorys, timeline, notatki, kalendarz |
| 11 | 6% | `src/lib/plan/` | Persystencja wersji, layout timeline |
| 11 | 6% | `src/lib/questionnaire/` | Mapowanie odpowiedzi, hints |
| 11 | 6% | `prisma/migrations/` | Migracje SQL |
| 10 | 6% | `src/components/app/` | Shell panelu |

### Rdzeń runtime — pojedyncze pliki (≥7 commitów)

| Commity | Plik |
|---:|---|
| 13 | `prisma/seed.ts` |
| 11 | `src/components/questionnaire/questionnaire-form.tsx` |
| 10 | `src/app/(auth)/actions.ts` |
| 9 | `prisma/schema.prisma` |
| 9 | `src/app/(app)/plan/[planId]/page.tsx` |
| 8 | `src/lib/validations/questionnaire.ts` |
| 8 | `src/app/(app)/questionnaire/page.tsx` |
| 7 | `src/components/plan/plan-timeline.tsx` |
| 7 | `src/app/(app)/dashboard/page.tsx` |
| 6 | `src/lib/api/plans-route-handlers.test.ts` |
| 6 | `src/middleware.ts` |

### Fale aktywności (krótkotrwałe, nie „stale”)

| Katalog | Commity | Okno | Uwagi |
|---|---|---|---|
| `src/lib/google-calendar/` | 6 | 2026-06-11..12 | Burst S-04; nie rdzeń historyczny |
| `src/lib/plan-generation/test-fixtures/` | 6 | 2026-06-09..10 | Kalibracja S-01; oracle fixtures |
| `src/app/api/integrations/google/` | 4 | 2026-06-12 | OAuth + callback |

### Potwierdzenie z archiwum (maj 2026, poza datami git)

Te same terytoria wracają w wielu change'ach mimo braku commitów z maja w clone:

- `plan-generation`, `questionnaire`, `prisma/seed`, `validations/questionnaire` — w 8+ change'ach MVP
- `(auth)/`, `middleware`, `supabase/` — auth wiring + user sync
- `components/plan/`, `(app)/plan/` — timeline, coaching, polish

---

## 2. Katalogi i pliki zmieniające się razem (co-change)

Analiza par katalogów występujących w **tym samym commicie** (kod produktowy, bez `context/` i `.cursor/`).

### Pary silnie skorelowane (≥5 commitów)

| Commity | Para | Interpretacja |
|---:|---|---|
| 7 | `src/lib/api/` ↔ `src/lib/validations/` | Nowe API = nowy schemat wejścia + test handlera |
| 6 | `prisma/` ↔ `prisma/migrations/` | Zmiana schematu zawsze z migracją |
| 6 | `prisma/` ↔ `src/lib/validations/` | Nowe pytania / enumy → Zod + seed/schema |
| 5 | `src/components/questionnaire/` ↔ `src/lib/validations/` | Ankieta UI + walidacja w lockstep |
| 5 | `prisma/` ↔ `src/components/questionnaire/` | Seed pytań + formularz |
| 5 | `src/app/(app)/` ↔ `src/components/questionnaire/` | Strona ankiety + komponenty |
| 5 | `src/app/(app)/` ↔ `src/components/app/` | Panel: layout + treść stron |
| 5 | `src/components/plan/` ↔ `src/lib/copy/` | Widok planu + copy orientacyjne (PL) |
| 5 | `e2e/` ↔ `playwright.config.ts` | Nowe specy + konfiguracja |
| 5 | `package.json` ↔ `prisma/` | Nowe zależności przy zmianach DB (np. googleapis) |

### Pary umiarkowane (4 commity)

| Para | Interpretacja |
|---|---|
| `src/app/api/` ↔ `src/lib/api/` | Route handler + test/helper |
| `prisma/` ↔ `src/lib/plan-generation/` | Seed stawek / modyfikatory + silnik |
| `src/app/(app)/` ↔ `src/lib/format/` | Prezentacja dat/walut na stronach planu |
| `src/components/plan/` ↔ `src/lib/format/` | Tabela kosztów + formatowanie PLN |

### Named stacks (współwystępowanie plików w commitach)

| Commity | Stack | Pliki reprezentatywne |
|---:|---|---|
| 10 | **Ankieta end-to-end** | `questionnaire-form` + `validations/questionnaire` (+ często seed) |
| 4 | **API + testy handlerów** | `src/app/api/plans/**` + `src/lib/api/*-route-handlers.test.ts` |
| 4 | **Silnik + dane** | `plan-generation/**` + `prisma/seed.ts` lub `schema.prisma` |
| 4 | **Ankieta stack (strict)** | form + validation + `prisma/seed.ts` w jednym commicie |
| 3 | **Plan view** | `plan/[planId]/page.tsx` + `plan-timeline.tsx` |
| 1 | **Calendar export** | `google-calendar/*` + `api/integrations/google/*` (jeden duży feature commit) |

### Implikacja terytorialna

Naturalne **granice zmiany** (powinny iść razem):

```
prisma/ (schema + seed + migrations)
    ↔ src/lib/validations/
    ↔ src/components/questionnaire/ + src/app/(app)/questionnaire/
    ↔ src/lib/plan-generation/ (przy nowych modyfikatorach/stawkach)

src/app/api/plans/*
    ↔ src/lib/api/*.test.ts
    ↔ src/lib/plan/persist-plan-version.ts

src/app/(app)/plan/*
    ↔ src/components/plan/*
    ↔ src/lib/copy/ + src/lib/format/
```

---

## 3. Przecięcia aktywności z warstwami systemowymi

Liczba poniżej = **commity dotykające plików danej warstwy** (plik może należeć do wielu warstw).

| Warstwa | Dotknięć plików | Top katalogi | Cross-layer (≥3 commity z…) |
|---|---:|---|---|
| **Runtime** | 283 | `plan-generation/`, `(app)/`, `components/questionnaire/` | — |
| **Auth** | 24 | `(auth)/`, `middleware.ts`, `supabase/` | + runtime (**14**), + build (**5**) |
| **Data** | 37 | `prisma/`, `migrations/`, `prisma.ts` | + runtime (**12**), + build (**5**), + public-api (**4**) |
| **Public API** | 24 | `src/app/api/` (plans, health, integrations) | + runtime (**11**), + build (**4**) |
| **Integrations** | 6 | `google-calendar/`, `api/integrations/google/` | Burst końców czerwca; jeszcze mało cross-layer |
| **Build / CI** | 111 | `package.json`, `.github/workflows/`, `next.config.ts`, `playwright.config.ts`, `.cursor/` | + runtime (**15**) |

### Mapa przecięć (gdzie aktywność „ przecina ” warstwy)

```
                    BUILD (package.json, ci.yml, next.config)
                         │
           ┌─────────────┼─────────────┐
           │             │             │
        AUTH          RUNTIME       DATA
    (auth)/         (app)/lib/      prisma/
    middleware      components/     seed/schema
    supabase        plan-gen
           │             │             │
           └──────┬──────┴──────┬──────┘
                  │             │
             PUBLIC API    INTEGRATIONS
             app/api/      google-calendar/
                             integrations/
```

**Hot spots cross-layer** (najczęstsze miejsca regresji):

1. **Nowe pytanie ankiety** — data (seed) + validations + runtime (UI) + czasem plan-generation; czasem API plans POST.
2. **Nowy endpoint planu** — public-api + validations + lib/api tests + auth (ownership).
3. **Kalibracja kosztów** — data (seed) + plan-generation + test-fixtures + e2e risk-04.
4. **Nowa integracja** — public-api + integrations lib + data (migracja tokenów) + build (nowa zależność w package.json).
5. **E2E / CI** — build (ci.yml, playwright) + runtime (e2e specs) + czasem auth setup.

### Pliki na styku warstw (multi-layer by design)

| Plik | Warstwy |
|---|---|
| `src/app/(auth)/actions.ts` | auth + data (upsert User) + runtime |
| `src/app/api/plans/route.ts` | public-api + auth + data + runtime (persist) |
| `src/app/api/plans/[planId]/recalculate/route.ts` | public-api + auth + data + rate-limit |
| `src/middleware.ts` | auth + runtime (routing) |
| `src/lib/plan/persist-plan-version.ts` | runtime + data + plan-generation |
| `prisma/seed.ts` | data + definicja wejścia ankiety (coupling z validations) |

---

## 4. Szum — co odfiltrować przy mapowaniu terytorium

### Zawsze wykluczać z „aktywności produktowej”

| Typ | Przykłady | Sygnał |
|---|---|---|
| Lockfile | `pnpm-lock.yaml` | 10 commitów; towarzyszy `package.json`, googleapis, Sentry |
| Wygenerowane | `.next/`, `node_modules/`, Prisma Client | Nie w git |
| Snapshoty | — | Brak w projekcie |
| Agent hooks | `.cursor/hooks/*` | 66 commitów katalogu; utrzymanie DX, nie feature |
| Change workflow | `context/changes/*/plan.md` | Do 30 edycji `roadmap.md`; planowanie, nie kod |
| Archiwum | `context/archive/**/change.md` | Metadane po merge |

### Wykluczać z heatmapy, ale linkować kontekstowo

| Typ | Przykłady | Uwagi |
|---|---|---|
| Lokalizacje PL | `src/lib/copy/orientational.ts`, `questionnaire/hints/pl.ts` | 5–9 commitów; copy UI, nie architektura |
| `.env.example` | 7 commitów | Dokumentacja env; cross z foundation docs |
| `AGENTS.md` | 16 commitów | Onboarding agentów |
| Assety `public/` | SVG | Statyczne, marginalne |

### Niska wartość dla mapy terytorialnej (osobna oś „infra”)

| Typ | Pliki |
|---|---|
| Build | `package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs` |
| CI | `.github/workflows/ci.yml`, `deploy.yml` |
| E2E config | `playwright.config.ts` |
| Docker | `docker-compose.yml` |

### Commity do ignorowania przy liczeniu „hot spots”

- `chore(archive):*` — przeniesienie change do archiwum
- `chore(*): record phase N progress SHA` — metadane planu, często bez kodu
- Commity dotykające **wyłącznie** `context/**`

---

## Fazy produktowe (chronologia)

| Okres | Faza | Charakter |
|---|---|---|
| 2026-05-19 → 2026-05-21 | Shaping & bootstrap | PRD, tech-stack, scaffold Next.js 16 |
| 2026-05-25 → 2026-05-29 | MVP core | Auth, schema, ankieta, generowanie planu, landing, timeline |
| 2026-06-01 → 2026-06-03 | MVP polish + test rollout | Vitest, panel polish, test cookbook |
| 2026-06-08 → 2026-06-09 | Infra & quality gate | Sentry, E2E w CI, roadmap v3 |
| 2026-06-09 → 2026-06-12 | Roadmap v3 | Kalibracja, przyłącza, dach, notatki, kalendarz |

## Historia zmian (archiwum) — skrót

28 zarchiwizowanych change'ów; pełna tabela w poprzedniej wersji raportu. Kluczowe mapowanie change → stale terytoria:

| Change ID | Stale terytoria utrwalone |
|---|---|
| `domain-schema-and-seed`, `plan-generation` | `prisma/`, `plan-generation/` |
| `questionnaire-flow`, `questionnaire-refinements`, `questionnaire-hints` | `components/questionnaire/`, `validations/questionnaire.ts` |
| `supabase-auth-wiring`, `user-model-sync` | `(auth)/`, `middleware.ts`, `supabase/` |
| `edit-and-recalculate` | `api/plans/*`, `plan/persist-plan-version.ts` |
| `cost-calibration`, `utility-connections`, `questionnaire-roof-type` | `seed.ts`, `plan-generation/`, `stage-filter.ts` |
| `timeline-notes` | `PlanStageNote`, `stage-notes` API, `stage-note-controls.tsx` |
| `calendar-export` | `google-calendar/`, `integrations/google/` |

## Aktywne obszary (stan na 2026-06-12)

- **W locie:** brak feature change'ów (`context/changes/` = tylko `bootstrap-verification/`).
- **Roadmap v3:** wszystkie slice'y `done`.
- **Niedawno gorące (burst, nie stale):** Google Calendar, timeline notes, kalibracja silnika.

## Mapa terytorialna (domeny → kod)

```
┌─────────────────────────────────────────────────────────────────┐
│  MARKETING          AUTH              APP PANEL                 │
│  page.tsx           (auth)/           (app)/                    │
│  landing/*          middleware        dashboard, questionnaire, │
│                                       plan/[planId]             │
└──────────┬──────────────┬─────────────────────┬─────────────────┘
           │              │                     │
           ▼              ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  API ROUTES (src/app/api/)                                      │
│  plans · results · recalculate · stage-notes · calendar-export  │
│  integrations/google/* · health/*                               │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DOMAIN LIB (src/lib/)                                          │
│  plan-generation · plan-refinement · questionnaire · plan       │
│  google-calendar · validations · rate-limit · observability   │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│  DATA (prisma/) — knowledge base (seed) + user data (runtime)   │
└─────────────────────────────────────────────────────────────────┘
```

## Niewyjaśnione / do weryfikacji

- [ ] Pełna historia git z maja — niedostępna w datach commitów; czy istnieje remote z niesquashowaną historią?
- [ ] Roadmap v4 po zamknięciu v3?
- [ ] Czy `.cursor/` (66 commitów) powinien wejść do osobnej warstwy „agent DX” w finalnej mapie?

## Następny krok

Połączyć z artifact-2: przypisać **stale terytoria** do **modułów strukturalnych** i oznaczyć pary co-change jako oficjalne „bounded contexts” w `repo-map.md`.
