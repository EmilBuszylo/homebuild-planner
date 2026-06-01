# Vitest Minimal Setup — Plan Brief

> Full plan: `context/changes/vitest-minimal-setup/plan.md`

## What & Why

Repo ma działające MVP (generacja planu, benchmarki rynkowe, limit przeliczeń), ale **zero automatycznych testów** — agent i CI nie wykrywają regresji w krytycznej logice czystej. F-07 dodaje minimalny Vitest i `pnpm test`, żeby bezpiecznie domknąć fazę polish (**S-10**).

## Starting Point

- Brak `vitest` w `package.json`, brak `*.test.ts`.
- CI: lint + build tylko (`.github/workflows/ci.yml`).
- Logika do pokrycia już istnieje: `apply-market-benchmarks.ts`, `getPlanRecalcPolicy()` w `plan-recalc.ts`.

## Desired End State

Developer i agent uruchamiają `pnpm test` lokalnie; PR na GitHubie przechodzą lint → **test** → build. Co najmniej dwa pliki testów chronią benchmark refinement i politykę limitu env — bez bazy i bez E2E.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Złożoność | LOW | Konfiguracja + 2 moduły + CI — wzorzec znany z health-check | Plan |
| CI | Tak — `pnpm test` na PR | Regresje nie przechodzą merge bez sygnału | Plan |
| Moduły testów | `applyMarketBenchmarks` + `getPlanRecalcPolicy` | Roadmap + najwyższy ROI po S-04/S-06 | Plan |
| `checkPlanRecalcLimit` | Poza scope | Wymaga mocka Prisma — nie minimal F-07 | Plan |
| Runner | Vitest, env node, `src/**/*.test.ts` | Szybkie testy czystej logiki, alias `@/*` | Plan |
| Coverage / E2E | Out of scope | Roadmap risk: scope creep | Roadmap |

## Scope

**In scope:**
- `vitest` + `vitest.config.ts` + `pnpm test`
- Testy: benchmarks (≥4 cases), policy env (≥3 cases)
- CI step + aktualizacja `AGENTS.md`

**Out of scope:**
- E2E, RTL, API tests, `checkPlanRecalcLimit` z Prisma
- `investment-state` tests, coverage gates, refactor NaN guard

## Architecture / Approach

```
pnpm test → vitest run → src/lib/**/*.test.ts (node)
                              ├─ apply-market-benchmarks.test.ts
                              └─ plan-recalc.test.ts (getPlanRecalcPolicy only)

PR: checkout → pnpm install → lint → test → build:ci
```

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Vitest toolchain | Config + skrypt `test` | Alias `@/` źle skonfigurowany |
| 2. Unit tests | ≥7 przypadków na 2 moduły | Zbyt grube fixture Prisma types |
| 3. CI + AGENTS.md | Test na PR, docs dla agentów | Workflow YAML typo |

**Prerequisites:** Node 20, pnpm 9 (jak w CI).  
**Estimated effort:** ~1 sesja implementacji (3 fazy).

## Open Risks & Assumptions

- `NaN` z benchmarków w DB nadal możliwy (impl-review F2) — nie naprawiamy w F-07.
- AGENTS.md historycznie mówiło „no test stack” — wymaga jednej linii aktualizacji.
- Phase 1 samodzielnie może nie mieć testów — implementer robi Phase 1+2 w jednym przebiegu.

## Success Criteria (Summary)

- `pnpm test` przechodzi lokalnie.
- CI na PR uruchamia testy przed buildem.
- S-10 może startować z guardrailem regresji na logice czystej.
