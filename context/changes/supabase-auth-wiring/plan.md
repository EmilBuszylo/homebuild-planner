# Supabase Auth End-to-End — Implementation Plan

## Overview

Wire Supabase Auth into the existing login and registration forms so that FR-001 (create account) and FR-002 (sign in) work for real. After this change a user can register, log in, access a protected dashboard stub, and sign out — all through cookie-based sessions refreshed by Next.js middleware.

## Current State Analysis

Auth forms (`login-form.tsx`, `register-form.tsx`) exist as Client Components with React Hook Form + zod validation, but `onSubmit` does only `console.log`. No Supabase packages are installed. No middleware, no Server Actions, no Supabase client utilities exist. `.env.example` already declares the expected env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`).

### Key Discoveries:

- Forms use `createZodResolver` shim (`src/lib/validations/zod-resolver.ts`) to bridge zod v4 with `@hookform/resolvers` — this pattern stays, no changes needed
- `src/lib/routes.ts` defines `login`, `register`, `home` — needs `dashboard` added
- `next.config.ts` has `rewrites` for Polish paths — needs `/panel` → `/dashboard` added
- `lessons.md` mandates: Server Actions for auth ops, API routes + Prisma for domain data
- `@supabase/ssr` requires two client utilities (browser + server) and middleware for cookie-based token refresh; Server Components cannot write cookies, so middleware handles refresh on every request

## Desired End State

A user visiting `/logowanie` can enter credentials and reach `/panel` (dashboard stub). A new user visiting `/rejestracja` can create an account and land on the same dashboard. Unauthenticated requests to `(app)` routes redirect to `/logowanie`. Authenticated requests to auth pages redirect to `/panel`. A "Wyloguj" button on the dashboard signs the user out and redirects to `/logowanie`. `pnpm build` passes with zero type errors.

## What We're NOT Doing

- OAuth / social login (GitHub, Google) — PRD FR-011 is nice-to-have
- Forgot password / magic link — out of MVP scope per AGENTS.md
- Email confirmation flow — disabled in Supabase project settings for MVP
- Profile / account settings page — separate slice
- Prisma schema changes — no domain tables in this change (F-02 handles that)
- Full dashboard UI — this is a stub page; real dashboard comes in S-01+

## Implementation Approach

Install `@supabase/ssr` + `@supabase/supabase-js`, create thin client utilities for browser and server contexts, add Next.js middleware for token refresh and route protection, implement Server Actions for login/register/sign-out, rewire existing forms to call those actions (keeping RHF validation), and create a minimal dashboard stub under `(app)/dashboard`.

## Critical Implementation Details

**Timing & lifecycle** — Middleware must call `supabase.auth.getSession()` to refresh the token cookie **before** any route-protection logic reads the session. If this order is inverted, the user will appear logged out despite holding a valid refresh token. The `updateSession` helper in `src/lib/supabase/middleware.ts` encapsulates this: refresh first, then read, then decide redirect.

## Phase 1: Supabase SDK Infrastructure

### Overview

Install Supabase packages, create browser and server client utility functions, and create middleware that refreshes auth cookies on every request. After this phase the project builds cleanly with the new dependencies and middleware wired but no auth functionality yet.

### Changes Required:

#### 1. Install Supabase packages

**Intent**: Add the two packages needed for Supabase Auth with SSR cookie support.

**Contract**: `pnpm add @supabase/supabase-js @supabase/ssr` — both land in `dependencies` in `package.json`.

#### 2. Browser client utility

**File**: `src/lib/supabase/client.ts`

**Intent**: Provide a singleton Supabase client for Client Components. Used by forms if they ever need to subscribe to auth state (not needed in Phase 2, but the utility must exist for completeness).

**Contract**: Export a `createClient()` function that calls `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No custom cookie config — browser client handles cookies automatically.

#### 3. Server client utility

**File**: `src/lib/supabase/server.ts`

