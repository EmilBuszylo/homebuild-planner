# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Route non-auth Supabase access through Next.js API routes

- **Context**: Any server-side data or business operation backed by Supabase (plans, questionnaire saves, estimates, timeline) — excluding auth/session flows (sign-up, sign-in, sign-out, password reset).
- **Problem**: Calling Supabase directly from Client Components or scattering queries in RSC loaders mixes auth with domain logic, makes RLS/policy mistakes easier, and hides API contracts from the rest of the app.
- **Rule**: For every non-auth Supabase operation, expose a Next.js Route Handler under `src/app/api/` (or `app/api/`); the handler uses the Supabase server client; UI and Server Components call only those HTTP endpoints, never the Supabase client for domain data.
- **Applies to**: frame, plan, implement, impl-review

## Use Server Actions for Supabase auth

- **Context**: Supabase auth flows only — sign-up, sign-in, sign-out, password reset, session refresh. Complements the API-routes lesson for non-auth data.
- **Problem**: Putting auth in Route Handlers or calling `supabase.auth` directly from Client Components spreads cookie/session handling, fights Next.js form patterns, and duplicates validation.
- **Rule**: Implement every Supabase auth operation as a Next.js Server Action (`"use server"`); build login and registration forms as Server or Client Components that submit to those actions using Next.js form APIs (`action`, `useActionState` / `useFormState` per current Next docs). Do not use API routes for auth unless Next.js docs require it for a specific flow.
- **Applies to**: frame, plan, implement, impl-review
