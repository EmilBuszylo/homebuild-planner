---
project: home-build-planner
platform: vercel
database: supabase
first_deploy: true
ci_provider: github-actions
sources:
  - context/foundation/infrastructure.md
  - context/foundation/tech-stack.md
updated: 2026-06-08
---

# First deploy runbook — Vercel + Supabase + Prisma

Operational checklist for the **first** production/preview deployment. Supersedes the high-level steps in `infrastructure.md` Getting Started where this document adds repo-specific gaps (GitHub Actions, pnpm, CI build without migrate).

## 1. Scope of this deploy

**In scope**

- Next.js 16 app scaffold on **Vercel** (Hobby acceptable for MVP).
- **Supabase** hosted Postgres for runtime data (not local Docker).
- **Prisma** migrations applied via `prisma migrate deploy` during Vercel `pnpm build`.
- Smoke endpoint: `GET /api/health/db` → `{ "ok": true }`.
- **GitHub Actions**: PR CI (`ci.yml`) + production deploy on `master` (`deploy.yml`).

**Out of scope (later changes)**

- Supabase Auth UI / Server Actions (env prepared; code not required for health deploy).
- Voivodeship seed, Vercel cron, custom domain, GitHub Environments protection rules.
- Fly.io runner-up path (see `infrastructure.md`).

Local **Docker Postgres** ([`docker-compose.yml`](../../docker-compose.yml), port **55432**) is for dev only — not the Vercel deployment target.

## 2. Prerequisites (owner)

