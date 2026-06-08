# Sentry Monitoring Implementation Plan

## Overview

Integrate **Sentry** (`@sentry/nextjs`) into home-build-planner so production and preview errors from server (API routes, Server Actions, RSC) and client (questionnaire/auth forms) are captured with readable stack traces. The app today logs failures only via `console.error` with no external tracking (`research.md`).

MVP scope: **error monitoring + source maps** on Vercel deploy builds. No Session Replay, no custom Sentry alert rules in repo, no CI source-map upload on PR `build:ci`.

## Current State Analysis

- Zero `@sentry/*` dependencies; no `instrumentation.ts`, `global-error.tsx`, or Sentry wrapper in `next.config.ts`.
- Four Node API routes catch errors and return JSON 500/503 — exceptions never reach Sentry auto-instrumentation without `captureException` (`src/app/api/plans/route.ts:67-72`, `results/route.ts:87-92`, etc.).
- `register` Server Action logs Prisma/cleanup failures to stdout (`src/app/(auth)/actions.ts:85-114`).
- Deploy: production build via `.github/workflows/deploy.yml` (`vercel build --prod`); env vars documented in `context/deployment/deploy-plan.md` — Supabase/Prisma only.
- Roadmap explicitly parked observability until post-MVP (`context/foundation/roadmap.md:171`).

### Key Discoveries:

- Research recommends official wizard `npx @sentry/wizard@latest -i nextjs` for Next.js 16.2.6 peer compatibility.
- Thin `src/lib/observability/` wrapper keeps Vitest handler tests mockable without importing `@sentry/nextjs` in every route.
- `SENTRY_AUTH_TOKEN` must stay server-only; never `NEXT_PUBLIC_*` (AGENTS.md).
- Tunnel route (wizard default) must bypass auth middleware redirects.

## Desired End State

After all phases:

1. With `SENTRY_DSN` set on Vercel Preview/Production, an intentional server error (e.g. test route or broken DB call in staging) appears in the Sentry project with a de-minified stack trace.
2. Existing API JSON error contracts unchanged — users still see Polish messages; Sentry receives the underlying exception server-side.
3. Local dev and CI (`pnpm build:ci`) succeed **without** Sentry env vars (SDK no-ops when DSN absent).
4. `.env.example` and `context/deployment/deploy-plan.md` document required Sentry variables for owner setup.

### Verification (end-to-end):

