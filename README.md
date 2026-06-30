# home-build-planner

A web app that helps individual home builders get **orientacyjne** (indicative) stage costs and a construction timeline from a step-by-step questionnaire. MVP scope: email/password auth, plan generation and recalculation, stage notes, and optional Google Calendar export — not binding quotes or permit automation.

Product requirements and architecture notes live in [`context/foundation/`](context/foundation/) (start with [`prd.md`](context/foundation/prd.md) and [`tech-stack.md`](context/foundation/tech-stack.md)).

## Stack

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Supabase Auth** — login and registration only; no domain data via Supabase client
- **PostgreSQL + Prisma** — schema and migrations in-repo (`prisma/`)
- **Vitest** (unit/integration) and **Playwright** (E2E)
- **Vercel** deployment; GitHub Actions CI

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9 (`packageManager` in `package.json`)
- Docker (optional, for local Postgres via `docker-compose.yml`)
- Supabase project (Auth keys for local dev)

## Local setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (server-only)
   - `DATABASE_URL` and `DIRECT_URL`

   For local Postgres without Supabase DB:

   ```bash
   pnpm db:docker:up
   ```

   Then point both database URLs at `postgresql://homebuild:homebuild@127.0.0.1:55432/homebuild_planner` (see comments in `.env.example`).

3. **Database**

   Apply migrations and seed reference data (owner runs this once per environment):

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Run the dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Polish URL paths (e.g. `/logowanie`, `/rejestracja`) are mapped in `next.config.ts`.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Generate Prisma client, run migrations, production build |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (colocated `*.test.ts` under `src/lib/`) |
| `pnpm test:e2e` | Playwright E2E (requires `.env.local`, DB, Chromium) |
| `pnpm db:docker:up` / `db:docker:down` | Start/stop local Postgres container |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:migrate` | Create/apply migrations (local owner only) |
| `pnpm db:seed` | Seed construction stages and questionnaire definitions |

Optional: Google Calendar export needs `NEXT_PUBLIC_SITE_URL`, `GOOGLE_*` vars in `.env.local` (and the same on Vercel Production). Redirect URI = `{NEXT_PUBLIC_SITE_URL}/api/integrations/google/callback` — register it in [Google Cloud Console](https://console.cloud.google.com/). Details: `.env.example` and [`context/deployment/deploy-plan.md`](context/deployment/deploy-plan.md) §3.1.

Sentry is disabled when DSN vars are unset.

## Testing

```bash
pnpm lint
pnpm test
pnpm build:ci   # production build without migrate deploy
```

Test strategy, risk map, and handler mock patterns: [`context/foundation/test-plan.md`](context/foundation/test-plan.md). E2E prerequisites and CI setup: [`e2e/E2E-RULES.md`](e2e/E2E-RULES.md).

## Project layout

- `src/app/` — App Router pages and API routes
- `src/lib/` — domain logic, validations, plan generation engine
- `src/components/` — UI components (Polish copy in the app)
- `prisma/` — schema, migrations, seed
- `context/foundation/` — PRD, roadmap, test plan, lessons

## Deploy

See [`context/deployment/deploy-plan.md`](context/deployment/deploy-plan.md). Production builds on Vercel run `prisma migrate deploy` as part of `pnpm build` when database env vars are configured.