**Intent**: Provide a request-scoped Supabase client for Server Components, Server Actions, and Route Handlers. Reads/writes cookies via Next.js `cookies()` API.

**Contract**: Export an `async createClient()` function that calls `createServerClient` from `@supabase/ssr` with the two public env vars and a `cookies` config object using `cookieStore.getAll()` and `cookieStore.set()` (wrapped in try/catch for Server Components which cannot write cookies).

#### 4. Middleware helper

**File**: `src/lib/supabase/middleware.ts`

**Intent**: Encapsulate the Supabase token-refresh logic that must run on every request. Creates a server client wired to the request/response cookie pair, calls `getSession()` to trigger refresh, and returns the (potentially cookie-modified) response.

**Contract**: Export an `async updateSession(request: NextRequest)` function. Internally creates a `NextResponse.next()`, wires `createServerClient` with `getAll` reading from `request.cookies` and `setAll` writing to both `request.cookies` and `response.cookies`, calls `supabase.auth.getSession()`, and returns `{ supabase, response }`. No route-protection logic here — that lives in the middleware itself (Phase 3).

#### 5. Next.js middleware entry

**File**: `src/middleware.ts`

**Intent**: Wire the middleware helper into Next.js. In Phase 1 this only refreshes tokens; route protection is added in Phase 3.

**Contract**: Default-export an `async middleware(request)` function that calls `updateSession(request)` and returns the response. Export a `config` object with a `matcher` that excludes static assets and `_next`:

```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes with zero type errors
- `pnpm lint` passes
- `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, and `src/middleware.ts` exist

#### Manual Verification:

- `pnpm dev` starts without errors; visiting `/logowanie` still shows the login form (middleware runs but does not block anything yet)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Auth Server Actions + Form Integration

### Overview

Create Server Actions for login, register, and sign-out. Rewire both forms to call these actions from their `onSubmit` handlers, display server-side errors inline, and show a pending state on submit buttons.

### Changes Required:

#### 1. Auth Server Actions

**File**: `src/app/(auth)/actions.ts`

**Intent**: Implement the three auth operations as Server Actions per `lessons.md` rule "Use Server Actions for Supabase auth". Each action validates input on the server side (defense in depth), calls Supabase Auth, and either returns an error object or redirects.

**Contract**:
- `"use server"` directive at top of file
- Export `type AuthResult = { error?: string }`
- Export `async function login(values: { email: string; password: string }): Promise<AuthResult>` — calls `supabase.auth.signInWithPassword`, on success calls `redirect("/dashboard")`, on error returns `{ error: <Polish message> }`
- Export `async function register(values: { email: string; password: string }): Promise<AuthResult>` — calls `supabase.auth.signUp`, same return pattern
- Export `async function signOut(): Promise<void>` — calls `supabase.auth.signOut()`, then `redirect("/logowanie")`
- Error translation: map common Supabase error messages to Polish strings ("Invalid login credentials" → "Nieprawidłowy e-mail lub hasło", "User already registered" → "Konto z tym adresem e-mail już istnieje", rate-limit errors → "Zbyt wiele prób. Spróbuj ponownie za chwilę", fallback → "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.")

#### 2. Rewire login form

**File**: `src/components/auth/login-form.tsx`

**Intent**: Replace the `console.log` stub with a real call to the `login` Server Action. Add `useState` for server-side error and `useTransition` for pending state. Display the error inline below the form fields.

**Contract**:
- Import `login` from `@/app/(auth)/actions` and `useState`, `useTransition` from `react`
- `onSubmit` calls `startTransition(async () => { ... })` wrapping the Server Action call
- On `result?.error`, set `serverError` state; clear it at start of each submit
- Pass `isPending` to disable the submit button and change its label ("Logowanie..." while pending)
- Render `serverError` as a styled paragraph (destructive color) between the last field and the submit button

#### 3. Rewire register form

**File**: `src/components/auth/register-form.tsx`

**Intent**: Same pattern as login form — call `register` Server Action, show inline errors, pending state.

