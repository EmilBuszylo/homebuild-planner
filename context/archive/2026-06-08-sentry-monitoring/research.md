---
date: 2026-06-08T10:28:38+02:00
researcher: Cursor Agent
git_commit: 65a543d
branch: master
repository: home-build-planner
topic: "Monitoring aplikacji z Sentry — integracja w Next.js 16 App Router"
tags: [research, codebase, sentry, observability, nextjs, vercel]
status: complete
last_updated: 2026-06-08
last_updated_by: Cursor Agent
---

# Research: Monitoring aplikacji z Sentry

**Date**: 2026-06-08T10:28:38+02:00  
**Researcher**: Cursor Agent  
**Git Commit**: `65a543d`  
**Branch**: `master`  
**Repository**: home-build-planner

## Research Question

Skonfiguruj monitoring aplikacji z Sentry — jakie są obecne wzorce obsługi błędów, punkty integracji w Next.js 16 App Router, wymagania deploy/CI oraz rekomendowany sposób wdrożenia?

## Summary

Projekt **nie ma** żadnej integracji Sentry ani innego APM. Observability było świadomie **parked** w roadmapie (health endpoint `GET /api/health/db` jako jedyny smoke). Błędy serwerowe są dziś raportowane wyłącznie przez **`console.error`** w 4 route handlerach API i 3 miejscach w Server Action `register` — bez centralnego error trackingu.

Stack: **Next.js 16.2.6**, React 19, App Router (`src/app/`), deploy na **Vercel** przez GitHub Actions (`vercel build --prod` → `vercel deploy --prebuilt`). Brak `instrumentation.ts`, `error.tsx`, `global-error.tsx`, `@sentry/*` w `package.json`.

**Rekomendacja:** użyć oficjalnego wizarda `npx @sentry/wizard@latest -i nextjs` (SDK `@sentry/nextjs`, peer `next ^16`), który tworzy configi client/server/edge, `instrumentation.ts`, `withSentryConfig` w `next.config.ts` i `global-error.tsx`. Po wizardzie **uzupełnić ręcznie** `Sentry.captureException` w istniejących blokach `catch` API (błędy są połykane do JSON 500) oraz rozważyć `Sentry.withServerActionInstrumentation` dla auth actions. Env: DSN + `SENTRY_AUTH_TOKEN` w Vercel (Preview + Production); CI `build:ci` bez uploadu source maps.

## Detailed Findings

### 1. Stan observability (baseline)

| Aspekt | Stan |
|--------|------|
| Sentry / APM | Brak (`package.json` — zero `@sentry/*`) |
| Logowanie | Tylko `console.error` w 5 plikach `src/` |
| Health | `GET /api/health/db` — Prisma upsert, 200/503 |
| Error boundaries | Brak `error.tsx`, `global-error.tsx`, `not-found.tsx` |
| Instrumentation | Brak `src/instrumentation.ts` |
| Roadmap | Observability parked — `context/foundation/roadmap.md:57`, `:171` |

Ostatnia poprawka error handling (commit `65a543d`) dodała try/catch + `console.error` + JSON 500 w `GET /api/plans/[planId]/results` — nadal bez zewnętrznego trackingu.

### 2. Miejsca `console.error` (kandydaci na `captureException`)

| Plik | Linie | Kontekst |
|------|-------|----------|
| `src/app/api/health/db/route.ts` | 16 | DB health failure → 503 |
| `src/app/api/plans/route.ts` | 68 | POST create plan → 500 |
| `src/app/api/plans/[planId]/results/route.ts` | 88 | GET results → 500 |
| `src/app/api/plans/[planId]/recalculate/route.ts` | 98 | POST recalc (non-429) → 500 |
| `src/app/(auth)/actions.ts` | 95–110 | Prisma user create + cleanup failures |

**Świadomie bez logu:** 429 rate limit w recalculate (`route.ts:86–95`) — oczekiwany flow biznesowy.

**Bez logu, tylko UI:** `questionnaire-form.tsx:182–187` — network catch → `setServerError` (client; wymaga browser SDK).

**Prisma:** `src/lib/prisma.ts:10–11` — wbudowane `log: ["error"]` / `["error","warn"]` w dev.

### 3. API routes — kontrakt błędów

Cztery handlery pod `src/app/api/`, wszystkie `export const runtime = "nodejs"`:

