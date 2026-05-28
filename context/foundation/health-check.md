---
project: home-build-planner
checked_at: 2026-05-28T10:30:00Z
health_status: needs-attention
context_type: brownfield
language_family: js
stack_assessment_available: false
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 0
  moderate: 1
  low: 0
test_runner_detected: false
ci_provider: GitHub Actions
recommended_fixes: 6
focus_change: internet-refinement
---

# Health Check: home-build-planner

> Pełny audyt projektu. Argument `internet-refinement` użyty jako **kontekst slice’a S-04** (nie jako plik wejściowy — brak `stack-assessment.md` pod tą ścieżką).

## Dependency Health

### Lockfile

```
Status: present (pnpm-lock.yaml)
Package manager: pnpm@9.15.9
```

### Security Audit

```
Tool: pnpm audit --json
Summary: 0 CRITICAL, 0 HIGH, 1 MODERATE, 0 LOW
Direct vs transitive: transitive (via next → postcss)
```

#### MODERATE findings

- **postcss** 8.4.31 (transitive: `next@16.2.6`) — GHSA-qx2v-qp2m-jg93: XSS przy stringify CSS z nieescapowanym `</style>`. Fix: zależność Next musi podciągnąć postcss ≥8.5.10; śledź aktualizacje Next lub `pnpm overrides` po weryfikacji kompatybilności.

### Outdated Dependencies

```
Packages with major version gaps: 4
```

- **@prisma/client** / **prisma**: 6.19.3 → 7.8.0 (1 major — nie aktualizować bez planu migracji Prisma 7)
- **typescript**: 5.9.3 → 6.0.3 (1 major)
- **eslint**: 9.39.4 → 10.4.0 (1 major)
- **@types/node**: 20.19.41 → 25.9.1 (5 major — dev-only)

Pozostałe pakiety: tylko patch/minor (react, supabase-js, shadcn, lucide).

## Test Suite

```
Test runner: not detected
Tests found: 0 (*.test.* / *.spec.*)
Test execution: not attempted
```

⚠ Brak test runnera. Agent nie może automatycznie weryfikować regresji (np. `applyMarketBenchmarks`, rate limit, API).

**Recommended:** dodać Vitest + kilka testów jednostkowych dla `src/lib/plan-refinement/apply-market-benchmarks.ts` i `src/lib/rate-limit/plan-recalc.ts` (szybki zwrot z inwestycji po S-04/S-06).

```
pnpm add -D vitest
```

Następnie skrypt `"test": "vitest run"` w `package.json` i 2–3 pliki testów przy logice czystej (bez Prisma).

## CI/CD

```
Provider: GitHub Actions
Configuration: .github/workflows/ci.yml, .github/workflows/deploy.yml
```

| Stage      | Status | Notes                                      |
|------------|--------|--------------------------------------------|
| Lint       | ✓      | `pnpm lint` na PR                          |
| Test       | ✗      | brak kroku testów                          |
| Build      | ✓      | `pnpm build:ci` (bez migrate na PR)        |
| Type check | ✓      | w ramach `next build` / tsc                |
| Security   | ✗      | brak `pnpm audit` w CI                     |

Deploy: osobny workflow na `main` → Vercel (produkcja).

ℹ Brak skanowania zależności w CI — warto dodać `pnpm audit --audit-level=high` jako soft gate po ustaleniu polityki.

## Configuration

### High severity

- (brak — `tsconfig.json` ma `strict: true`, `.gitignore` obecny)

### Medium severity

- **Brak test runnera** — patrz sekcja Test Suite.
- **Brak Prettier / Biome** — formatowanie tylko przez ESLint; agent może generować niespójny styl. Fix: `pnpm dlx prettier --write` + config lub Biome (quick/moderate).

### Low severity

- **Brak `.editorconfig`** — drobna niespójność między edytorami.
- **`.env.example`** — obecny; zawiera DB i Supabase; po S-06 warto udokumentować `PLAN_RECALC_*` (już dodane w repo).

## Stack Assessment Cross-Reference

```
No stack-assessment.md found. Run /10x-stack-assess for quality-gate analysis.
```

## Feature focus: internet-refinement (S-04)

