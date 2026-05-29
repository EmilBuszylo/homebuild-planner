# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Route non-auth Supabase access through Next.js API routes

- **Context**: Any server-side data or business operation backed by Supabase (plans, questionnaire saves, estimates, timeline) — excluding auth/session flows (sign-up, sign-in, sign-out, password reset).
- **Problem**: Calling Supabase directly from Client Components or scattering queries in RSC loaders mixes auth with domain logic, makes RLS/policy mistakes easier, and hides API contracts from the rest of the app.
- **Rule**: For every non-auth data operation, expose a Next.js Route Handler under `src/app/api/`; the handler uses **Prisma Client** (schema defined in `prisma/schema.prisma`, migrations in repo). UI and Server Components call only those HTTP endpoints — never the Supabase JS client for domain tables and never schema changes only in the Supabase dashboard.
- **Applies to**: frame, plan, implement, impl-review

## Use Server Actions for Supabase auth

- **Context**: Supabase auth flows only — sign-up, sign-in, sign-out, password reset, session refresh. Complements the API-routes lesson for non-auth data.
- **Problem**: Putting auth in Route Handlers or calling `supabase.auth` directly from Client Components spreads cookie/session handling, fights Next.js form patterns, and duplicates validation.
- **Rule**: Implement every Supabase auth operation as a Next.js Server Action (`"use server"`); build login and registration forms as Server or Client Components that submit to those actions using Next.js form APIs (`action`, `useActionState` / `useFormState` per current Next docs). Do not use API routes for auth unless Next.js docs require it for a specific flow.
- **Applies to**: frame, plan, implement, impl-review

## Version database schema in repo with Prisma

- **Context**: Any feature that persists domain data (questionnaire answers, plans, estimates, timelines) on the Supabase-hosted Postgres database.
- **Problem**: Building against a database without an in-repo schema produces drift, untracked dashboard edits, and agents cannot review or migrate structure safely.
- **Rule**: Always model tables in `prisma/schema.prisma`, apply changes via `pnpm prisma migrate dev` (or `db push` only for throwaway local experiments — prefer migrations for anything shared). Route Handlers import a shared Prisma client from `src/lib/prisma.ts` (or equivalent); do not create or alter production tables solely through the Supabase SQL editor.
- **Applies to**: frame, plan, implement, impl-review, plan-review

## Local Prisma migrate dev is owner-only

- **Context**: Any task that adds or changes `prisma/schema.prisma`, creates migration files, or implements features that query new/changed tables on the owner’s Supabase Postgres.
- **Problem**: An agent running `pnpm db:migrate` / `prisma migrate dev` against the owner’s database without coordination can apply the wrong migration, block on prompts, or proceed with code/tests while the DB is still on an old schema.
- **Rule**: Only the repo owner runs local `pnpm db:migrate` / `prisma migrate dev`. Agents may edit `schema.prisma` when a schema change is required, but **must not** create or edit files under `prisma/migrations/` (see next lesson). If execution requires migrations to be applied locally first, the agent must **stop**, list the exact owner commands (`pnpm db:migrate`, then `pnpm db:seed` if needed), ask the owner to run them and confirm success, and **not continue** with code that assumes the new columns/tables exist until the owner confirms. Do not run `migrate dev`, `db push`, or `db:studio` on the owner’s behalf.
- **Applies to**: frame, plan, plan-review, implement, impl-review, all

## Never hand-write Prisma migration files

- **Context**: Any schema change in `prisma/schema.prisma` (new columns, models, indexes, enums).
- **Problem**: Manually adding `prisma/migrations/<timestamp>_…/migration.sql` (or editing existing migration SQL) desynchronizes Prisma’s migration history from what `prisma migrate dev` would generate on the owner’s machine — leading to drift, duplicate migrations, failed `migrate dev`, or prompts to reset. Observed on S-08 (`coachingNote`): agent-created SQL conflicted with the owner’s normal migrate workflow.
- **Rule**: **Never** create, edit, or delete anything under `prisma/migrations/` unless the user **explicitly** asks for a hand-written migration in that turn. Default workflow: agent changes `schema.prisma` only → **stop** → owner runs `pnpm db:migrate` (which generates and applies the migration) → owner confirms → agent continues with seed/API/UI that depend on the new schema. If the owner already ran migrate and a migration file exists, agents may read it but must not rewrite it.
- **Applies to**: plan, plan-review, implement, impl-review, all

## Group FK scalar fields directly below their relation line in Prisma schema

- **Context**: Any Prisma model definition in `prisma/schema.prisma` with relations.
- **Problem**: When FK fields (e.g., `planId`) are separated from their relation declaration, the schema becomes harder to read and the connection between the FK and relation is non-obvious.
- **Rule**: Always place the FK scalar field directly below the relation field it belongs to. E.g., `plan Plan @relation(fields: [planId], ...)` on one line, followed by `planId String` on the next. Group related fields together — don't scatter FKs among unrelated columns.
- **Applies to**: plan, implement, impl-review

## Questionnaire cross-field rules: never put Zod `.refine()` on the React Hook Form resolver schema

- **Context**: Multi-step questionnaire with dependent fields (e.g. `starting_state` must be strictly before `investment_state` on the construction timeline). Validation uses Zod + `createZodResolver` + per-step `form.trigger(fields)`.
- **Problem**: A single schema with `.refine()` for cross-field rules is wired as the RHF resolver. `form.trigger()` on a subset of fields can still surface the refine error on `starting_state` even when the pair is valid, or leave a stale error after the user fixes the selection. Regressions recurred when refactoring shared `investmentStateOrder` or reusing one schema for form and API.
- **Rule**:
  1. **`questionnaireFormSchema`** — field-level Zod only; **no** `.refine()`. This is the **only** schema passed to `createZodResolver`.
  2. **`questionnaireInputsSchema`** — `questionnaireFormSchema.refine(...)` for **API** (`POST /api/plans`) and explicit `safeParse` immediately before submit.
  3. **UI** — filter radio options so invalid pairs cannot be chosen (`getAllowedTargetStates` / `getAllowedStartingStates` in `src/lib/investment-state.ts`). Remember: different labels can share one enum value (e.g. target „Stan zero (fundamenty)” and start „Fundamenty gotowe” are both `FOUNDATIONS` → invalid for strict `<`).
  4. **Auto-correct** — if an invalid pair appears (defaults, stale state), `useEffect` resets target to the first allowed value for the chosen start; do not rely only on `clearErrors` + manual `setError` in `handleNext`.
  5. **Before merging** — manually test matrix on step 1: `FROM_SCRATCH` → `DEVELOPER`, `FOUNDATIONS` → `OPEN_SHELL`, and confirm `FOUNDATIONS` + `FOUNDATIONS` is impossible in UI.
- **Applies to**: frame, plan, implement, impl-review, plan-review
