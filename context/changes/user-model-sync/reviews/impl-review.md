<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: User Model Sync with Supabase Auth

- **Plan**: context/changes/user-model-sync/plan.md
- **Scope**: All Phases (1–2 of 2)
- **Date**: 2026-05-26
- **Verdict**: APPROVED
- **Findings**: 0 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Non-null assertion on supabaseUser.email

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(auth)/actions.ts:81
- **Detail**: `supabaseUser.email!` uses a non-null assertion. The Supabase `signUp` return type has `email: string | undefined`. While email+password signup always returns an email, the SDK type is `string | undefined`.
- **Fix**: Replace with an explicit null guard that returns an error if email is missing.
- **Decision**: FIXED — combined null user + null email check into `if (!supabaseUser?.email)` guard.

### F2 — Unguarded process.env in rollback path

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/(auth)/actions.ts:89
- **Detail**: `process.env.NEXT_PUBLIC_SUPABASE_URL!` in the rollback catch block uses a non-null assertion. If the env var is missing at runtime, this throws and masks the original Prisma error.
- **Fix**: Add the URL to the existing `secretKey` guard.
- **Decision**: SKIPPED

### F3 — Dashboard email fallback instead of strict replacement

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Plan Adherence
- **Location**: src/app/(app)/dashboard/page.tsx:18-21
- **Detail**: Plan said "displays user.email from Prisma instead of session.user.email." Implementation uses `user?.email ?? authUser?.email` fallback chain. Pragmatic for pre-existing users. Benign drift.
- **Decision**: SKIPPED

### F4 — No server-side auth guard in dashboard RSC

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: src/app/(app)/dashboard/page.tsx:5
- **Detail**: Middleware handles route protection, but adding `if (!authUser) redirect("/logowanie")` after the getUser() call would provide defense-in-depth.
- **Decision**: SKIPPED

### F5 — getSession() in middleware (pre-existing)

- **Severity**: 💡 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: src/middleware.ts:13
- **Detail**: Middleware uses getSession() which reads the JWT without server-side verification. Pre-existing from F-01 — not introduced by this change. Already triaged and skipped in the F-01 review.
- **Decision**: SKIPPED
