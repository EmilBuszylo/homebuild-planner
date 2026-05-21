# Repository Guidelines

Greenfield MVP **home-build-planner**: a Next.js web app that helps individual home builders get orientacyjne stage costs and a construction timeline from a questionnaire. Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (radix-sera), pnpm, deploy target Vercel; Supabase auth/DB planned per @context/foundation/prd.md.

## Hard rules for agents

- Next.js 16 in this repo may differ from older training data — read `node_modules/next/dist/docs/` for the APIs you touch; heed deprecations in scaffold output.
- Never delete or overwrite anything under `context/` — product docs (`prd.md`, `tech-stack.md`, shape notes, bootstrap verification) live there and outrank generic defaults.
- Use **pnpm** for installs and scripts (`packageManager` in @package.json); do not switch the repo to npm/yarn without an explicit user request.
- Do not commit secrets: `.env.local` for Supabase keys; no service-role key in client bundles.
- MVP scope: orientacyjne estimates only — no binding quotes, no permit automation, no multi-user workspaces (@context/foundation/prd.md Non-Goals).

## Project structure

- `src/app/` — App Router pages and layouts (`layout.tsx`, `page.tsx`, `globals.css`).
- `src/components/ui/` — shadcn primitives; add via `pnpm dlx shadcn@latest add <component>` per @components.json.
- `src/lib/utils.ts` — `cn()` helper for Tailwind class merging.
- `context/foundation/` — PRD and tech-stack hand-off; read before feature work.
- `context/changes/` — change-scoped artifacts (e.g. bootstrap verification log).
- Path alias `@/*` → `src/*` per @tsconfig.json.

## Build, test, and development

- `pnpm dev` — local dev server (http://localhost:3000).
- `pnpm build` — production build; run before claiming deploy readiness.
- `pnpm start` — serve production build locally.
- `pnpm lint` — ESLint via @eslint.config.mjs and `eslint-config-next`.
- No test runner or `*.test.*` files yet — do not invent a test stack; add tests only when the user asks.

## Coding style

- TypeScript strict mode; React Server Components by default (`components.json` has `"rsc": true`).
- UI: Tailwind utility classes; prefer shadcn components over one-off raw HTML for forms and layout.
- New routes: `src/app/<segment>/page.tsx`; colocate route-only components under `src/components/` (not under `app/` unless a Next convention requires it).
- Use `cn()` from `@/lib/utils` when merging conditional classes.

## Configuration and security

- Styling entry: @src/app/globals.css; shadcn config: @components.json.
- Env: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` when wiring auth (not scaffolded yet).
- Deeper product rules: @context/foundation/prd.md, stack notes: @context/foundation/tech-stack.md.

## Commits and CI

- No `.github/workflows/` in repo yet; no enforced CI gate until workflows land.
- Prefer Conventional Commits-style prefixes (`feat:`, `fix:`, `docs:`) when the user commits.
- Keep changes minimal and aligned with the 3-week after-hours MVP in @context/foundation/tech-stack.md.
