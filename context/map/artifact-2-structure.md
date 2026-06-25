# Artifact 2 — Structure (raport roboczy)

> Status: **roboczy** · Wygenerowano: 2026-06-12 · Zaktualizowano: analiza grafu dependency-cruiser  
> Metoda: `pnpm depcruise src` (168 modułów, 489 krawędzi wewnętrznych) + `--focus` / `--reaches` / reguła `no-circular`  
> Konfiguracja: `.dependency-cruiser.js` · Regeneracja grafu: `pnpm depcruise:graph`

## Pytanie prowadzące

**Co realnie zależy od czego?** — nie lista importów, lecz blast radius, lokalne centra i cienkie wejścia.

---

## 1. Mapa warstw i kontraktów między nimi

Warstwy logiczne (z bucketów grafu) i **pliki-kontrakty**, przez które przepływają zależności:

```
┌─────────────── entry (pages, API, middleware) ───────────────┐
│  cienkie: 0← wchodzi nic (Next.js entry)  wychodzi wiele →   │
└────────────┬─────────────────────────────────────────────────┘
             │ używa kontraktów ↓
┌────────────┴─────────────────────────────────────────────────┐
│  contracts                                                    │
│  validations/*  plan-results.ts  routes.ts  types/domain.ts   │
│  investment-state.ts                                          │
└────────────┬─────────────────────────────────────────────────┘
             │
    ┌────────┼────────┬──────────────────┐
    ▼        ▼        ▼                  ▼
 engine/   engine/  presentation/    auth/data/
 plan-gen  plan/    format, copy      supabase, prisma
 plan-ref  questionnaire
    │                 │
    └────────┬────────┘
             ▼
      integrations/calendar
```

### Kontrakty między warstwami

| Kontrakt | Plik | Co stabilizuje | Kto importuje (bezpośrednio) |
|---|---|---|---|
| **Wejście ankiety / API** | `validations/questionnaire.ts` | `QuestionnaireInputs`, enumy, Zod — wspólny język UI ↔ silnik ↔ API | 18 modułów: `questionnaire-form`, `stage-filter`, `compute-costs`, `persist-plan-version`, route handlers |
| **Wynik planu (DTO)** | `plan-results.ts` | `PlanResultsDto`, `PlanResultsStageDto`, `PlanStageNoteDto` | 14 modułów: UI planu, `fetch-plan-results`, API results, kalendarz |
| **Routing PL** | `routes.ts` | Stałe ścieżki `/panel`, `/ankieta`, … | 15 modułów: marketing, auth, app shell, middleware |
| **Model domeny (typy DB)** | `types/domain.ts` | Re-eksport enumów/modeli Prisma dla silnika | 8 modułów: `plan-generation/types`, seed parity |
| **Kolejność stanów inwestycji** | `investment-state.ts` | Logika `FROM_SCRATCH` → `DEVELOPER` | 6 modułów: validations, stage-filter, UI ankiety |
| **Auth (sesja)** | `supabase/server.ts` | `createClient()` server-side | 15 modułów: API routes, RSC pages, actions |
| **Silnik (public API)** | `plan-generation/index.ts` | 6 funkcji pure + typy wejścia/wyjścia | 5 modułów: `persist-plan-version`, refinement, testy |
| **Orkiestracja zapisu** | `plan/persist-plan-version.ts` | Jedyny most silnik → DB tx | 2 route handlers: `POST /api/plans`, `POST .../recalculate` |
| **Auth forms** | `validations/auth.ts` | Schematy login/register | formularze auth, actions |

### Najczęstsze krawędzie między warstwami (cross-layer)