- Owner: Sentry project created, env in Vercel, merge + deploy, trigger test error, event visible in Sentry Issues.
- Agent/automated: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:ci` green.

## What We're NOT Doing

- Session Replay, performance dashboards, or custom metrics beyond minimal SDK defaults.
- Sentry alert rules / PagerDuty — owner configures in Sentry UI outside repo.
- Uploading source maps from GitHub Actions `ci.yml` (`build:ci`).
- E2E Playwright integration with Sentry.
- Replacing `console.error` — keep both log + Sentry capture for Vercel log drain compatibility.
- Scrubbing or changing health-check semantics (`GET /api/health/db` stays public smoke).

## Implementation Approach

1. **Bootstrap** via Sentry wizard (or equivalent manual file set if wizard is non-interactive in agent env) — client/server/edge configs, `instrumentation.ts`, `withSentryConfig`, `global-error.tsx`.
2. **Centralize capture** in `src/lib/observability/report-error.ts` — `reportError(error, context?)` calls `Sentry.captureException` when DSN present; safe no-op otherwise.
3. **Wire capture** into all existing API `catch` blocks and auth `register` failure paths.
4. **Instrument Server Actions** with `Sentry.withServerActionInstrumentation` for `login` and `register`.
5. **Document env** in `.env.example` + deploy-plan §3; owner-only Vercel setup called out explicitly.

## Critical Implementation Details

**Middleware + tunnel:** If wizard enables `tunnelRoute` (e.g. `/monitoring`), ensure `src/middleware.ts` does not redirect unauthenticated requests on that path — add early return before protected-prefix check, or exclude tunnel path from matcher.

**Wizard in agent environment:** Wizard is interactive. If it cannot run non-interactively, replicate its output manually per [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) — same file names the wizard creates. Do not invent a custom SDK integration path.

**Vitest:** Mock `@/lib/observability/report-error` in `plans-route-handlers.test.ts` (or globally in vitest setup) so existing 500 tests do not call real Sentry.

## Phase 1: SDK bootstrap & configuration

### Overview

Install `@sentry/nextjs`, create runtime configs and instrumentation hook, wrap `next.config.ts`, add `global-error.tsx`, extend env templates.

### Changes Required:

#### 1. Package & wizard output

**File**: `package.json`, new Sentry config files at repo root / `src/`

**Intent**: Add `@sentry/nextjs` devDependency and scaffold standard Next.js 16 integration files.

**Contract**: After phase, repo contains (names per wizard output): `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation.ts` with `register()` and `onRequestError`, `src/app/global-error.tsx`. SDK init uses `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` if wizard requires client DSN. **Errors only** — `tracesSampleRate: 0` in production config unless preview; no Replay integration.

#### 2. Next.js config wrapper

**File**: `next.config.ts`

**Intent**: Wrap existing `rewrites()` config with `withSentryConfig` for source map upload at build time.

**Contract**: Preserve Polish path rewrites unchanged. `withSentryConfig` second argument reads `SENTRY_AUTH_TOKEN`, org/project from env or wizard placeholders. `silent: !process.env.CI` acceptable. Build must not fail when `SENTRY_AUTH_TOKEN` is unset (local/CI) — use wizard's `disableServerWebpackPlugin` / env guards if needed.

#### 3. Environment documentation

**Files**: `.env.example`, `context/deployment/deploy-plan.md` §3

**Intent**: Document Sentry env vars for owner Vercel setup.

**Contract**: Add commented block:

| Variable | Preview | Production | Notes |
|----------|---------|------------|-------|
| `SENTRY_DSN` | Yes | Yes | Server runtime |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Yes | Client SDK (if wizard uses) |
| `SENTRY_AUTH_TOKEN` | Optional | Yes | Build-time source maps only |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Optional | Yes | Or hardcoded in `withSentryConfig` post-wizard |

Never commit real tokens. Note: owner creates Sentry project and sets Vercel env before first Sentry-enabled production deploy.

#### 4. PII scrubbing

**File**: `sentry.server.config.ts` (and client config if applicable)

**Intent**: Prevent raw email addresses in Sentry events from auth flows.

**Contract**: `beforeSend` removes or hashes `user.email` if set; keep `user.id` (Supabase UUID) for correlation. Do not send passwords or questionnaire payloads.

### Success Criteria:

#### Automated Verification:

- `pnpm install` succeeds
- `pnpm lint` passes
- `pnpm typecheck` passes
- `pnpm test` passes (55 tests)
- `pnpm build:ci` passes without any `SENTRY_*` env vars

#### Manual Verification:

- Owner creates Sentry project (or confirms existing org/project)
- Owner adds `SENTRY_DSN` (+ auth token for prod) to Vercel Preview and Production
- Local `pnpm dev` runs without Sentry env (no console spam / crashes)

**Implementation Note**: Pause for owner confirmation that Vercel env is set before Phase 4 deploy verification.

---

## Phase 2: Server error capture in API routes & auth

### Overview

Route all swallowed server exceptions through `reportError` so Sentry receives events the API already catches.

### Changes Required:

#### 1. Observability helper

**File**: `src/lib/observability/report-error.ts` (new)

**Intent**: Single entry point for server-side error reporting; testable mock boundary.

**Contract**: Export `reportError(error: unknown, context?: { route?: string; extra?: Record<string, unknown> })`. Calls `Sentry.captureException` when `process.env.SENTRY_DSN` is set. Never throws. Optional `Sentry.setContext` from `context`.

#### 2. API route catch blocks

**Files**:

- `src/app/api/plans/route.ts`
- `src/app/api/plans/[planId]/results/route.ts`
- `src/app/api/plans/[planId]/recalculate/route.ts` (500 path only — not 429)
- `src/app/api/health/db/route.ts`

**Intent**: After existing `console.error`, call `reportError(error, { route: 'POST /api/plans' })` (or matching method/path).

**Contract**: JSON response bodies and status codes unchanged. Rate-limit 429 branch in recalculate remains without Sentry capture.

#### 3. Auth register failures

**File**: `src/app/(auth)/actions.ts`

**Intent**: Report Prisma create failure and Supabase cleanup failure to Sentry.

**Contract**: `reportError` in outer `catch (err)` and inner cleanup `catch`. User-facing `AuthResult.error` strings unchanged.

#### 4. Vitest mock

**File**: `src/lib/api/plans-route-handlers.test.ts` (or `vitest` setup)

**Intent**: Prevent Sentry/reportError side effects in handler tests.

**Contract**: `vi.mock('@/lib/observability/report-error')` — existing 16 tests remain green; optional assertion that `reportError` called on 500 DB error test.

### Success Criteria:

#### Automated Verification:

- `pnpm test` — all handler tests pass including `returns 500 JSON when GET results hits a database error`
- `pnpm lint` and `pnpm typecheck` pass

#### Manual Verification:

- With local `SENTRY_DSN` in `.env.local`, trigger `planFindUnique` failure (e.g. stop Docker DB, call GET results) — event appears in Sentry with route context

---

## Phase 3: Client errors, Server Actions & middleware

### Overview

Capture client React errors, instrument auth Server Actions, ensure tunnel path works with middleware.

### Changes Required:

#### 1. Global error boundary

**File**: `src/app/global-error.tsx` (wizard may create — verify Polish-friendly fallback UI)

**Intent**: Capture uncaught React render errors at root.

**Contract**: `useEffect` calls `Sentry.captureException(error)`. Minimal Polish message + link home; preserve `digest` if present. Match existing app typography via `globals.css` classes where practical.

#### 2. Optional segment error boundary

**File**: `src/app/(app)/error.tsx` (new, if global-error insufficient for app shell)

**Intent**: Recoverable errors in authenticated panel without full white screen.

**Contract**: `"use client"` boundary with `captureException` + „Spróbuj ponownie” + link to `/panel`. Skip if wizard-only `global-error` is deemed sufficient — prefer **one** boundary at root for MVP.

#### 3. Server Action instrumentation

**File**: `src/app/(auth)/actions.ts`

**Intent**: Automatic spans/exceptions for `login` and `register` per Sentry docs (not auto-instrumented).

**Contract**: Wrap exported `login` and `register` with `Sentry.withServerActionInstrumentation('login', …)` / `'register'`. `signOut` optional (low risk). Do not wrap `redirect()` inside try/catch that would swallow `NEXT_REDIRECT`.

#### 4. Middleware tunnel exclusion

**File**: `src/middleware.ts`

**Intent**: Allow Sentry tunnel requests without session redirect.

**Contract**: If `tunnelRoute` is `/monitoring` (confirm from wizard `next.config`), return `NextResponse.next()` for that pathname before protected-prefix logic.

#### 5. Client fetch errors (optional thin)

**File**: `src/components/questionnaire/questionnaire-form.tsx`

**Intent**: Network failures currently only `setServerError` — invisible to Sentry.

**Contract**: In `catch` block, call client `Sentry.captureException` or `reportError` client variant. **MVP:** include only if wizard client SDK is active; use `Sentry.captureMessage` with level `warning` for fetch failures (not full stack). Low priority — skip if time-constrained.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:ci` pass

