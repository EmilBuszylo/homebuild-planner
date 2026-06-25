# Repository Guidelines

Greenfield MVP **home-build-planner**: a Next.js web app that helps individual home builders get orientacyjne stage costs and a construction timeline from a questionnaire. Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (radix-sera), pnpm, Vercel; **Supabase** (Auth + hosted Postgres), **Prisma ORM** (schema/migrations in repo) per @context/foundation/tech-stack.md and @context/foundation/prd.md.

## Hard rules for agents

- Next.js 16 in this repo may differ from older training data — read `node_modules/next/dist/docs/` for the APIs you touch; heed deprecations in scaffold output.
- Never delete or overwrite anything under `context/` — product docs (`prd.md`, `tech-stack.md`, shape notes, bootstrap verification) live there and outrank generic defaults.
- Use **pnpm** for installs and scripts (`packageManager` in @package.json); do not switch the repo to npm/yarn without an explicit user request.
- Do not commit secrets: `.env.local` for Supabase keys; never expose the **Secret** key in client code or `NEXT_PUBLIC_*` vars.
- Before using external packages or tools (Supabase, Next.js, shadcn, etc.), check the **current** official docs for this repo’s versions; do not copy deprecated patterns from training data (e.g. legacy `anon` / `service_role` key names if docs now use **Publishable** and **Secret** keys).
- **Database schema lives in git:** define models in `prisma/schema.prisma`, ship changes via versioned SQL under `prisma/migrations/`. Never treat the Supabase dashboard as the source of truth for domain tables.
- **Local `migrate dev` is owner-only:** only the repo owner runs `pnpm db:migrate` / `prisma migrate dev` against their database. Agents must **not** run it. If the next step needs migrations applied locally (new tables, changed schema, or verifying Prisma against a live DB), **stop**, list the exact commands for the owner, ask them to run migrations and confirm, then **wait for explicit permission** before continuing any code or verification that assumes the DB is migrated.
- MVP scope: orientacyjne estimates only — no binding quotes, no permit automation, no multi-user workspaces (@context/foundation/prd.md Non-Goals).

## Project structure

- `src/app/` — App Router pages and layouts (`layout.tsx`, `page.tsx`, `globals.css`).
- `src/components/ui/` — shadcn primitives; add via `pnpm dlx shadcn@latest add <component>` per @components.json.
- `src/lib/utils.ts` — `cn()` helper for Tailwind class merging.
- `prisma/schema.prisma` — canonical data model (add when bootstrapping Prisma); `prisma/migrations/` — versioned SQL.
- `src/lib/prisma.ts` — shared Prisma Client singleton for Route Handlers (create when wiring data layer).
- `src/app/api/` — non-auth domain endpoints; handlers use Prisma, not Supabase table client.
- `context/foundation/` — PRD and tech-stack hand-off; read before feature work.
- `context/changes/` — change-scoped artifacts (e.g. bootstrap verification log).
- Path alias `@/*` → `src/*` per @tsconfig.json.

## Build, test, and development

