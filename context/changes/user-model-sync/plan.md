# User Model Sync with Supabase Auth — Implementation Plan

## Overview

Add a `User` model to Prisma using the Supabase Auth UUID as the primary key. Wire User creation into the `register` Server Action with rollback on failure. Update the dashboard to read from the Prisma User, proving the full integration loop works end-to-end.

## Current State Analysis

Supabase Auth is fully wired (F-01): registration, login, sign-out, middleware route protection all work. But there is no `User` model in Prisma — domain models have no entity to form relations against. The `register` action calls `supabase.auth.signUp()` and redirects. The dashboard reads `session.user.email` directly from the Supabase session.

## Desired End State

After this plan is complete:

- `prisma/schema.prisma` contains a `User` model with the Supabase Auth UUID as PK.
- The `register` Server Action creates a Prisma `User` record immediately after `signUp`. If Prisma creation fails, it rolls back the Supabase user via the admin API.
- The dashboard page queries the Prisma `User` to display data, proving the full register → login → read loop.
- F-02 (`domain-schema-and-seed`) can add FK relations from `Plan` → `User`.

### Key Discoveries:

- `src/app/(auth)/actions.ts:50-70` — `register` calls `signUp` then `redirect("/dashboard")`. The Prisma User creation inserts between these two calls.
- `src/app/(app)/dashboard/page.tsx:1-19` — Dashboard reads `session.user.email` from Supabase session. Will switch to `prisma.user.findUnique()`.
- `src/lib/prisma.ts` — Prisma Client singleton, ready to import in Server Actions.
- `.env.example:5` — `SUPABASE_SECRET_KEY` is defined but not yet used. The admin cleanup API requires it.
- `prisma/schema.prisma` — Only `DbHealth` exists on `master`; domain models on paused `feature/f-02` branch.
- Lessons: "Group FK scalar fields directly below their relation line in Prisma schema" — applies when F-02 adds relations to User.

## What We're NOT Doing

- **No login-time upsert** — no existing Supabase users need backfill; clean slate.
- **No account deletion** — `signOut` stays session-only; full delete is a future change.
- **No profile fields** — no name, avatar, or preferences; just id + email + timestamps.
- **No domain models** — Plan, PlanVersion, etc. are F-02's scope.
- **No UI changes beyond dashboard** — login and register forms are unchanged.

## Implementation Approach

Two phases with one migration gate:

1. **Schema first** — add the User model, owner applies migration.
2. **Code second** — wire User creation into register, add admin cleanup, update dashboard. All automated + manual verification in one pass.

## Critical Implementation Details

### Admin API for rollback requires SUPABASE_SECRET_KEY

The `supabase.auth.admin.deleteUser(userId)` method requires a Supabase client instantiated with the secret (service_role) key — not the publishable key used by the existing server client. The register action needs to create a one-off admin client using `createClient` from `@supabase/supabase-js` with `process.env.SUPABASE_SECRET_KEY` for the cleanup path only. This stays server-side in the `"use server"` action — the secret key is never exposed to the client.

---

## Phase 1: User Model in Prisma Schema

### Overview

Add the `User` model to `prisma/schema.prisma`. The owner applies the migration.

### Changes Required:

#### 1. User Model

**File**: `prisma/schema.prisma`

**Intent**: Define the User model as the identity anchor for all domain data. Uses the Supabase Auth UUID as the primary key (single-ID pattern) — no auto-generated cuid, no separate supabaseId column.

**Contract**:

`User`:
- `id` String PK — Supabase Auth UUID, set explicitly on creation (no `@default`)
- `email` String @unique
- `createdAt` DateTime @default(now())
- `updatedAt` DateTime @updatedAt

No relations yet — F-02 will add `plans Plan[]` when the Plan model is defined.

### Success Criteria:

#### Automated Verification:

- `pnpm db:generate` completes without errors
- `pnpm build:ci` passes

#### Manual Verification:

- Owner runs `pnpm db:migrate` — migration applies cleanly, creates the `User` table
- Owner verifies the `User` table in `pnpm db:studio`

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the migration was applied successfully before proceeding to Phase 2.