| # | Z | Do | Znaczenie |
|---|---|---|---|
| 11 | `ui/primitives` | `utils.ts` | shadcn → `cn()` — coupling prezentacji |
| 10 | `entry/app-pages` | `ui/app` | RSC składa shell |
| 9 | `entry/api` | `auth/supabase` | Każdy handler weryfikuje sesję |
| 7 | `entry/api` | `integrations/calendar` | OAuth + eksport |
| 5 | `ui/questionnaire` | `contracts/validations` | Formularz ↔ schemat |
| 5 | `entry/api` | `data/prisma` | Persystencja w handlerach |
| 5 | `entry/api` | `engine/plan` | persist, notes, load |

**Wniosek:** kontrakty **`validations/questionnaire`** i **`plan-results`** to dwa główne „API wewnętrzne” — zmiana pola w Zod lub DTO ma najszerszy promień.

---

## 2. Cienkie wejścia vs głębsze centra

### Cienkie wejścia (0 dependents, wiele zależności wychodzących)

Next.js App Router: strony/route/middleware **nie są importowane** — są liśćmi grafu od strony „kto od nich zależy”, ale **korzeniem** od strony runtime.

| Plik | ← dependents | → deps | Rola |
|---|---:|---:|---|
| `(app)/plan/[planId]/page.tsx` | 0 | 14 | Składanie widoku planu (RSC) |
| `(app)/dashboard/page.tsx` | 0 | 13 | Lista planów + prisma bezpośrednio |
| `(app)/questionnaire/page.tsx` | 0 | 9 | Server: pytania z DB + client form |
| `page.tsx` (landing) | 0 | 7 | Marketing entry |
| `api/plans/route.ts` | 1 | 6 | Golden path POST |
| `api/.../recalculate/route.ts` | 1 | 7 | Przeliczenie + rate limit |
| `middleware.ts` | 0 | 3 | Auth gate |

**Blast radius wejść:** zmiana w page.tsx **nie łamie** importów w głąb repo (nikt ich nie importuje), ale zmiana **kompozycji** (jakie lib/components woła) dotyka całego podgrafu w dół.

### Lokalne centra (wysoki fan-in — „kto od tego zależy”)

| Moduł | ← direct | ← transitive | Typ centrum |
|---|---:|---:|---|
| `utils.ts` (`cn()`) | 21 | 43 | **Prezentacja** — każdy shadcn primitive |
| `validations/questionnaire.ts` | 18 | 19 | **Kontrakt domenowy** — ankieta + silnik |
| `supabase/server.ts` | 15 | — | **Auth runtime** |
| `routes.ts` | 15 | 20 | **Nawigacja** |
| `plan-results.ts` | 14 | 18 | **DTO hub** — UI + API + kalendarz |
| `prisma.ts` | 13 | 27 | **Data access** — API + wybrane RSC |
| `plan-generation/index.ts` | 5 | 4 | **Fasada silnika** — wąski direct, głęboki podgraf w dół |
| `persist-plan-version.ts` | 3 | 2 | **Orkiestrator zapisu** — wąski most API↔silnik↔DB |

### Głębokie centra wewnętrzne (stabilny rdzeń, fan-in ≥ 3 w `src/lib`)

| Moduł | ← in | → out | Uwagi |
|---|---:|---:|---|
| `plan-generation/types.ts` | 9 | 1 | Typy silnika — leaf typologiczny, wysoki fan-in |
| `plan-generation/stage-filter.ts` | 3 | 3 | Filtr etapów wg odpowiedzi |
| `plan-generation/compute-costs.ts` | 3 | 5 | Koszt per etap |
| `persist-plan-version.ts` | 3 | 3 | Jedyny writer wyników generacji |

### Wizualizacja: entry → kontrakt → centrum

```
plan/[planId]/page.tsx          api/plans/route.ts
   │  (0←, 14→)                    │  (1←, 6→)
   ├─ fetch-plan-results ────────────┼─ validations/questionnaire
   │       └─ plan-results ◄────────┼─ persist-plan-version
   ├─ plan-timeline ────────────────┤       ├─ plan-generation/index
   │       └─ plan-results          │       ├─ plan-refinement
   └─ supabase/server               │       └─ prisma (tx)
                                    └─ supabase/server
```

