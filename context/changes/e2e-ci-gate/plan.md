# E2E CI Gate Implementation Plan

## Overview

Wire existing Playwright E2E specs (risk-01 IDOR, risk-02 auth/session, risk-04 generate golden path) into GitHub Actions CI as a parallel `e2e` job on every pull request. Today specs run only locally; this change closes roadmap v3 F-01 and unblocks downstream slices (S-01 cost calibration, S-03 timeline notes) that will touch auth and plan generation.

## Current State Analysis

- **Playwright:** `@playwright/test` ^1.60.0; config at `playwright.config.ts` with project graph (setup → authenticated/risk-01/risk-04), `webServer: pnpm dev`, CI-aware retries (`retries: 2`, `workers: 1`, `forbidOnly: true`).
- **Specs:** 5 spec files + 3 setup files under `e2e/`; `seed.spec.ts` ignored via `testIgnore`.
- **CI:** `.github/workflows/ci.yml` runs lint → vitest → `build:ci` only; no browser, no DB, no Supabase.
- **Local E2E deps:** Docker Postgres (`docker-compose.yml` port 55432), `.env.local` Supabase keys, `pnpm db:migrate` (owner) + `pnpm db:seed`, `playwright install chromium`.
- **test-plan.md:** §4 still lists e2e as "excluded unless explicitly requested" — outdated after roadmap v3 opt-in.

### Key Discoveries:

- Authenticated setups (`auth.setup.ts`, `foreign-plan.setup.ts`, `generate-user.setup.ts`) register real users via Supabase Auth UI/API — CI **cannot** mock auth without rewriting specs.
- Risk-04 and foreign-plan setup call `POST /api/plans` — requires seeded `QuestionDefinition` + `ConstructionStage` data (`pnpm db:seed`).
- `playwright.config.ts` already sets `forbidOnly: !!process.env.CI` and `reuseExistingServer: !process.env.CI` — minimal config changes expected.
- `e2e/.auth/` and `e2e/.fixtures/` are gitignored — generated fresh each CI run (good for isolation).
- `TEST_RUN_ID` env isolates email prefixes; default is `Date.now()` — should bind to `GITHUB_RUN_ID` in CI for traceability.

## Desired End State

After all phases:

1. Every PR triggers job `e2e` in `.github/workflows/ci.yml` alongside existing `ci` job.
2. Job provisions Postgres 16 service container, runs `prisma migrate deploy` + `pnpm db:seed`, installs Chromium, executes `pnpm test:e2e` with Supabase secrets from GitHub.
3. All projects pass: `anonymous`, `authenticated`, `risk-01`, `risk-04` (including setup dependencies).
4. Failed E2E blocks merge (required check).
5. Contributor docs describe required GitHub secrets and Supabase project settings for CI.

### Verification (end-to-end):

- Open a PR → GitHub Actions shows green `e2e` job.
- Introduce intentional auth redirect regression → `e2e` job fails on PR.

## What We're NOT Doing

- Adding new Playwright specs or expanding to full questionnaire UI walkthrough.
- Running E2E in Vercel `deploy.yml` or on production.
- Mocking Supabase Auth or Prisma in E2E for CI.
- Adding E2E to `build:ci` or changing the existing `ci` job steps.
- MSW, component tests, visual regression, or Playwright in pre-commit hooks.
- Creating GitHub secrets via automation — owner configures manually.

## Implementation Approach

1. Add parallel `e2e` job to `ci.yml` with Postgres service container matching `docker-compose.yml` credentials.
2. Pipeline: install → Playwright browser → `prisma generate` → `migrate deploy` → `db:seed` → `pnpm test:e2e`.
3. Pass Supabase env from GitHub secrets; set `TEST_RUN_ID=${{ github.run_id }}` for user isolation.
4. Optional: upload Playwright trace/report artifact on failure.
5. Align docs (`test-plan.md`, `AGENTS.md`, `E2E-RULES.md`) and document owner setup for Supabase + secrets.

## Critical Implementation Details

**Supabase CI project:** Use a dedicated Supabase project (or isolated preview project) with: (a) **Email confirmations disabled** for sign-up — otherwise `auth.setup.ts` register flow stalls; (b) **Site URL** `http://localhost:3000`; (c) **Redirect URLs** include `http://localhost:3000/**`. Document these in Phase 2 — owner-only configuration.