| Route | Statusy | Catch → response |
|-------|---------|------------------|
| `POST /api/plans` | 201, 400, 401, 409, 500 | `catch` → generic PL error |
| `GET /api/plans/[planId]/results` | 200, 401, 404, 500 | `catch` → generic PL error |
| `POST /api/plans/[planId]/recalculate` | 200, 400, 401, 404, 429, 500 | `RateLimitError` → 429; inne → 500 |
| `GET /api/health/db` | 200, 503 | `catch` → `{ ok: false }` |

Testy kontraktu: `src/lib/api/plans-route-handlers.test.ts` (16 testów, w tym 500 na DB error).

**Ważne:** większość błędów jest **łapana i mapowana** na JSON — auto-instrumentacja Sentry ich **nie złapie** bez `Sentry.captureException(error)` w `catch`.

**Konsument RSC:** `src/lib/api/fetch-plan-results.ts:44–45` — dowolny non-OK (w tym 500) → `{ status: "error" }` bez logowania ani throw.

### 4. Architektura App Router — punkty integracji Sentry

```
src/app/layout.tsx              # root RSC — opcjonalny client provider
src/app/(app)/layout.tsx        # async RSC: Supabase + Prisma na każdej trasie app
src/middleware.ts               # Edge: session + redirect auth
src/app/(auth)/actions.ts       # Server Actions: login, register, signOut
src/app/api/**/route.ts         # Node route handlers (Prisma)
src/components/**               # 20× "use client" — questionnaire, auth, plan-timeline
```

| Warstwa | Runtime | Plik | Uwagi Sentry |
|---------|---------|------|--------------|
| Middleware | Edge | `src/middleware.ts:9–28` | `sentry.edge.config` + wrap |
| API routes | Node | `src/app/api/**` | server SDK + manual capture w catch |
| Server Actions | Node | `actions.ts` | `withServerActionInstrumentation` (nie auto) |
| RSC pages | Node | `dashboard`, `plan`, `questionnaire` | auto via `onRequestError` w instrumentation |
| Client | Browser | `questionnaire-form`, auth forms | `instrumentation-client.ts` |
| Build | — | `next.config.ts` | `withSentryConfig` — source maps |

Brak `instrumentation.ts` = hook Next.js **wyłączony** do czasu utworzenia pliku.

`next.config.ts` dziś tylko `rewrites` (Polish paths) — linie 3–13; bez Sentry wrappera.

### 5. Deploy, env, CI

**Vercel env (dokumentowane):** `context/deployment/deploy-plan.md` — Supabase + Prisma (`DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SECRET_KEY`). **Brak Sentry** w `.env.example`.

**Production build:** `.github/workflows/deploy.yml` — `vercel pull` (production env) → `vercel build --prod` → `vercel deploy --prebuilt`. Source maps powinny uploadować się podczas `vercel build --prod` jeśli `SENTRY_AUTH_TOKEN` jest w Vercel production env.

**CI PR:** `.github/workflows/ci.yml` — `pnpm build:ci` (`prisma generate && next build`) bez migrate i bez Sentry. Upload map na PR **nie jest wymagany** na MVP.

**Sugerowane env (do dodania w planie):**

| Zmienna | Gdzie | Uwaga |
|---------|-------|-------|
| `SENTRY_DSN` | Vercel Preview + Production | Server; opcjonalnie `NEXT_PUBLIC_SENTRY_DSN` jeśli wizard wymaga client |
| `SENTRY_AUTH_TOKEN` | Vercel Production (+ Preview opcjonalnie) | Build-time source map upload |
| `SENTRY_ORG`, `SENTRY_PROJECT` | Vercel lub hardcode w `withSentryConfig` | Z wizarda |

Nie commitować tokenów; rozszerzyć `.env.example` komentarzami (bez wartości).

### 6. Oficjalna ścieżka Sentry + Next.js 16

Źródło: [Sentry Next.js docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)

1. `npx @sentry/wizard@latest -i nextjs` — instalacja `@sentry/nextjs`, configi per runtime
2. Pliki typowe po wizardzie:
   - `instrumentation-client.ts` (browser)
   - `sentry.server.config.ts` (Node — API, RSC, actions)
   - `sentry.edge.config.ts` (middleware)
   - `src/instrumentation.ts` — `register()` + `onRequestError`
   - `src/app/global-error.tsx` — `Sentry.captureException` w `useEffect`
3. `next.config.ts` → `export default withSentryConfig(nextConfig, { org, project, authToken, tunnelRoute })`
4. Server Actions — **ręczne** opakowanie (`withServerActionInstrumentation`) — auto nie obejmuje
5. Next.js 16 + Turbopack — SDK wspiera (peer `next ^16`)