| # | Requirement |
|---|-------------|
| 1 | GitHub repository with this codebase pushed |
| 2 | [Vercel](https://vercel.com) account; ability to create/link a project |
| 3 | [Supabase](https://supabase.com) project with Postgres enabled |
| 4 | Connection strings from Supabase → **Connect** → **ORMs** → Prisma (or Database settings) |
| 5 | `DATABASE_URL` + `DIRECT_URL` set on **Vercel** before first build (see §3) — migrations in `prisma/migrations/` are applied automatically by `prisma migrate deploy` during `pnpm build` |

Agents must **not** run `pnpm db:migrate` / `prisma migrate dev` — owner only when **creating** new migrations locally ([`AGENTS.md`](../../AGENTS.md)).

## 3. Environment variables

Set in **Vercel** (Project → Settings → Environment Variables) for **Preview** and **Production**. Mirror in GitHub only if you add DB-backed CI later; current PR workflow uses `build:ci` without DB.

| Variable | Preview | Production | Source | Notes |
|----------|---------|------------|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase → API | Client-safe |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Yes | Supabase → API keys (Publishable) | Not legacy `anon` unless docs require |
| `SUPABASE_SECRET_KEY` | Yes | Yes | Supabase → Secret key | Server-only; for future auth |
| `DATABASE_URL` | Yes | Yes | Supabase → **Transaction pooler**, port **6543** | Append `?pgbouncer=true`; Prisma runtime |
| `DIRECT_URL` | Yes | Yes | Supabase → **Direct**, port **5432** | `prisma migrate deploy` at build time |
| `SENTRY_DSN` | Yes | Yes | Sentry → Project Settings → Client Keys (DSN) | Server runtime; optional locally |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Yes | Same DSN as `SENTRY_DSN` | Client/browser SDK |
| `SENTRY_AUTH_TOKEN` | Optional | Yes | Sentry → Settings → Auth Tokens | Build-time source map upload; CI `build:ci` runs without it |
| `SENTRY_ORG` | Optional | Yes | Sentry org slug | Or set in `next.config.ts` after wizard |
| `SENTRY_PROJECT` | Optional | Yes | Sentry project slug | Or set in `next.config.ts` after wizard |
| `SENTRY_ENABLE_TEST_ROUTE` | Optional | Optional | Set to `true` to enable smoke endpoint | Enables `GET /api/health/sentry-test` outside `development`; default off in Production |

Never prefix database URLs, `SENTRY_AUTH_TOKEN`, or `SUPABASE_SECRET_KEY` with `NEXT_PUBLIC_`.

**Local templates:** [`/.env.example`](../../.env.example). For Docker dev use the commented `127.0.0.1:55432` URLs — do not point Vercel at Docker.

## 4. Database migrations — prod vs local dev

### Production / Preview (Vercel) — automatic

[`package.json`](../../package.json) build script:

```text
prisma generate → prisma migrate deploy → next build
```

On every Vercel build (including the first), **`prisma migrate deploy`** applies all committed SQL under `prisma/migrations/` to the database pointed at by Vercel env vars. You do **not** need to run `pnpm db:migrate` on Supabase manually before the first deploy.

**Required before first green build:** `DATABASE_URL` and `DIRECT_URL` in Vercel (§3). Without them the build fails (P1012 / connection error) before `next build`.

**Verify after deploy:** Vercel build log shows successful `prisma migrate deploy`; optional check in Supabase Table Editor — table `DbHealth` exists.

### Local dev — `migrate dev` (owner only, optional)

`pnpm db:migrate` (`prisma migrate dev`) is for **developing** schema changes on your machine (Docker or Supabase dev URL). It creates or updates migration files and applies them to the DB you point at in `.env.local` / `.env`.

It is **not** a prerequisite for shipping migrations that are already committed in git — Vercel’s `migrate deploy` handles that on build.

Optional sanity check before pushing new migration folders:

```bash
pnpm exec prisma migrate status
```

## 5. Supabase configuration

After the first Vercel deployment URL is known:

1. **Authentication → URL configuration** — add site URL and redirect allow-list:
   - Production: `https://<vercel-production-domain>`
   - Preview (optional): `https://*.vercel.app` or per-preview URLs per Supabase docs
2. **Database** — prefer a dedicated DB user for Prisma (not shared superuser password in production).
3. **RLS** — not required for `DbHealth` smoke; enable when domain tables land.

## 6. Vercel project settings

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Root directory | `.` |
| Node.js | 20.x |
| Install command | `pnpm install` (via [`vercel.json`](../../vercel.json)) |
| Build command | `pnpm build` (from [`package.json`](../../package.json)) |
| Output | Default Next.js |

`pnpm build` = `prisma generate` → `prisma migrate deploy` → `next build`.

Link GitHub repo in Vercel for visibility; **production deploy is triggered by GitHub Actions** on push to `master` (see §7), not only by Vercel’s native Git hook — avoid duplicate prod deploys by disabling Vercel “auto deploy production” if you rely solely on `deploy.yml`, or keep one path only.

**Recommended:** Let **GitHub Actions `deploy.yml`** call Vercel CLI/action for production; use Vercel Git integration for **preview** deployments on PRs if desired, or rely on Action with preview flags later.

## 7. GitHub Actions

### Secrets (repository → Settings → Secrets and variables → Actions)

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `vercel link` or team/project settings |
| `VERCEL_PROJECT_ID` | Same |

Obtain org/project IDs after `pnpm dlx vercel link` locally or from Vercel project settings.

### Workflows in repo

| File | Trigger | Purpose |
|------|---------|---------|
| [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | `pull_request` | `pnpm install` → `pnpm lint` → `pnpm build:ci` (no DB migrate) |
| [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) | `push` to `master` | Deploy to Vercel **production**; remote build runs `pnpm build` with Vercel env |

PR CI does **not** run `migrate deploy` — no production DB credentials required in GitHub for lint/build compile check.

## 8. First deploy sequence (numbered)

1. Complete §2 prerequisites (repo, Vercel, Supabase, connection strings).
2. Create Vercel project (import GitHub repo or `pnpm dlx vercel link`).
3. Add all env vars from §3 to Vercel (Preview + Production) — **this enables automatic `migrate deploy` on build**.
4. Add GitHub secrets from §7.
5. Push branch, open PR — confirm **`CI`** workflow passes.
6. Merge to **`master`** — confirm **`Deploy`** workflow succeeds.
7. Open Vercel deployment logs — verify `prisma migrate deploy` and `next build` succeeded.
8. Smoke tests:
   ```bash
   curl -sS "https://<production-url>/api/health/db"
   ```
   Expected: `{"ok":true}` with HTTP 200.

   **Sentry ingest (after `SENTRY_DSN` is set on Vercel):**
   - Local dev: `curl -sS "http://localhost:3000/api/health/sentry-test"` → HTTP 500, event in Sentry Issues.
   - Preview/Production: set `SENTRY_ENABLE_TEST_ROUTE=true` on the target environment, then:
     ```bash
     curl -sS "https://<deployment-url>/api/health/sentry-test"
     ```
     Expected: HTTP 500 with `{"ok":false,"message":"Sentry smoke test triggered"}`; confirm a new issue in Sentry with a readable stack trace (requires `SENTRY_AUTH_TOKEN` on build). Alternatively, trigger a known API 500 (e.g. DB unavailable) and verify the event — intentional 401/404/429 responses must **not** create noise.
9. Configure Supabase redirect URLs (§5) when auth work starts.

## 9. Rollback and migrations

From `infrastructure.md` risk register:

- **Vercel rollback** (Dashboard → Deployments → Rollback) reverts application code quickly.
- **Prisma migrations do not auto-rollback** with Vercel — plan forward-only migrations; repair bad migrations with new migration files, not by rolling back SQL in production casually.

## 10. Post-deploy verification checklist

- [ ] Vercel production deployment status: Ready
- [ ] Build log contains successful `prisma migrate deploy`
- [ ] `GET /api/health/db` returns 200 and `"ok":true`
- [ ] Sentry: smoke via `GET /api/health/sentry-test` (dev or env with `SENTRY_ENABLE_TEST_ROUTE=true`) or forced API error — issue visible with de-minified stack when `SENTRY_AUTH_TOKEN` is set
- [ ] Sentry: no events for intentional 401/404/429 API responses
- [ ] Supabase dashboard: connections stable (pooler in use; no connection storm)
- [ ] No secrets printed in CI or Vercel build logs
- [ ] GitHub `master` shows green `Deploy` workflow

## 11. Gaps closed vs raw infrastructure.md

| Gap | Resolution in this repo |
|-----|-------------------------|
| No GitHub Actions | `ci.yml` + `deploy.yml` added |
| pnpm not pinned for Vercel | `packageManager` in `package.json` + `vercel.json` |
| PR build should not require prod DB | `build:ci` script without `migrate deploy` |
| `SUPABASE_SECRET_KEY` missing from template | Added to `.env.example` |
| Duplicate migration folders | Optional: owner runs `prisma migrate status` before push; prod apply is still via build `migrate deploy` |
| Local Docker vs prod | Documented: prod = Supabase only |

## 12. Next steps after first deploy

- Wire Supabase Auth (Server Actions) per `context/foundation/lessons.md`
- Add `pnpm db:seed` for voivodeship baselines (local/CI, not blocking infra)
- Optional: Vercel cron (Hobby: max once/day) or GitHub Actions schedule
- Upgrade Vercel Pro when preview/cron/Fluid limits bite
- Domain + DNS when branding is ready

## 13. References

- [`context/foundation/infrastructure.md`](../foundation/infrastructure.md) — platform decision, operational story, risks
- [`context/foundation/tech-stack.md`](../foundation/tech-stack.md) — `deployment_target: vercel`, `ci_provider: github-actions`
- [`AGENTS.md`](../../AGENTS.md) — pnpm, Prisma, owner-only migrate
- [`/.env.example`](../../.env.example) — env key template