#### Manual Verification:

- Client: induce JS error in dev (e.g. temporary throw in client component) — event in Sentry with browser context
- Tunnel: confirm events ingest when ad-blocker enabled (if tunnel configured)
- Auth: failed register with invalid DB shows in Sentry server issues

---

## Phase 4: Verification, docs & deploy smoke

### Overview

Add optional dev-only test route, update AGENTS.md, close change with owner deploy verification checklist.

### Changes Required:

#### 1. Dev-only Sentry test route (optional)

**File**: `src/app/api/health/sentry-test/route.ts` (new)

**Intent**: Give owner a one-click way to verify ingest post-deploy.

**Contract**: `GET` handler throws or calls `reportError(new Error('Sentry smoke test'))`. Returns 500 JSON. **Guard:** only responds when `NODE_ENV === 'development'` OR `SENTRY_ENABLE_TEST_ROUTE=true` — otherwise 404. Document in deploy-plan manual smoke section.

#### 2. Contributor docs

**Files**: `AGENTS.md`, `context/deployment/deploy-plan.md`

**Intent**: Agents and owner know Sentry env requirements and that missing DSN is OK locally.

**Contract**: AGENTS.md Build section: mention Sentry optional locally; list env vars pointer to `.env.example`. Deploy-plan: new §3 rows + post-deploy smoke step „verify Sentry issue from test route or forced API error”.

