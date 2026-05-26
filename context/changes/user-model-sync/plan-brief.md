# User Model Sync with Supabase Auth — Plan Brief

> Full plan: `context/changes/user-model-sync/plan.md`

## What & Why

Add a `User` model to Prisma linked to Supabase Auth so domain models (Plan, PlanVersion, etc.) can form proper FK relations to the user. F-01 wired auth but left a gap — no Prisma entity to anchor domain data against. This foundation (F-01b) closes the gap before F-02 builds the domain schema.

## Starting Point

Supabase Auth is fully operational: registration, login, sign-out, and middleware protection work. But there is no User model in Prisma — `userId` in domain models would be a bare String with no relational integrity. The `register` action creates a Supabase user and redirects; the dashboard reads from the Supabase session directly.

## Desired End State

A Prisma `User` model exists with the Supabase Auth UUID as primary key. Registration atomically creates both the Supabase user and the Prisma record (with rollback on failure). The dashboard queries Prisma to display user data, proving the end-to-end loop. F-02 can add `Plan → User` FK relations.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
|---|---|---|
| User ID strategy | Supabase UUID as Prisma PK (single ID) | Eliminates lookup indirection — session UUID is the DB key; simplest for MVP. |
| User model fields | id + email + timestamps only | Minimal footprint; profile fields added when product needs them. |
| Atomicity handling | Try-catch + Supabase admin deleteUser cleanup | Clean rollback prevents orphaned Supabase users; requires SUPABASE_SECRET_KEY. |
| Existing users | No backfill needed (clean slate) | No test users from F-01 to migrate. |
| Dashboard data source | Switch to Prisma User query | Proves the full register → login → read loop through Prisma. |
| SignOut behavior | Session-only (keep Prisma User) | Standard pattern; account deletion is a separate future concern. |

## Scope

**In scope:**
- `User` model in `prisma/schema.prisma` + migration
- `register` action updated to create Prisma User with rollback
- Dashboard updated to query Prisma User
- Admin Supabase client for cleanup (inline in action, using SUPABASE_SECRET_KEY)

**Out of scope:**
- Domain models (F-02), login-time upsert, account deletion, profile fields, UI changes to forms

## Architecture / Approach

The register Server Action becomes the integration point between Supabase Auth and Prisma. After `signUp` returns the user UUID, Prisma creates a `User` record with that UUID as PK. On failure, the Supabase user is cleaned up via the admin API (service_role key). The dashboard switches from reading session data to querying `prisma.user.findUnique()` with the session UUID, closing the verification loop.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. User Model | Prisma schema + migration | Owner must run `migrate dev` |
| 2. Auth Flow + Dashboard | User creation in register, Prisma-backed dashboard | Admin cleanup requires SUPABASE_SECRET_KEY in .env.local |

**Prerequisites:** F-01 done. `SUPABASE_SECRET_KEY` set in `.env.local`.
**Estimated effort:** ~1 session across 2 phases.

## Open Risks & Assumptions

- `SUPABASE_SECRET_KEY` must be configured in `.env.local` for the rollback path to work. If missing, Prisma creation failures leave orphaned Supabase users.
- The single-ID pattern couples the Prisma PK to Supabase Auth. Acceptable for MVP; if auth provider changes, a one-time UUID migration is needed.

## Success Criteria (Summary)

- Registering a new user creates both a Supabase Auth user and a Prisma User record atomically.
- The dashboard displays user data from the Prisma User, not directly from the Supabase session.
- `pnpm build:ci` passes with the new model and updated actions.
