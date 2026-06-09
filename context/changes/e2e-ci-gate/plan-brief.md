# E2E CI Gate — Plan Brief

> Full plan: `context/changes/e2e-ci-gate/plan.md`
> Roadmap: `context/foundation/roadmap.md` (F-01)

## What & Why

Dodać job Playwright E2E do GitHub Actions CI, żeby istniejące specs (risk-01 IDOR, risk-02 auth, risk-04 generate golden path) uruchamiały się automatycznie na każdym PR. Dziś E2E działa tylko lokalnie (`pnpm test:e2e`); regresje w auth i ścieżce generowania nie są wykrywane przed merge — blokuje to bezpieczne wdrożenie S-01 (kalibracja kosztów) i kolejnych slices v3.

## Starting Point

- **Specs:** `e2e/risk-01-*.spec.ts`, `e2e/risk-02-*.spec.ts`, `e2e/risk-04-*.spec.ts` + setupy (`auth.setup.ts`, `foreign-plan.setup.ts`, `generate-user.setup.ts`)
- **Config:** `playwright.config.ts` — `webServer: pnpm dev`, `forbidOnly: CI`, retries=2 w CI, projekty zależnościowe
- **CI:** `.github/workflows/ci.yml` — lint → test → build:ci; **bez E2E**
- **Wymagania lokalne:** Postgres Docker (`pnpm db:docker:up`), Supabase env, `pnpm db:seed`, Playwright chromium

## Desired End State

Na każdym PR GitHub Actions uruchamia osobny job `e2e`: Postgres service container → `prisma migrate deploy` → `pnpm db:seed` → `pnpm test:e2e` z sekretami Supabase. Merge jest blokowany gdy którykolwiek risk spec pada. Dokumentacja (AGENTS.md, test-plan.md, E2E-RULES.md) opisuje wymagane sekrety i konfigurację Supabase dla CI.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|----------------|--------|
| Struktura CI | Osobny job `e2e` równoległy z `ci` | E2E trwa minuty — nie spowalnia lint/test/build; standardowy pattern dla Playwright w GHA | Plan |
| Zakres specs | Wszystkie risk-01, risk-02, risk-04 | Roadmap F-01 wymienia wszystkie trzy; specs już istnieją i są stabilne lokalnie | Roadmap |
| Baza w CI | Postgres 16 service container (jak docker-compose) | Izolowany DB per run; `migrate deploy` + seed — bez zewnętrznego Supabase Postgres | Plan |
| Auth w CI | Dedykowane sekrety GitHub → Supabase project | Setupy rejestrują prawdziwych użytkowników — mock auth nie pokrywa middleware + cookies | Plan |
| Trigger | `pull_request` + `push` master (jak `ci`) | Spójność z istniejącym workflow; ten sam gate na PR i po merge | Plan |

## Scope

**In scope:**
- Nowy job `e2e` w `.github/workflows/ci.yml`
- Postgres service container + migrate + seed w jobie
- Playwright chromium install w CI
- Sekrety env w workflow (dokumentacja dla ownera)
- Aktualizacja `test-plan.md`, `AGENTS.md`, `e2e/E2E-RULES.md`
- `TEST_RUN_ID` z `GITHUB_RUN_ID` w CI (izolacja użytkowników E2E)

**Out of scope:**
- E2E na Vercel deploy workflow
- Nowe specs (risk-05, pełna ankieta UI)
- MSW / mock Supabase
- Component tests, visual regression
- Zmiana `build:ci` (nadal bez DB)

## Architecture / Approach

```
PR opened → ci.yml
  ├─ job: ci (lint, vitest, build:ci)     — bez zmian
  └─ job: e2e (parallel)
       ├─ service: postgres:16-alpine
       ├─ env: DATABASE_URL, DIRECT_URL → localhost:5432
       ├─ secrets: NEXT_PUBLIC_SUPABASE_*, SUPABASE_SECRET_KEY
       ├─ steps: install → playwright install → migrate deploy → db:seed → test:e2e
       └─ playwright.config webServer starts pnpm dev against service DB + Supabase auth
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. CI workflow | Job `e2e` w GHA z Postgres + pełny suite | Supabase rate limits / email confirm blokują setupy |
| 2. Docs & owner setup | Sekrety, Supabase URL config, test-plan alignment | Owner musi ręcznie skonfigurować Supabase + GitHub secrets |

**Prerequisites:** Owner: dedykowany projekt Supabase (auto-confirm email, localhost w redirect URLs) + 3 sekrety w GitHub Actions.
**Estimated effort:** ~1–2 sesje, 2 fazy.

## Open Risks & Assumptions

- Supabase Auth musi mieć wyłączone potwierdzenie e-maila dla kont testowych CI — inaczej setupy rejestracji padną.
- Rate limit Supabase na sign-up może flakować przy równoległych rerunach — `workers: 1` w CI już ogranicza równoległość.
- `pnpm db:seed` w CI musi być deterministyczny (już jest upsert-based).
- Bez sekretów Supabase w GitHub job `e2e` pada — to oczekiwane; dokumentujemy kroki ownera.

## Success Criteria (Summary)

- PR z zielonym jobem `e2e` na GitHub Actions
- Celowy fail w middleware/auth jest wykrywany przez CI przed merge
- `pnpm lint`, `pnpm test`, `pnpm build:ci` nadal przechodzą bez zmian w jobie `ci`