- `pnpm dev` — local dev server (http://localhost:3000).
- `pnpm build` — production build; run before claiming deploy readiness.
- `pnpm start` — serve production build locally.
- `pnpm lint` — ESLint via @eslint.config.mjs and `eslint-config-next`.
- `pnpm test` — Vitest in `src/lib/` (colocated `*.test.ts`): pure logic plus mocked API route handlers in `src/lib/api/*.test.ts` (no DB required).
- Full test strategy and cookbook recipes → `context/foundation/test-plan.md` (§6). Local gates: `pnpm test`, `pnpm lint`. GitHub Actions CI (`.github/workflows/ci.yml`) runs `ci` job (lint → test → `build:ci`) and parallel `e2e` job (`pnpm test:e2e`) on pull requests and `push` to `master` — see test-plan §5.
- Prisma: `pnpm db:generate` / `prisma generate` — agents may run. `pnpm db:migrate` / `prisma migrate dev` and `pnpm db:studio` — **owner only**; agents stop and request these when required (see Hard rules). Vercel/production applies pending migrations via `prisma migrate deploy` in `pnpm build` when env is configured.
- **Local Postgres (Docker):** @docker-compose.yml — Postgres 16 on host port **55432** (`homebuild` / `homebuild` / `homebuild_planner`). `pnpm db:docker:up` starts the DB; `pnpm db:docker:down` stops the container, removes the volume and compose images. Point `DATABASE_URL` and `DIRECT_URL` in `.env.local` at `127.0.0.1:55432` (see @.env.example); no pooler locally.
- **First / production deploy:** follow @context/deployment/deploy-plan.md (Vercel env + GitHub Actions; `prisma migrate deploy` runs automatically in `pnpm build` on Vercel).
- **Sentry (optional locally):** error monitoring via `@sentry/nextjs`; SDK is disabled when `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` are unset — `pnpm dev`, `pnpm test`, and `pnpm build:ci` work without Sentry env. See @.env.example for `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`; deploy smoke in @context/deployment/deploy-plan.md.
- Do not add E2E (Playwright) or component test stacks without an explicit user request; extend Vitest coverage for new pure `src/lib/` logic when changing critical paths (benchmarks, rate limits, generation).
- **Cursor agent hooks** (`.cursor/hooks.json`): after each agent `Write`, `after-file-lint.sh` runs ESLint on the edited file and `after-file-typecheck.sh` runs `pnpm typecheck` for `.ts`/`.tsx` edits. Logs: Output → Hooks. Requires trusted workspace and `chmod +x .cursor/hooks/*.sh`.
- **Git pre-commit** (Husky + lint-staged): `.husky/pre-commit` runs ESLint with `--fix` on staged `*.{js,jsx,ts,tsx,mjs,cjs}` files, then `pnpm test`. Enabled via `prepare` → `husky` on `pnpm install`.
- **E2E** (Playwright): `pnpm test:e2e`, `pnpm test:e2e:risk-01` (IDOR), `pnpm test:e2e:risk-02` (auth), `pnpm test:e2e:risk-04` (generate golden path), `pnpm test:e2e:risk-07` (stage notes). Conventions in `e2e/E2E-RULES.md` and exemplar `e2e/seed.spec.ts`. **Local:** `.env.local` (Supabase + DB), `pnpm db:docker:up`, `pnpm exec playwright install chromium`. **CI:** `e2e` job on every PR — requires GitHub Actions secrets + Supabase CI project per `e2e/E2E-RULES.md` §CI. Do not add new Playwright specs without an explicit user request.

## UI copy and routing

- **File and folder names:** English (`login-form.tsx`, `(auth)/register`).
- **UI copy:** Polish (buttons, validation messages, link labels).
- **Public URLs:** Use Polish paths in links (`/logowanie`, `/rejestracja` via @src/lib/routes.ts); English segments `/login` and `/register` work directly. Polish → English mapping is in `rewrites` in @next.config.ts (browser bar stays on the Polish path when entered as `/logowanie` or `/rejestracja`).
- **Route groups:** `(auth)` | `(marketing)` | `(app)` — parentheses are omitted from URLs. New auth pages under `src/app/(auth)/`; landing under `(marketing)/` when migrated from root `page.tsx`; app panel under `(app)/` later.
- **Forms:** shadcn Field + `react-hook-form` + `zod`; shared schemas in `src/lib/validations/`. Auth UI is client-only validation until Supabase Auth is wired.
- **Auth MVP scope:** email + password only — no OAuth (e.g. GitHub), no “forgot password”, no magic link. When using shadcn blocks (e.g. login-02) as layout reference, copy structure and styling only; do not ship block extras that are out of scope.

## Coding style

- TypeScript strict mode; React Server Components by default (`components.json` has `"rsc": true`).
- UI: Tailwind utility classes; prefer shadcn components over one-off raw HTML for forms and layout.
- New routes: `src/app/<segment>/page.tsx`; colocate route-only components under `src/components/` (not under `app/` unless a Next convention requires it).
- Use `cn()` from `@/lib/utils` when merging conditional classes.

## Configuration and security

- Styling entry: @src/app/globals.css; shadcn config: @components.json.
- Supabase Auth env (see @.env.local): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server-only: `SUPABASE_SECRET_KEY` where the current Supabase server SDK requires it — **not** legacy `anon` / `service_role` names unless docs explicitly require them.
- Database env (server-only, never `NEXT_PUBLIC_*`): `DATABASE_URL` — Supabase **transaction pooler** (port 6543, `?pgbouncer=true`) for Prisma Client at runtime; `DIRECT_URL` — **direct** Postgres (port 5432) for `pnpm db:migrate` / `prisma studio`. Set both in @.env.local and Vercel project env before migrate or deploy.
- **Auth:** Server Actions + Supabase Auth SDK per @context/foundation/lessons.md. **Domain data:** API routes + **Prisma Client** per the same file; do not query domain tables via `@supabase/supabase-js`.
- Deeper product rules: @context/foundation/prd.md, stack notes: @context/foundation/tech-stack.md.

## Commits and CI

- GitHub Actions: `.github/workflows/ci.yml` (`ci` + `e2e` jobs on PR and `master` push). Prefer Conventional Commits-style prefixes (`feat:`, `fix:`, `docs:`) when the user commits.
- Keep changes minimal and aligned with the 3-week after-hours MVP in @context/foundation/tech-stack.md.

<!-- BEGIN @emilbuszylo/ai-toolkit -->
## Team AI rules (@emilbuszylo/ai-toolkit)

These rules apply when working on **home-build-planner**. Full detail: repo `AGENTS.md` and `context/foundation/lessons.md`.

- **Stack:** Next.js App Router, Prisma (domain data), Supabase Auth only for auth — do not query domain tables via Supabase client.
- **Migrations:** `pnpm db:migrate` is owner-only; agents stop and ask the owner to run migrations.
- **Plan generation:** Never persist a plan version with zero stage results; enforce INV-GEN-01 at domain boundary.
- **Read path:** Display frozen `PlanStageResult` — no engine recompute on GET/RSC for costs/timeline.
- **Coupling:** Keep `@prisma/client` out of UI and pure engine; use validations/DTOs at boundaries.
- **Tests:** Extend Vitest for pure logic; do not add Playwright specs without explicit request.
- **Copy:** Polish UI strings; English file/folder names.
<!-- END @emilbuszylo/ai-toolkit -->