**Postgres service URL:** Both `DATABASE_URL` and `DIRECT_URL` must point at the service container (`postgresql://homebuild:homebuild@localhost:5432/homebuild_planner`). CI has no pooler — same pattern as local Docker.

**Job parallelism:** `e2e` job runs **in parallel** with `ci` job (no `needs:` dependency). Both must pass for a healthy PR; `e2e` is slower but does not block fast signal from lint/unit/build.

**Seed before E2E:** `pnpm db:seed` is required — risk-04 and API plan creation depend on `QuestionDefinition` and `ConstructionStage` rows. Seed uses upserts; safe to run every CI invocation.

## Phase 1: GitHub Actions E2E job

### Overview

Add `e2e` job to `.github/workflows/ci.yml` with Postgres service, migrations, seed, and full Playwright suite.

### Changes Required:

#### 1. E2E job in CI workflow

**File**: `.github/workflows/ci.yml`

**Intent**: Run Playwright E2E on every PR and push to `master`, parallel to existing `ci` job.

**Contract**: New job `e2e` with:
- `services.postgres`: image `postgres:16-alpine`, env `POSTGRES_USER/PASSWORD/DB` matching `docker-compose.yml`, healthcheck `pg_isready`.
- Job `env`: `DATABASE_URL` and `DIRECT_URL` → `postgresql://homebuild:homebuild@localhost:5432/homebuild_planner`; `TEST_RUN_ID: ${{ github.run_id }}`; `CI: true` (implicit in GHA).
- Job `env` from secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`.
- Steps (after checkout + pnpm + node setup mirroring `ci` job): `pnpm exec playwright install chromium --with-deps` → `pnpm exec prisma generate` → `pnpm exec prisma migrate deploy` → `pnpm db:seed` → `pnpm test:e2e`.
- On failure: `actions/upload-artifact@v4` for `test-results/` and/or Playwright trace dirs if present.

#### 2. Playwright CI reporter (optional thin)

**File**: `playwright.config.ts`

**Intent**: Improve debuggability when CI job fails without changing local dev experience.

**Contract**: When `process.env.CI` is set, add `['html', { open: 'never' }]` to `reporter` array (keep `list` for logs). Artifact upload step references `playwright-report/`.

#### 3. TEST_RUN_ID binding

**File**: `playwright.config.ts` (or rely solely on workflow `env`)

**Intent**: Ensure E2E user emails are unique per CI run and traceable to `github.run_id`.

**Contract**: Workflow sets `TEST_RUN_ID: ${{ github.run_id }}` at job level — setup files already read `process.env.TEST_RUN_ID`. No setup file changes required if workflow env is set.

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (55 tests — unchanged)
- `pnpm build:ci` passes
- YAML syntax valid (workflow file parses — verify via `actionlint` if available, or manual review)

#### Manual Verification:

- Owner adds GitHub secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`) from dedicated Supabase CI project
- Owner configures Supabase Auth: disable email confirmation, allow `localhost:3000` redirects
- Open test PR → `e2e` job runs and passes on GitHub Actions
- Re-run failed job on flaky run → passes or fails consistently (not random infra)

**Implementation Note**: After automated checks pass locally, pause for owner manual verification (secrets + first green CI run) before Phase 2 doc commit if secrets are not yet configured — Phase 1 code can land before secrets exist; job will fail until owner completes setup (documented in Phase 2).

---

## Phase 2: Documentation & owner setup runbook

### Overview

Align contributor docs with E2E-in-CI reality and give owner a checklist for Supabase + GitHub secrets.

### Changes Required:

#### 1. test-plan.md alignment

**File**: `context/foundation/test-plan.md`

**Intent**: Reflect that E2E is now a CI gate for risks #1, #2, #4 — no longer "excluded by policy".

**Contract**: Update §4 Stack table row `e2e` from "none (by policy)" to Playwright in CI on PR. Update §5 gates table: add `e2e (pnpm test:e2e)` row — local + CI, required on PR. Update §6.3 from "Excluded by default" to pointer: specs in `e2e/`, CI job in `ci.yml`, prerequisites in `e2e/E2E-RULES.md`. Add Freshness Ledger entry for this change.