---

## Phase 2: Wire User Creation into Auth Flow + Dashboard

### Overview

Modify the `register` Server Action to create a Prisma User after signUp. Add try-catch with Supabase admin cleanup on Prisma failure. Update the dashboard to query the Prisma User record.

### Changes Required:

#### 1. Register Action — User Creation with Rollback

**File**: `src/app/(auth)/actions.ts`

**Intent**: After `supabase.auth.signUp()` succeeds, create a Prisma `User` record using the returned Supabase user ID and email. If the Prisma creation fails, roll back by deleting the Supabase user via the admin API and return an error to the user.

**Contract**: The `register` function flow becomes:
1. Validate with `registerServerSchema`
2. `supabase.auth.signUp()` → get `data.user.id` and `data.user.email`
3. `prisma.user.create({ data: { id, email } })` inside try-catch
4. On catch: create an admin Supabase client with `SUPABASE_SECRET_KEY`, call `auth.admin.deleteUser(id)`, return translated error
5. On success: `redirect("/dashboard")`

Imports to add: `prisma` from `@/lib/prisma`, `createClient` from `@supabase/supabase-js`.

The admin client for cleanup uses `createClient(url, secretKey)` directly from `@supabase/supabase-js` — not the SSR cookie-based client. This is intentional: the admin delete is a server-to-server call that doesn't need cookies.

#### 2. Dashboard — Read from Prisma User

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Replace the Supabase session read with a Prisma User query to prove the register → login → dashboard loop works through the Prisma data layer.

**Contract**: The dashboard RSC reads the session to get the user UUID, then calls `prisma.user.findUnique({ where: { id } })`. If no User record is found (shouldn't happen for normal flow), falls back gracefully. Displays `user.email` from the Prisma record instead of `session.user.email`.

Import to add: `prisma` from `@/lib/prisma`.

### Success Criteria:

#### Automated Verification:

- `pnpm build:ci` passes
- `pnpm lint` passes

#### Manual Verification:

- Register a new user → verify User record appears in Prisma Studio
- Login with the new user → dashboard shows email from Prisma User record
- Sign out → sign back in → dashboard still works
- Attempt to register with same email → appropriate error message

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the commit step.

---

## Testing Strategy

### Unit Tests:

- No test runner configured — no unit tests.

### Manual Testing Steps:

1. Register a new account via `/rejestracja`
2. Check Prisma Studio — `User` table should have a row with the Supabase UUID as ID
3. Verify the dashboard shows the email from the Prisma record
4. Sign out, sign back in — dashboard still works
5. Try registering the same email — should see "Konto z tym adresem e-mail już istnieje"

## Migration Notes

- First migration touching user identity — no existing data to migrate.
- The `User` table has no auto-generated PK; the ID is set explicitly from Supabase Auth during registration.
- F-02 will add relations from domain models to `User` in a subsequent migration.

## References

- F-01 implementation: `context/changes/supabase-auth-wiring/plan.md`
- Roadmap F-01b: `context/foundation/roadmap.md`
- Register Server Action: `src/app/(auth)/actions.ts:50-70`
- Dashboard RSC: `src/app/(app)/dashboard/page.tsx`
- Prisma Client singleton: `src/lib/prisma.ts`
- Supabase server client: `src/lib/supabase/server.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: User Model in Prisma Schema

#### Automated

- [x] 1.1 `pnpm db:generate` completes without errors
- [x] 1.2 `pnpm build:ci` passes

#### Manual

- [x] 1.3 Owner runs `pnpm db:migrate` — migration applies cleanly
- [x] 1.4 Owner verifies `User` table in `pnpm db:studio`

### Phase 2: Wire User Creation into Auth Flow + Dashboard

#### Automated

- [x] 2.1 `pnpm build:ci` passes
- [x] 2.2 `pnpm lint` passes

#### Manual

- [x] 2.3 Register a new user → User record appears in Prisma Studio
- [x] 2.4 Login → dashboard shows email from Prisma User
- [x] 2.5 Sign out → sign back in → dashboard works
- [x] 2.6 Register same email → appropriate error
