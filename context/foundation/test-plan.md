# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-06-02 (Phase 2 rollout complete)

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
   team is worried about X, and the failure would surface somewhere in
   <area>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/` (excludes `prisma/`,
`context/`, build output). Confirmed 2026-06-02; 48 commits / 30d.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | Zalogowany użytkownik otwiera URL z cudzym identyfikatorem planu i widzi cudzy kosztorys/timeline (brak sprawdzenia własności). | High | High | interview Q1; PRD retention danych planu; hot-spot dir `src/app/(app)/plan/[planId]` (4 commits/30d) |
| 2 | Zmiana warstwy auth powoduje masowe wylogowanie lub brak dostępu do chronionych tras mimo poprawnej sesji. | High | Medium | interview Q2; PRD FR-001/FR-002 |
| 3 | Po zmianie współczynników benchmarków generowanie/przelicz zwraca oczywiście błędne lub absurdalne koszty/timeline, a UI nadal wygląda jak sukces. | High | High | interview Q3; PRD FR-008; hot-spot dir `src/app/(app)/questionnaire` (6 commits/30d) |
| 4 | Ścieżka „wygeneruj plan” kończy się pustym, niekompletnym lub niespójnym wynikiem bez czytelnego błędu dla użytkownika. | High | High | interview Q4; PRD US-01; PRD success metric ≤100s |
| 5 | Po edycji odpowiedzi i przeliczeniu użytkownik nadal widzi stare etapy/koszty (przelicz nie odzwierciedla stanu ankiety). | High | Medium | PRD FR-005; interview Q3/Q4 |
| 6 | Serwer przyjmuje payload ankiety sprzeczny z regułami (wymagane pominięte, opcjonalne złe typy) i i tak generuje plan. | Medium | Medium | PRD FR-003/FR-004; abuse lens (untrusted input) |
| 7 | Użytkownik omija limit pełnych przeliczeń i wielokrotnie uruchamia kosztowne przeliczenie. | Medium | Medium | PRD operational limit; hot-spot dir `src/lib/rate-limit` (1 commit/30d); sparse existing unit coverage |

Cloud-provider or Supabase outage is intentionally out of scope for automated
tests; treat as observability/alerting if needed later.

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|----------------------------|----------------|--------------------------------------|-----------------------|------------------------|
| #1 | Żądanie planu dla ID należącego do innego konta zwraca 403/404 i nie eksponuje treści; własny plan działa. | „Zalogowany” = „może zobaczyć ten plan”. | Entry point planu po ID, model własności w DB, shape odpowiedzi błędu. | Integration (handler/action + auth fixture) | Happy-path tylko z własnym ID |
| #2 | Chroniona trasa bez sesji → redirect/login; poprawna sesja nie ginie po typowej nawigacji. | Lokalny dev zawsze = prod cookies. | Middleware/layout auth, cookie refresh, lista tras publicznych. | Integration lub targeted manual smoke | E2E każdej strony panelu |
| #3 | Znana zmiana wejścia zmienia sumę/kolejność etapów w przewidywalnym kierunku względem niezależnego oracle (PRD/reguła). | Assert równy aktualnemu outputowi z kodu. | Benchmark pipeline, źródło współczynników, granice zaokrągleń. | Unit z oracle z wymagań/fixture | Kopiowanie formuły z implementacji |
| #4 | Wywołanie generowania z minimalnym poprawnym payloadem tworzy niepusty kosztorys + timeline albo jawny błąd. | 200 OK = poprawny plan. | API/route generowania, wymagane pola, timeout handling. | Integration (mock DB/AI jeśli trzeba) | Playwright całego kwestionariusza |
| #5 | Po zmianie odpowiedzi przelicz zmienia wynik zgodny z diff wejścia. | Rate-limit test = pełna ochrona przeliczu. | Kolejność: zapis ankiety → przelicz → odczyt planu. | Integration | Test tylko licznika limitu |
| #6 | Niepoprawny payload → 4xx, brak nowego planu w DB. | Walidacja tylko w RHF wystarczy. | Server schema vs client schema parity. | Unit (zod/server) + integration | Duplikat testów każdego pola UI |
| #7 | Po przekroczeniu limitu kolejne przeliczenie odrzucone z czytelnym komunikatem (PL). | „Funkcja istnieje” bez liczenia prób. | Limit per user, window, komunikat błędu. | Unit + integration | Mock wszystkiego poza assertem true |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Access control & ownership | Prove plan isolation and stable auth on protected routes | #1, #2, #6 (server validation slice) | integration, unit (validation) | complete | testing-access-control-ownership |
| 2 | Generation & recalc integrity | Oracle-backed benchmark tests plus generate/recalc integration | #3, #4, #5, #7 | unit, integration | complete | testing-generation-recalc-integrity |
| 3 | Questionnaire hot-spot hardening | Regressions in high-churn questionnaire flow | #6, cross #4 | unit, integration | not started | — |
| 4 | Cookbook & CI floor | Fill §6 patterns; align §5 gates with what ships | cross-cutting | cookbook + minimal gaps | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | ^3.2.4 | `pnpm test` / `vitest.config.mts`; colocate `*.test.ts` in `src/lib/` per AGENTS.md |
| API mocking | none yet | — | See §3 Phase 2; research picks MSW or in-process mocks |
| e2e | none (by policy) | — | AGENTS.md: no Playwright without explicit request; interview Q5 excludes full-panel E2E |
| accessibility | none yet | — | Not in MVP rollout |
| AI-native | none | n/a | No phase justified under cost × signal for current MVP |

**Stack grounding tools (current session):**

- Docs: none (Context7 / framework docs MCP not available in current session); checked: 2026-06-02
- Search: none (Exa / web search MCP not used for this write); checked: 2026-06-02
- Runtime/browser: none; checked: 2026-06-02
- Provider/platform: Linear + GitLab MCP (auth/issue only, not used for test design); checked: 2026-06-02

**Test-base profile:** growing — Vitest configured; unit tests in `plan-generation/`,
`plan/`, `plan-refinement/`, `rate-limit/`; handler integration in
`src/lib/api/plans-route-handlers.test.ts`.

## 5. Quality Gates

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint + typecheck | local + CI (`.github/workflows/ci.yml`) | required | syntactic / type drift |
| unit (`pnpm test`) | local + CI | required | pure logic regressions in `src/lib/` |
| production build (`pnpm build:ci`) | CI | required | compile / Next build breaks |
| integration (handlers, auth, ownership) | local + CI | required (Phases 1–2 shipped) | IDOR, auth, generate/recalc, rate limit |
| e2e (Playwright) | — | excluded unless explicitly requested | — |
| post-edit hook | — | not planned | — |
| visual diff / multimodal review | — | excluded per interview Q5 | — |
| pre-prod smoke | manual | recommended before deploy | see `context/changes/testing-access-control-ownership/MANUAL-SMOKE.md` |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section fills in when the
relevant rollout phase ships.

### 6.1 Adding a unit test

- **Location**: colocate `*.test.ts` next to the module under `src/lib/` (e.g. `src/lib/plan-generation/generate-plan-results.test.ts`).
- **Pure logic**: import the function under test directly; no Prisma, no HTTP.
- **Fixtures**: shared inputs in `test-fixtures/` subfolders (e.g. `src/lib/plan-generation/test-fixtures/minimal-stages.ts`, `src/lib/api/test-fixtures/questionnaire-payload.ts`).
- **Directional oracle (Risk #3)**: assert relationships from requirements/fixture constants (e.g. larger `area` → higher total cost; `PREMIUM` > `ECONOMY`). Do **not** copy production formulas as the expected value.
- **Run**: `pnpm test` (no database).

### 6.2 Adding an integration test (API route handlers)

- **Location**: `src/lib/api/plans-route-handlers.test.ts` (extend this file for new plan API behavior).
- **Pattern**: `vi.hoisted` mocks + `vi.mock` for `@/lib/supabase/server` and `@/lib/prisma` in the **same test file** (Vitest cannot export hoisted mocks from a separate module). Import route `GET`/`POST` handlers after mocks.
- **Auth fixture**: `asUser("user-id")` / `asAnonymous()` — sets `createClient().auth.getUser` mock.
- **Ownership denial (Risk #1)**: caller session user A, `planFindUnique` returns `userId: B` → expect **404**, `{ error: "Nie znaleziono planu" }`, response must **not** include success fields (`stages`, `totalCost`). Do not assert only 200 on own-id happy path.
- **Unauthenticated (Risk #2)**: `asAnonymous()` → **401**, `{ error: "Brak autoryzacji" }`, Prisma not called.
- **Invalid body (Risk #6)**: authenticated + Zod-invalid payload → **400** with `details`, `prisma.$transaction` not called.
- **Generation (Risk #4)**: mock `$transaction` with fake `tx` that runs real `persistPlanVersionWithResults`; assert `planStageResult.createMany` received ≥1 row with `estimatedCost > 0` on golden `POST /api/plans`.
- **Recalc delta (Risk #5)**: two `invokeRecalculate` calls with different `area`; compare sums from captured `createMany` payloads (strict inequality).
- **Rate limit (Risk #7)**: `vi.mock("@/lib/rate-limit/plan-recalc")`; `checkPlanRecalcLimit` → `{ allowed: false, ... }` → **429** + PL error; `planStageResult.createMany` not called.
- **Shared payload**: `src/lib/api/test-fixtures/questionnaire-payload.ts` (`validQuestionnairePayload`).
- **Reference tests**: ownership, 401, and 400 cases in `plans-route-handlers.test.ts`; schema unit tests in `src/lib/validations/questionnaire-inputs.test.ts`.
- **Run locally**: `pnpm test` (no database; mocks only).

### 6.3 Adding an e2e test

Excluded by default (AGENTS.md + interview Q5). Do not add Playwright without
an explicit product decision recorded outside this guide.

### 6.4 Adding a test for a new API route or Server Action

- **Test type**: handler-level integration with mocks (preferred over Playwright).
- **Pattern**: add cases to `src/lib/api/plans-route-handlers.test.ts` or a sibling `src/lib/api/<area>-route-handlers.test.ts` using the same mock pattern as §6.2.
- **Invoke**: `new Request(...)` + `{ params: Promise.resolve({ planId }) }` for dynamic segments.
- **When to add e2e instead**: only if failure mode requires full browser cookies + middleware (see §6.3).

### 6.5 Adding a test for benchmark / generation logic

- **Engine unit (Risk #3)**: `src/lib/plan-generation/generate-plan-results.test.ts` — `generatePlanResults` + `minimalStagesForGeneration` + directional asserts (see §6.1).
- **Persist boundary (Risk #4)**: `src/lib/plan/persist-plan-version.test.ts` — fake `Prisma.TransactionClient`; assert `planStageResult.createMany` row count and costs without HTTP.
- **Benchmark refinement**: `src/lib/plan-refinement/apply-market-benchmarks.test.ts` — multiplier behavior on fixed stage rows.
- **HTTP complement**: extend `plans-route-handlers.test.ts` for POST create / recalc / 429 (§6.2); do not duplicate full pipeline in every layer — pick the cheapest layer that still signals the risk.
- **Oracle rule**: expected direction comes from PRD/requirements or fixture constants, not from re-invoking the same implementation under test.

### 6.6 Per-rollout-phase notes

**Phase 1 (access control & ownership):** Handler tests mock Prisma — they do not catch a missing `userId` check in a new route. When adding plan APIs, copy the ownership assert from §6.2. Manual middleware/session checks live in `context/archive/2026-06-02-testing-access-control-ownership/MANUAL-SMOKE.md` (not automated).

**Phase 2 (generation & recalc integrity):** `POST /api/plans` can return **201** with zero `PlanStageResult` rows when generation filters to empty stages — documented in `persist-plan-version.test.ts` and handler Risk #4 regression tests; follow-up GET results returns **404**. A product guard (reject create when `results.length === 0`) is optional and not shipped in this rollout. Research: `context/changes/testing-generation-recalc-integrity/research.md`.

## 7. What We Deliberately Don't Test

Exclusions from Phase 2 interview Q5. Re-evaluate if assumptions change.

- **Marketing / landing pages** — low blast radius, rare changes. (interview Q5)
- **Full-panel UI snapshots** — brittle on Tailwind churn, low signal. (interview Q5)
- **Generated Prisma client / types** — generator is source of truth. (interview Q5)
- **Pixel-perfect mobile timeline layout** — prefer cost/sort logic tests (existing sort unit test direction). (interview Q5)
- **Playwright E2E of entire questionnaire** — expensive; server integration covers generate/recalc signal. (AGENTS.md + interview Q4/Q5)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-06-02
- Stack versions last verified: 2026-06-02
- AI-native tool references last verified: 2026-06-02 (none in use)

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