---

## 3. Cykle i podejrzane zależności

### Cykle

| Źródło | Wynik |
|---|---|
| Reguła `no-circular` (`.dependency-cruiser.js`) | ✔ 0 naruszeń |
| DFS na grafie prod (125 modułów, bez testów) | **0 cykli** |

Graf jest **acykliczny** w warstwie produkcyjnej.

### Podejrzane / warte uwagi (nie cykle, ale coupling)

| Obserwacja | Pliki | Ryzyko |
|---|---|---|
| **RSC → prisma bezpośrednio** | `dashboard/page`, `questionnaire/page`, `(app)/layout` | Obejście warstwy API — OK w Next RSC, ale duplikuje wzorzec auth+DB z route handlers |
| **investment-state → `@prisma/client`** | `investment-state.ts` | Kontrakt domenowy zależy od typu ORM; silnik i Zod ciągną za sobą Prisma przez ten moduł |
| **plan-refinement → plan-generation/index** | `apply-market-benchmarks.ts` | Refinement importuje fasadę silnika (nie odwrotnie) — kierunek OK, ale refinement nie jest leaf |
| **UI nie importuje silnika bezpośrednio** | — | ✔ ankieta idzie przez `validations/questionnaire` |
| **plan-generation nie importuje prisma** | reguła `plan-generation-stays-pure` | ✔ egzekwowane w depcruise |
| **Google OAuth hub** | `google-oauth.ts` (6←, 3→) | Mały, izolowany podgraf integracji; niski fan-in poza API |

### Jedyny „miękki” most refinement ↔ engine

```
persist-plan-version
    → plan-generation/index → … (pure)
    → apply-market-benchmarks → plan-generation/index  (powrót do fasady, nie do persist)
```

Brak cyklu: `persist` nie jest importowany z refinement.

---

## 4. Blast radius — co pęknie przy zmianie

Transitive dependents = moduły prod osiągalne **wstecz** po krawędziach importu (bez testów).

| Zmieniasz… | Direct ← | Transitive ← | Co najpewniej pęknie |
|---|---:|---:|---|
| **`utils.ts`** | 21 | 43 | Wszystkie komponenty UI (klasy Tailwind) |
| **`validations/questionnaire.ts`** | 18 | 19 | Ankieta UI, silnik (filter/costs/map), API plans, persist |
| **`plan-results.ts`** (DTO) | 14 | 18 | Timeline, kosztorys, dashboard card, fetch helper, kalendarz, API results |
| **`routes.ts`** | 15 | 20 | Linki w marketing/auth/app + middleware redirect |
| **`prisma.ts`** | 13 | 27 | Wszystkie API routes, RSC z DB, auth actions, OAuth |
| **`persist-plan-version.ts`** | 3 | 2 | Tylko `POST /api/plans` i `POST .../recalculate` (+ testy) |
| **`plan-generation/index.ts`** | 5 | 4 | persist, refinement, testy pipeline |
| **`generate-plan-results.ts`** | 1 | 5 | index → persist → API |
| **`investment-state.ts`** | 6 | 20 | Jak questionnaire validation — stany start/cel |

### Scenariusze zmian (praktyczne)

| Zmiana produktowa | Dotknięte centra | E2E / testy do odpalenia |
|---|---|---|
| Nowe pytanie ankiety | `validations/questionnaire`, `prisma/seed`, opcjonalnie `stage-filter` | `questionnaire-inputs.test`, `questionnaire-pipeline.test`, risk-04 |
| Nowy modyfikator kosztu | `seed`, `plan-generation/compute-costs`, `parse-modifier` | `compute-costs.test`, calibration oracle |
| Zmiana kształtu wyniku API | `plan-results.ts`, API results route, UI plan | `plans-route-handlers.test`, risk-04, risk-07 |
| Nowy endpoint planu | `validations/*`, `lib/api/*test`, route handler | nowy test handlera + risk-01 (IDOR) |
| Google Calendar | `google-calendar/*`, `integrations/google/*` | `calendar-export-route-handlers.test`, risk-08 |