#### 3. Change status

**File**: `context/changes/sentry-monitoring/change.md`

**Intent**: Mark ready for implementation review after all phases.

**Contract**: `status: implementing` during `/10x-implement`; epilogue sets `implemented`.

### Success Criteria:

#### Automated Verification:

- Full local gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm build:ci`

#### Manual Verification:

- Owner: Vercel production deploy after merge; hit smoke test or break staging DB briefly; confirm issue in Sentry with readable stack (source maps)
- Confirm `GET /api/health/db` still returns `{ ok: true }` on healthy DB
- Confirm no Sentry events for intentional 401/404/429 API responses

---

## Testing Strategy

### Unit Tests:

- Existing `plans-route-handlers.test.ts` — mock `reportError`; optionally assert called on 500 path
- No new tests for Sentry SDK init (integration concern)

### Integration Tests:

- None required — Sentry ingest verified manually on Vercel

### Manual Testing Steps:

1. Local without DSN: full test suite + dev server — no regressions
2. Local with DSN in `.env.local`: force API 500 — event in Sentry
3. Preview deploy: register new user — no false-positive errors
4. Production: smoke test route (if enabled) or deliberate staging error — stack trace readable

## Performance Considerations

- `tracesSampleRate: 0` for MVP — no performance overhead
- Source map upload adds ~10–30s to Vercel build when `SENTRY_AUTH_TOKEN` set — acceptable on deploy path only
- Client SDK bundle size increase ~tens of KB — acceptable for error monitoring

## Migration Notes

- No database changes
- No breaking API changes
- Rollback: remove `withSentryConfig` wrapper and Sentry imports; uninstall package
- First deploy with `SENTRY_AUTH_TOKEN` may fail build if token invalid — owner verifies token scope (`project:releases`, `org:read`)

## References

- Research: `context/changes/sentry-monitoring/research.md`
- Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Error handling baseline: commit `65a543d`
- Deploy runbook: `context/deployment/deploy-plan.md`
- API catch sites: `src/app/api/plans/route.ts:67-72`, `results/route.ts:87-92`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: SDK bootstrap & configuration

#### Automated

- [x] 1.1 `pnpm install` succeeds — 3a620f7
- [x] 1.2 `pnpm lint` passes — 3a620f7
- [ ] 1.3 `pnpm typecheck` passes
- [x] 1.4 `pnpm test` passes (55 tests) — 3a620f7
- [x] 1.5 `pnpm build:ci` passes without `SENTRY_*` env vars — 3a620f7

#### Manual

- [ ] 1.6 Owner creates Sentry project and sets Vercel Preview + Production env
- [ ] 1.7 Local `pnpm dev` runs without Sentry env

### Phase 2: Server error capture in API routes & auth

#### Automated

- [x] 2.1 `pnpm test` — handler tests pass (incl. 500 DB error) — a56d376
- [x] 2.2 `pnpm lint` and `pnpm typecheck` pass — a56d376

#### Manual

- [ ] 2.3 Local with `SENTRY_DSN`: API failure event visible in Sentry

### Phase 3: Client errors, Server Actions & middleware

#### Automated

- [x] 3.1 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:ci` pass — 19f6aa1

#### Manual

- [ ] 3.2 Client-induced error appears in Sentry
- [ ] 3.3 Tunnel path works with middleware (if enabled)
- [ ] 3.4 Auth failure paths report to Sentry

### Phase 4: Verification, docs & deploy smoke

#### Automated

- [x] 4.1 `pnpm lint && pnpm typecheck && pnpm test && pnpm build:ci` — f054b11

#### Manual

- [ ] 4.2 Owner: production/preview deploy — Sentry issue with de-minified stack
- [ ] 4.3 `GET /api/health/db` still healthy; no noise on 401/404/429
