# E2E quality rules (home-build-planner)

Governing rules for Playwright specs under `e2e/`. Model every new test on `seed.spec.ts`.

## Locators

- **Default:** `getByRole` with accessible `name` (Polish UI copy from production).
- **Avoid:** CSS classes, `data-testid` (unless no semantic role exists), XPath.

## Waits

- **Do:** `waitForURL`, `expect(...).toBeVisible()`, `toHaveURL`.
- **Don't:** `waitForTimeout`, fixed `sleep`.

## Isolation

- **Unique data:** `e2e-<risk>-${TEST_RUN_ID}` prefixes for emails/fixtures.
- **Auth:** `e2e/auth.setup.ts` + `storageState` — don't log in via UI in every test.
- **Cleanup:** `afterAll` / dedicated teardown when tests mutate DB.

## Real vs mocked

- **Real:** middleware, Supabase cookies, Next.js routing, RSC pages, Prisma-backed flows.
- **Mock:** external HTTP APIs only (none in current MVP auth tests).

## Naming

- File: `risk-<NN>-<scenario>.spec.ts` tied to `test-plan.md` risk number.
- Test title: observable user outcome in Polish, references the risk scenario.

## Prerequisites

```bash
pnpm exec playwright install chromium   # once; scripts use PLAYWRIGHT_BROWSERS_PATH=0
pnpm db:docker:up                     # local Postgres
# .env.local: NEXT_PUBLIC_SUPABASE_*, SUPABASE_SECRET_KEY, DATABASE_URL

# Authenticated specs (risk-01, risk-02-session, risk-04, risk-07):
export E2E_USER_EMAIL=you@example.com
export E2E_USER_PASSWORD='YourP@ss1!'
pnpm test:e2e:risk-01   # needs foreign-plan.setup (victim user + plan in DB)
pnpm test:e2e:risk-02
pnpm test:e2e:risk-04   # uses fresh generate-user (no existing plan)
pnpm test:e2e:risk-07   # stage notes on timeline (same generate-user setup)
```

Anonymous specs (`risk-02-anonymous-*`) run without credentials — they only need `pnpm dev`.

Risk #1 setup creates a **second** victim account with a real plan (`foreign-plan.setup.ts`).
Risk #4 uses a dedicated generate-only user (`generate-user.setup.ts`) — not the full questionnaire UI.

## CI (GitHub Actions)

The `e2e` job in `.github/workflows/ci.yml` runs on every pull request and `push` to `master`, in parallel with the `ci` job (lint → Vitest → `build:ci`).

### Required GitHub secrets

Repository → **Settings → Secrets and variables → Actions** — add:

| Secret | Same as local `.env.local` |
|--------|---------------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes |
| `SUPABASE_SECRET_KEY` | yes |

Do **not** add `DATABASE_URL` / `DIRECT_URL` as secrets — the workflow sets them to the Postgres service container (`postgresql://homebuild:homebuild@localhost:5432/homebuild_planner`).

Until all three Supabase secrets are configured, the `e2e` job is expected to fail on auth setup.

### Supabase project settings (owner)

Use a dedicated Supabase project (or isolated preview) for CI:

1. **Authentication → Providers → Email:** disable “Confirm email” on sign-up (recommended). If left enabled, the app auto-confirms and signs in during `register` when `CI=true` and `SUPABASE_SECRET_KEY` is set.
2. **Authentication → URL configuration:** Site URL `http://localhost:3000`; Redirect URLs include `http://localhost:3000/**`.
3. Playwright `baseURL` is `http://localhost:3000` — match Supabase URLs to `localhost`, not `127.0.0.1`.

### What the job does

1. Start Postgres 16 service container (credentials match `docker-compose.yml`).
2. `pnpm install` → `playwright install chromium --with-deps` (`PLAYWRIGHT_BROWSERS_PATH=0`).
3. `prisma generate` → `prisma migrate deploy` → `pnpm db:seed`.
4. `pnpm test:e2e` with `TEST_RUN_ID=${{ github.run_id }}` for unique E2E user emails.
5. On failure: upload `playwright-report/` and `test-results/` artifacts (7-day retention).

### Local vs CI env

| Variable | Local | CI |
|----------|-------|-----|
| Postgres | Docker `127.0.0.1:55432` | Service container `localhost:5432` |
| Supabase | `.env.local` | GitHub secrets |
| `TEST_RUN_ID` | optional (`Date.now()` default) | `github.run_id` |

Vitest and `build:ci` do not need Supabase or a live DB; only the `e2e` job does.

## Anti-patterns (re-prompt by name)

1. **Hallucinated assertion** — asserting text/role not present in the app.
2. **Brittle selector** — class/id instead of role+name.
3. **Shared state** — tests depending on order or shared mutable IDs.
4. **Wait-for-time** — arbitrary delays instead of state.
5. **No cleanup** — orphaned DB rows after register/create flows.