---

## 5. Podgrafy domenowe (skondensowany graf)

### A. Generowanie planu (write path)

```
POST /api/plans
  → questionnaireInputsSchema
  → persistPlanVersionWithResults
       → prisma.$transaction
       → constructionStage.findMany
       → toQuestionnaireResponsesMap
       → generatePlanResults  [pure: filter → schedule → compute]
       → applyMarketBenchmarks
       → zapis PlanVersion + responses + stageResults
```

**Centrum operacyjne:** `persist-plan-version.ts` (3 direct dependents — tylko API).

### B. Odczyt planu (read path)

```
plan/[planId]/page (RSC)
  → fetchPlanResults → GET /api/.../results (internal fetch)
  → PlanResultsDto
  → plan-timeline / plan-cost-table
       → layout-timeline-stages, sort-plan-stages-chronologically
```

**Centrum kontraktu:** `plan-results.ts` — wspólny kształt read UI i API.

### C. Ankieta (UI ↔ silnik)

```
questionnaire/page → questionnaire-form
  → validations/questionnaire  ←── stage-filter, compute-costs, responses-map
  → question-hints → hints/pl.ts (copy, nie logika)
```

**Kontrakt:** Zod schema; silnik nigdy nie importuje komponentów.

### D. Integracje (izolowany)

```
calendar-export/route → export-stages-to-calendar
  → google-oauth, build-stage-events
  → plan-results (typy), load-plan-stage-notes
```

Fan-in `google-oauth`: 6 — mały, odseparowany blast radius.

---

## 6. Stack i entry pointy (skrót referencyjny)

| Warstwa | Technologia |
|---|---|
| Framework | Next.js 16 App Router |
| Auth | Supabase SSR |
| Data | Prisma 6 + PostgreSQL |
| Walidacja | Zod 4 |
| Graf zależności | dependency-cruiser 17 (`pnpm depcruise`) |

Pełna lista URL → plików: artifact-1 / sekcja entry pointów w poprzedniej wersji; nie duplikujemy tabeli HTTP — patrz `src/lib/routes.ts` + `next.config.ts` rewrites.

---

## 7. Reguły dependency-cruiser (egzekwowane)

| Reguła | Cel |
|---|---|
| `no-circular` | Brak cykli |
| `plan-generation-stays-pure` | Silnik bez prisma/supabase |
| `not-to-test-fixtures` | Prod nie importuje fixtures |
| `not-to-unresolvable` (+ wyjątek `next/*`) | Next.js subpaths |
| `not-to-dev-dep` (+ wyjątek `@sentry/nextjs`) | Sentry setup |

---

## 8. Niewyjaśnione / do weryfikacji

- [ ] Czy RSC z bezpośrednim `prisma` (dashboard, questionnaire page) powinno iść przez serwisową warstwę `plan/` dla spójności z API?
- [ ] `investment-state.ts` — przenieść typ `InvestmentState` do `types/domain.ts` i odciąć import `@prisma/client`?
- [ ] Metryki instability (`--metrics`) na poziomie folderów — folder `plan-generation` vs `components/questionnaire` (97% I) wymaga osobnej interpretacji w syntezie.

## Następny krok

Połączyć z artifact-1 (terytoria) i artifact-3 (kontrybutorzy) w `repo-map.md`: sekcja **„gdzie zmieniać X”** na bazie blast radius powyżej.

### Regeneracja analizy

```bash
pnpm depcruise                              # walidacja reguł
pnpm depcruise:graph                        # dependency-graph.dot (archi)
pnpm exec depcruise src --focus "plan-results" --output-type text
pnpm exec depcruise src --reaches "validations/questionnaire" --output-type text
```