#### 2. AGENTS.md pointer

**File**: `AGENTS.md`

**Intent**: Agents know E2E runs in CI and what env is required.

**Contract**: In Build/test section, extend existing E2E bullet: CI runs `e2e` job on PR (requires GitHub secrets + Supabase CI project per `e2e/E2E-RULES.md` §CI). Local `pnpm test:e2e` unchanged.

#### 3. E2E-RULES CI section

**File**: `e2e/E2E-RULES.md`

**Intent**: Single source for CI prerequisites — secrets, Supabase settings, what the job does.

**Contract**: New `## CI (GitHub Actions)` section listing:
- Required GitHub secrets (3 Supabase vars)
- Supabase project settings (auto-confirm, redirect URLs)
- Job steps summary (postgres service → migrate → seed → test:e2e)
- Note: without secrets, `e2e` job fails — expected until owner configures

#### 4. .env.example comment (optional)

**File**: `.env.example`

**Intent**: Cross-link local env with CI secrets naming.

**Contract**: Short comment block under Supabase section: "CI uses same three vars as GitHub Actions secrets — see `e2e/E2E-RULES.md` §CI."

### Success Criteria:

#### Automated Verification:

- `pnpm lint` passes (if any edited TS/MD triggers hooks, N/A for pure markdown)
- No broken internal doc links (manual grep for paths)

#### Manual Verification:

- Owner confirms Supabase CI project configured per E2E-RULES §CI
- Owner confirms three secrets visible in GitHub → Settings → Secrets → Actions
- New contributor can read E2E-RULES §CI and understand why local vs CI env differ

---

## Testing Strategy

### Unit Tests:

- No new unit tests — infrastructure change only.
- Existing Vitest suite must remain green (`pnpm test`).

### Integration Tests:

- E2E job **is** the integration gate for risks #1, #2, #4 in CI.
- Complements existing `plans-route-handlers.test.ts` mocked handler tests.

### Manual Testing Steps:

1. Configure Supabase CI project + GitHub secrets (owner).
2. Push branch, open PR — verify both `ci` and `e2e` jobs appear.
3. Confirm `e2e` passes with all Playwright projects green.
4. (Optional) Temporarily break middleware redirect — confirm `e2e` fails, revert.
5. Confirm `ci` job still passes independently (lint/test/build:ci).

## Performance Considerations

- E2E job adds ~5–10 min per PR (Postgres boot + migrate + seed + 3 setup flows + specs). Acceptable for roadmap v3 quality gate.
- `workers: 1` in CI limits parallelism — reduces Supabase sign-up rate-limit flakiness.
- `retries: 2` in CI handles transient network flakes.
- Parallel `ci` + `e2e` jobs — total wall clock ≈ max(ci, e2e), not sum.

## Migration Notes

- No database schema changes.
- No application code changes expected (workflow + docs only).
- Rollback: remove `e2e` job from `ci.yml`; revert doc updates.
- First PR after merge may fail until owner adds secrets — communicate in PR description.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- E2E rules: `e2e/E2E-RULES.md`
- Playwright config: `playwright.config.ts`
- CI workflow: `.github/workflows/ci.yml`
- Test plan: `context/foundation/test-plan.md` §5–§6
- Docker Postgres creds: `docker-compose.yml`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: GitHub Actions E2E job

#### Automated

- [x] 1.1 `pnpm lint` passes — c47cb2d
- [x] 1.2 `pnpm typecheck` passes — c47cb2d
- [x] 1.3 `pnpm test` passes — c47cb2d
- [x] 1.4 `pnpm build:ci` passes — c47cb2d

#### Manual

- [x] 1.5 Owner: GitHub secrets + Supabase CI project configured
- [x] 1.6 Test PR: `e2e` job green on GitHub Actions

### Phase 2: Documentation & owner setup runbook

#### Automated

- [x] 2.1 `pnpm lint` passes (if applicable)

#### Manual

- [x] 2.2 Owner: E2E-RULES §CI checklist complete; secrets verified in GitHub UI
