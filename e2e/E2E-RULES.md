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

# Authenticated specs (risk-02-session-*):
export E2E_USER_EMAIL=you@example.com
export E2E_USER_PASSWORD='YourP@ss1!'
pnpm test:e2e:risk-02
```

Anonymous specs (`risk-02-anonymous-*`) run without credentials — they only need `pnpm dev`.

## Anti-patterns (re-prompt by name)

1. **Hallucinated assertion** — asserting text/role not present in the app.
2. **Brittle selector** — class/id instead of role+name.
3. **Shared state** — tests depending on order or shared mutable IDs.
4. **Wait-for-time** — arbitrary delays instead of state.
5. **No cleanup** — orphaned DB rows after register/create flows.
