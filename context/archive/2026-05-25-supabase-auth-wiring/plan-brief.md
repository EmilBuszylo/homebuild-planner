# Supabase Auth End-to-End — Plan Brief

> Full plan: `context/changes/supabase-auth-wiring/plan.md`

## What & Why

Wire Supabase Auth into the existing login/register forms so that FR-001 (create account) and FR-002 (sign in) work for real. This is foundation F-01 from the roadmap — it unblocks every user-facing slice (S-01 through S-06) because all features require an authenticated user.

## Starting Point

Auth forms exist (`login-form.tsx`, `register-form.tsx`) with React Hook Form + zod validation, but `onSubmit` is a `console.log` stub. No Supabase packages are installed, no middleware, no Server Actions, no Supabase client utilities. `.env.example` declares the expected env vars.

## Desired End State

A user can register at `/rejestracja`, log in at `/logowanie`, and reach a protected `/panel` (dashboard stub) that shows their email and a sign-out button. Unauthenticated users are redirected away from protected pages. Authenticated users are redirected away from auth pages. Sessions persist across tab closes via cookie-based tokens refreshed by middleware.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Post-login redirect | Stub `/dashboard` under `(app)` route group | No real dashboard yet; stub proves auth works and gives sign-out a home. |
| Route protection | Next.js middleware | Single enforcement point; runs before RSC rendering; consistent with Supabase SSR docs. |
| Email confirmation | Disabled in MVP | Removes friction from testing and first-use; can be enabled later in Supabase dashboard. |
| Error display | Inline under form | Keeps user in context; no toast library needed. |
| Sign-out location | Dashboard stub page | Minimal surface; avoids building a global nav component in this change. |
| Session check method | `getSession()` in middleware | Reads JWT from cookie (no network round-trip); acceptable for MVP since middleware refreshes token first. |
| Form integration | Keep RHF, call Server Actions from `onSubmit` | Forms are already built with RHF + zod; rewriting to `useActionState` would be scope creep. |

## Scope

**In scope:**
- Install `@supabase/ssr` + `@supabase/supabase-js`
- Browser and server Supabase client utilities
- Next.js middleware (token refresh + route protection)
- Server Actions for login, register, sign-out
- Rewire both forms to call Server Actions with inline errors + pending state
- `/dashboard` stub page with sign-out
- `(app)` route group + layout
- Polish URL `/panel` → `/dashboard` rewrite

**Out of scope:**
- OAuth / social login, forgot password, magic link
- Email confirmation flow
- Prisma schema changes (that's F-02)
- Real dashboard UI (that's S-01+)
- Profile / account settings

## Architecture / Approach

```
Browser (Client Component)          Server (Server Action)         Supabase
  LoginForm / RegisterForm  ──────►  login() / register()  ──────►  Auth API
       │                                    │
       │ (cookie set by Supabase SSR)       │ redirect("/dashboard")
       ▼                                    ▼
  Middleware (every request)  ◄──── cookie refresh via getSession()
       │
       ├─ protected path + no session → redirect /logowanie
       └─ auth path + session → redirect /dashboard
```

Two Supabase client utilities (`client.ts` for browser, `server.ts` for server) plus a middleware helper (`middleware.ts`) that wires cookie read/write into `@supabase/ssr`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. SDK Infrastructure | Packages installed, client utilities, middleware (token refresh only) | Supabase key naming may differ from training data — must check current docs |
| 2. Auth Actions + Forms | Server Actions for login/register/sign-out; forms rewired with inline errors | `redirect()` inside Server Actions must be called outside try/catch (Next.js constraint) |
| 3. Protection + Dashboard | Middleware route guards, `/dashboard` stub with sign-out, `(app)` layout | Middleware path matching must account for rewrites (`/logowanie` → `/login`) |

**Prerequisites:** Supabase project exists with email auth enabled and email confirmation disabled. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` populated in `.env.local`.
**Estimated effort:** ~1-2 sessions across 3 phases.

## Open Risks & Assumptions

- Supabase Auth SDK key naming (`Publishable` / `Secret` vs legacy `anon` / `service_role`) must be verified against current docs before implementation
- `redirect()` in Server Actions throws a `NEXT_REDIRECT` error — it must not be caught by a try/catch wrapping the auth call
- Middleware runs on rewrites: visiting `/logowanie` hits middleware with `request.nextUrl.pathname` = `/logowanie` (the source path), not `/login` — route matching must handle both forms

## Success Criteria (Summary)

- A new user can register and immediately access the protected dashboard stub
- An existing user can log in, see their email on the dashboard, and sign out
- Unauthenticated visits to `/panel` redirect to `/logowanie`; authenticated visits to `/logowanie` redirect to `/panel`