Stan implementacji w kodzie: **wdrożony** (`status: implemented` w change, migracja `20260527143000_market_benchmark`).

| Obszar | Stan | Uwaga |
|--------|------|--------|
| Model `MarketBenchmark` + flagi `PlanVersion` | ✓ | migracja w repo |
| `applyMarketBenchmarks` + hook w `persist-plan-version` | ✓ | jedna ścieżka create/recalc |
| Import `pnpm benchmarks:import` | ✓ | owner-operated, zgodnie z NFR |
| UI disclaimer | ✓ | `plan-cost-table.tsx` |
| Testy automatyczne S-04 | ✗ | brak — regresje tylko manualnie |
| Produkcja DB | ? | owner musi mieć `migrate deploy` na Vercel build |

**Ryzyko operacyjne (niskie):** `BENCHMARKS_JSON_URL` — fetch w skrypcie importu; używać tylko zaufanych URL (owner-only).

**Ryzyko produktowe (świadome MVP):** benchmarki to cache, nie live internet — zgodne z PRD/infrastructure; użytkownik musi rozumieć „orientacyjnie” (copy w UI).

## Recommended Fixes

### Fix before agent work (Category A)

### 1. Brak test runnera

**Impact:** Agent i CI nie wykryją regresji w kosztach, limicie przeliczeń ani refinement.
**Severity:** high
**Effort:** moderate (15–30 min) dla minimalnego Vitest + 2 pliki testów
**Fix:**

```bash
pnpm add -D vitest
```

Dodaj `"test": "vitest run"` i testy dla `src/lib/plan-refinement/apply-market-benchmarks.ts` (clamp, pusty benchmark, multiplier ≠ 1).

### 2. CI bez kroku test

**Impact:** PR mogą mergować zepsutą logikę domenową.
**Severity:** medium
**Effort:** quick (< 5 min) po dodaniu testów
**Fix:** W `.github/workflows/ci.yml` po Lint:

```yaml
- name: Test
  run: pnpm test
```

### 3. Transitive postcss (MODERATE)

**Impact:** Teoretyczny XSS przy embedowaniu user CSS w `<style>` — ten projekt nie robi tego dla user input CSS; ryzyko niskie dla obecnego UI.
**Severity:** low–medium
**Effort:** quick do monitorowania
**Fix:** Śledź release Next.js z postcss ≥8.5.10; opcjonalnie `pnpm why postcss`.

### 4. Dokumentacja env dla rate limit

**Impact:** Deploy bez jawnych limitów używa defaultów (3/24h) — OK, ale warto mieć w Vercel env przy zmianie polityki.
**Severity:** low
**Effort:** quick
**Fix:** Ustaw w Vercel (opcjonalnie) `PLAN_RECALC_LIMIT`, `PLAN_RECALC_WINDOW_HOURS` — już w `.env.example`.

### Addressed in upcoming lessons (Category B)

### Brak rozszerzonego observability

**Lesson:** Observability (parked w roadmapie)
**What you'll do there:** logi, error tracking, metryki produkcyjne — nie blokuje dalszej pracy agenta lokalnie.

### AGENTS.md już obecny

Projekt ma `AGENTS.md` + `CLAUDE.md` — onboarding agenta w dużej mierze zrobiony. Utrzymuj przy Post-MVP roadmap.

## Summary

**Health status: needs-attention**

Projekt jest **gotowy do dalszej pracy agenta** pod warunkiem świadomości braku testów: lockfile i TypeScript strict są w porządku, CI robi lint + build, audit bez CRITICAL/HIGH. Główna luka to **zero testów automatycznych** — szczególnie wrażliwe po slice’ach `internet-refinement` i `rate-limit-enforcement`, gdzie logika jest czysta i łatwa do pokrycia Vitestem.

Slice **internet-refinement** wygląda **spójnie w kodzie** (model, persist, import, UI); „surowość” produktu to raczej **Post-MVP polish** niż brak S-04.

**Next step:** (1) opcjonalnie `/10x-archive internet-refinement` i inne done change’y; (2) dodać minimalny Vitest; (3) `/10x-roadmap` lub shape na fazę Post-MVP (UX, zaufanie, nice-to-have z PRD).