**Contract**:
- Import `register` from `@/app/(auth)/actions`
- Same `useState` + `useTransition` pattern
- `confirmPassword` is NOT sent to the Server Action — only `email` and `password` (confirmPassword is a client-only validation concern)
- Button label: "Zakładanie konta..." while pending

#### 4. Auth error display component (optional extraction)

**File**: `src/components/auth/auth-form-layout.tsx`

**Intent**: Add a small `AuthServerError` component to `auth-form-layout.tsx` for consistent inline error rendering across both forms.

**Contract**: Export `AuthServerError({ message }: { message: string | null })` — renders nothing when `message` is null, otherwise a `<p>` with `text-sm text-destructive` styling.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes with zero type errors
- `pnpm lint` passes

#### Manual Verification:

- Register a new user at `/rejestracja` → redirects to `/dashboard` (404 is fine — page doesn't exist yet)
- Log in with the same credentials at `/logowanie` → same redirect
- Attempt login with wrong password → inline error "Nieprawidłowy e-mail lub hasło"
- Attempt registration with existing email → inline error
- Submit button shows pending state during requests

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Route Protection + Dashboard Stub

### Overview

Add route-protection logic to the middleware (redirect unauthenticated users away from `(app)` routes, redirect authenticated users away from auth pages), create the `(app)` route group with a protected layout, and build a minimal dashboard stub with a sign-out button.

### Changes Required:

#### 1. Extend middleware with route protection

**File**: `src/middleware.ts`

**Intent**: After token refresh, check the session and enforce redirects: unauthenticated users on protected paths go to `/logowanie`, authenticated users on auth pages go to `/dashboard`.

**Contract**:
- After `updateSession`, call `supabase.auth.getSession()` to read session from the (now-refreshed) cookies
- Define protected path prefixes: `["/dashboard"]` (extend as `(app)` grows)
- Define auth paths: `["/login", "/register"]`
- If no session AND path starts with a protected prefix → `NextResponse.redirect` to `/logowanie`
- If session AND path starts with an auth path → `NextResponse.redirect` to `/dashboard`
- Otherwise return the response from `updateSession`

#### 2. Add dashboard route to routes.ts

**File**: `src/lib/routes.ts`

**Intent**: Add the Polish dashboard path so UI links use the consistent pattern.

**Contract**: Add `dashboard: "/panel"` to the `routes` object.

#### 3. Add dashboard rewrite

**File**: `next.config.ts`

**Intent**: Map the Polish URL `/panel` to the internal `/dashboard` route, consistent with the existing login/register pattern.

**Contract**: Add `{ source: "/panel", destination: "/dashboard" }` to the `rewrites` array.

#### 4. Protected (app) layout

**File**: `src/app/(app)/layout.tsx`

**Intent**: Provide a layout wrapper for all protected pages. For now it's a minimal shell; real navigation comes in later slices.

**Contract**: Default-export a React Server Component that wraps `children` in a basic layout container.

#### 5. Dashboard stub page

**File**: `src/app/(app)/dashboard/page.tsx`

**Intent**: Minimal page that proves auth works — shows the user's email and a sign-out button. This is NOT the final dashboard; it's a verification surface for the auth wiring.

**Contract**:
- Server Component that reads session via `createClient()` from `@/lib/supabase/server`
- Displays `session.user.email`
- Renders a Client Component `SignOutButton` that calls the `signOut` Server Action
- Polish copy: "Panel" as heading, "Wyloguj" on the button

#### 6. Sign-out button component

**File**: `src/components/auth/sign-out-button.tsx`

**Intent**: A small Client Component that wraps the `signOut` Server Action in a button with pending state.

**Contract**: `"use client"`, uses `useTransition`, calls `signOut` from `@/app/(auth)/actions`, button label "Wylogowanie..." while pending.

### Success Criteria:

#### Automated Verification:

- `pnpm build` passes with zero type errors
- `pnpm lint` passes
- `src/app/(app)/dashboard/page.tsx` and `src/app/(app)/layout.tsx` exist

#### Manual Verification:

- Visit `/panel` while not logged in → redirects to `/logowanie`
- Log in → redirects to `/panel`, shows user email and "Wyloguj" button
- Visit `/logowanie` while logged in → redirects to `/panel`
- Click "Wyloguj" → redirects to `/logowanie`, session is cleared
- Visit `/panel` again → redirects to `/logowanie` (confirms session was cleared)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- No test runner in repo — do not add one (per AGENTS.md). All verification is manual + build.

### Integration Tests:

- Not applicable for this change.

### Manual Testing Steps:

1. **Happy path — register**: Visit `/rejestracja`, fill valid data, submit → lands on `/panel` with email displayed
2. **Happy path — login**: Visit `/logowanie`, use registered credentials → lands on `/panel`
3. **Happy path — sign-out**: Click "Wyloguj" on dashboard → lands on `/logowanie`
4. **Error — wrong password**: Enter valid email + wrong password at `/logowanie` → inline error
5. **Error — duplicate email**: Register with already-used email → inline error
6. **Protection — unauthenticated**: Visit `/panel` directly → redirects to `/logowanie`
7. **Protection — authenticated**: Visit `/logowanie` while logged in → redirects to `/panel`
8. **Session persistence**: Log in, close tab, reopen `/panel` → still logged in (cookie persists)
9. **Build**: `pnpm build` passes cleanly

## Performance Considerations

- Middleware runs on every matched request; `getSession()` reads the JWT from cookies (no network call to Supabase unless token needs refresh) — latency impact is negligible for MVP scale.
- `@supabase/ssr` browser client uses a singleton pattern — no duplicate instances.

## Migration Notes

- **Supabase project setup required**: email confirmation must be disabled in Supabase dashboard (Authentication → Providers → Email → "Confirm email" toggle OFF) before testing registration.
- **Env vars**: `.env.local` must have `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` populated with values from the Supabase project dashboard before any manual testing.

## References

- Supabase SSR docs: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Roadmap entry: `context/foundation/roadmap.md` — F-01
- Lessons: `context/foundation/lessons.md` — "Use Server Actions for Supabase auth"
- PRD: `context/foundation/prd.md` — FR-001, FR-002
- Existing forms: `src/components/auth/login-form.tsx:35-38`, `src/components/auth/register-form.tsx:39-42`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Supabase SDK Infrastructure

#### Automated

- [x] 1.1 `pnpm build` passes with zero type errors — 33bf751
- [x] 1.2 `pnpm lint` passes — 33bf751
- [x] 1.3 Supabase client utilities and middleware files exist — 33bf751

#### Manual

- [x] 1.4 `pnpm dev` starts; `/logowanie` renders login form without errors — 33bf751

### Phase 2: Auth Server Actions + Form Integration

#### Automated

- [x] 2.1 `pnpm build` passes with zero type errors
- [x] 2.2 `pnpm lint` passes

#### Manual

- [x] 2.3 Register a new user → redirects to `/dashboard`
- [x] 2.4 Log in with credentials → redirects to `/dashboard`
- [x] 2.5 Wrong password → inline error
- [x] 2.6 Duplicate email → inline error
- [x] 2.7 Submit button shows pending state

### Phase 3: Route Protection + Dashboard Stub

#### Automated

- [ ] 3.1 `pnpm build` passes with zero type errors
- [ ] 3.2 `pnpm lint` passes
- [ ] 3.3 Dashboard page and (app) layout files exist

#### Manual

- [ ] 3.4 `/panel` unauthenticated → redirects to `/logowanie`
- [ ] 3.5 Login → redirects to `/panel`, shows email
- [ ] 3.6 `/logowanie` while authenticated → redirects to `/panel`
- [ ] 3.7 Sign-out → redirects to `/logowanie`, session cleared
- [ ] 3.8 Session persists across tab close/reopen
