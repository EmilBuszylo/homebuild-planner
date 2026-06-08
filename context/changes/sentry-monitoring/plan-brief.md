# Monitoring aplikacji z Sentry — Plan Brief

> Full plan: `context/changes/sentry-monitoring/plan.md`
> Research: `context/changes/sentry-monitoring/research.md`

## What & Why

Dodać **Sentry** do home-build-planner, żeby błędy produkcyjne (API, Server Actions, klient) były widoczne poza `console.error` i logami Vercel. Observability było świadomie odłożone w roadmapie — teraz mamy health endpoint i stabilne API error handling (`65a543d`), więc to naturalny następny krok diagnostyki.

## Starting Point

Brak `@sentry/*`, brak `instrumentation.ts` i error boundaries. Cztery route handlery **łapią** wyjątki i zwracają JSON 500 — Sentry ich nie zobaczy bez `captureException`. Deploy na Vercel przez `deploy.yml`; env w docs to tylko Supabase + Prisma.

## Desired End State

Z `SENTRY_DSN` na Vercel: rzucany błąd serwera trafia do Sentry ze zrozumiałym stack trace (source maps z prod build). Lokalnie i w CI wszystko działa **bez** Sentry env. Użytkownik nadal widzi polskie komunikaty błędów — bez zmiany kontraktu API.

## Key Decisions Made

| Decision | Choice | Why | Source |
|----------|--------|-----|--------|
| SDK setup | `@sentry/nextjs` wizard / equivalent files | Oficjalna ścieżka dla Next 16 | Research |
| MVP scope | Errors only, `tracesSampleRate: 0` | Minimalny koszt, wystarczy na start | Plan |
| Session Replay | Out of scope | Koszt/complexity vs solo MVP | Plan |
| Capture pattern | `src/lib/observability/report-error.ts` wrapper | Testowalne mocki w Vitest | Research + Plan |
| Source maps | Upload z Vercel build (`SENTRY_AUTH_TOKEN`) | `deploy.yml` już buduje prod tam | Research |
| CI `build:ci` | Bez Sentry tokena | PR gate bez sekretów Sentry | Research |
| PII | `beforeSend` scrub email | Auth flows znają email | Plan |
| Alerting | Sentry UI only (owner) | Poza repo | Plan |
| 429 rate limit | Nie raportować do Sentry | Oczekiwany flow biznesowy | Research |

## Scope

**In scope:** wizard/bootstrap, `withSentryConfig`, `global-error.tsx`, `reportError` w API catch + register, Server Action instrumentation, env docs, deploy smoke.

**Out of scope:** Replay, traces/APM, alert rules w repo, E2E Sentry, CI source maps na PR, zastąpienie `console.error`.

## Architecture / Approach

```
Błąd w API catch / Server Action / React
    → reportError() lub Sentry auto (onRequestError)
    → Sentry ingest (DSN)
    ← source maps z vercel build --prod
```

Wizard tworzy configi client/server/edge + `instrumentation.ts`. Istniejące `catch` w API wołają `reportError` **po** `console.error`. Middleware wyklucza tunnel path. Owner ustawia env w Vercel — agent nie commituje sekretów.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. SDK bootstrap | Pakiet, configi, next.config wrap, env docs | Wizard interaktywny — manual fallback |
| 2. Server capture | `reportError` + API + register | Mock w testach musi być dodany |
| 3. Client & actions | global-error, withServerActionInstrumentation, tunnel | `redirect()` vs try/catch w actions |
| 4. Verify & docs | smoke route, AGENTS/deploy-plan, owner deploy check | Invalid `SENTRY_AUTH_TOKEN` blokuje build |

**Prerequisites:** Konto Sentry, Vercel project access (owner), merge na `master` dla prod deploy smoke.

**Estimated effort:** ~2–3 sesje implementacji, 4 fazy.

## Open Risks & Assumptions

- Wizard może wymagać interakcji ownera (login Sentry) — agent replikuje pliki ręcznie z docs.
- `SENTRY_AUTH_TOKEN` złej scope → fail prod build; owner weryfikuje przed merge.
- Zakładamy że SDK no-op bez DSN w dev/CI (weryfikować w Phase 1).

## Success Criteria (Summary)

- Błąd serwera na Preview/Production widoczny w Sentry ze stack trace.
- `pnpm test` + `pnpm build:ci` green bez Sentry env.
- Brak false-positive z 401/404/429.