**Tunnel route** (`/monitoring` lub `/sentry-tunnel`) — omija ad-blockery; uwzględnić w matcherze middleware jeśli chroni wszystkie ścieżki.

## Code References

- `src/app/api/plans/route.ts:67-72` — POST plans catch → 500
- `src/app/api/plans/[planId]/results/route.ts:87-92` — GET results catch → 500
- `src/app/api/plans/[planId]/recalculate/route.ts:85-102` — 429 vs 500 branching
- `src/app/api/health/db/route.ts:8-17` — health check try/catch
- `src/app/(auth)/actions.ts:78-114` — register Prisma + Supabase cleanup
- `src/middleware.ts:9-34` — Edge auth redirects, brak try/catch
- `src/lib/api/fetch-plan-results.ts:22-49` — RSC loopback fetch, silent error status
- `src/components/questionnaire/questionnaire-form.tsx:140-187` — client fetch + catch
- `next.config.ts:3-15` — rewrites only, no Sentry
- `package.json:42` — `next: 16.2.6`
- `.env.example:1-25` — brak Sentry vars
- `.github/workflows/deploy.yml:30-37` — production Vercel build path

## Architecture Insights

1. **Dual error model:** API zwraca polskie JSON errors; RSC często **nie throwuje** (np. `plan/[planId]/page.tsx` renderuje `PlanPageError`) — Sentry zobaczy mniej „render errors”, więcej trzeba wychwycić w API catch i opcjonalnie dodać breadcrumb przy `fetchPlanResults` `{ status: "error" }`.

2. **Lessons compliance:** Sekrety tylko server-side env (zgodne z AGENTS.md); DSN może być publiczny po stronie klienta jeśli włączamy browser SDK — `SENTRY_AUTH_TOKEN` nigdy w `NEXT_PUBLIC_*`.

3. **Owner-only migrate:** `pnpm build` na Vercel uruchamia `prisma migrate deploy` — Sentry nie wpływa na Prisma; build time wydłuży się o upload source maps.

4. **Testy:** Vitest mockuje handlery — po Sentry dodać mock `@sentry/nextjs` w `plans-route-handlers.test.ts` jeśli importujemy `captureException` bezpośrednio (lub thin wrapper w `src/lib/observability/`).

5. **E2E:** Playwright nie w CI gate; Sentry nie blokuje lokalnego dev bez DSN (SDK powinien no-op gdy brak DSN — sprawdzić w planie).

## Historical Context (from prior changes)

- `context/foundation/roadmap.md:57,171` — observability (Sentry, metryki) **parked** po north-star MVP; health endpoint wystarczał na launch.
- `context/foundation/health-check.md:185-188` — explicit lesson: observability do osobnej fazy.
- `context/foundation/archive/2026-05-28-roadmap-mvp.md:61,241` — ta sama decyzja w archiwalnej roadmapie.
- `context/foundation/test-plan.md:51-52` — outage cloud/Supabase out of scope; observability/alerting później.
- `context/archive/2026-05-26-questionnaire-flow/reviews/impl-review.md` — wcześniejsza rekomendacja try/catch na Prisma transaction (zrealizowana w API routes).
- Commit `65a543d` — ostatnie wzmocnienie API error handling (`console.error` + JSON 500) — naturalny punkt startu dla `captureException`.

Brak wcześniejszych prób integracji Sentry w `context/archive/`.

## Related Research

- Brak innych `research.md` pod observability w `context/changes/` lub `context/archive/`.

## Open Questions

1. **Zakres MVP Sentry:** tylko errors server+client, czy też performance (traces), Session Replay?
2. **Sample rates:** `tracesSampleRate` / `replaysSessionSampleRate` na solo MVP (np. 0.1 prod, 1.0 preview)?
3. **PII:** czy scrubować email z `register` / `user.id` w Sentry `beforeSend`?
4. **Tunnel vs DSN:** czy włączyć `tunnelRoute` (wizard default) — wpływ na middleware matcher?
5. **CI source maps:** upload tylko z `deploy.yml` / Vercel build, czy też token w GitHub secrets?
6. **Alerting:** czy change obejmuje tylko ingest, czy też reguły alertów w Sentry UI (poza repo)?

## Recommended plan phases (input for `/10x-plan`)

| Faza | Zakres |
|------|--------|
| 1 | Wizard + env template + Vercel env docs |
| 2 | `captureException` w 4 API catch + auth `register` |
| 3 | `global-error.tsx` + opcjonalnie `(app)/error.tsx` |
| 4 | Server Actions instrumentation (`login`, `register`) |
| 5 | Weryfikacja: test route lub deliberate error + deploy smoke |
