# Vitest Minimal Setup Implementation Plan

## Overview

Dodajemy minimalny stack testów jednostkowych (Vitest) dla logiki czystej w `src/lib/`, żeby agent i CI mogły wykrywać regresje w doprecyzowaniu benchmarków (S-04) i polityce limitu przeliczeń (S-06). Slice odblokowuje **S-10** (`mvp-polish-finish`) bez E2E, RTL ani pełnego coverage.

## Current State Analysis

- **Brak test runnera:** `package.json` nie ma skryptu `test`; zero plików `*.test.ts` / `*.spec.ts` (`context/foundation/health-check.md`).
- **CI:** `.github/workflows/ci.yml` — lint + `build:ci` tylko; brak kroku testów.
- **AGENTS.md:** historyczna reguła „do not invent a test stack” — wymaga aktualizacji po wdrożeniu F-07.
- **Cele testów (roadmap + impl-review S-04):**
  - `src/lib/plan-refinement/apply-market-benchmarks.ts` — clamp 0.85–1.25, pusty benchmark, mnożnik ≠ 1, `refinementApplied` gdy koszt się nie zmienia.
  - `src/lib/rate-limit/plan-recalc.ts` — `getPlanRecalcPolicy()` (env + defaulty); **`checkPlanRecalcLimit` poza scope** (Prisma tx — parked).

### Key Discoveries:

- `applyMarketBenchmarks` używa wyłącznie `stageSlug` → `category` z `StageWithModifiers` i mapy benchmarków — fixture może być minimalny, bez Prisma (`src/lib/plan-refinement/apply-market-benchmarks.ts:27-88`).
- `getPlanRecalcPolicy` jest synchroniczne i czyta `process.env` (`src/lib/rate-limit/plan-recalc.ts:20-28`) — testy z `vi.stubEnv`.
- `.env.example` już dokumentuje `PLAN_RECALC_*` (linie 20–22).

## Desired End State

1. `pnpm test` uruchamia Vitest w trybie CI (`vitest run`) i kończy się kodem 0 przy zielonym stanie.
2. ≥2 pliki testów obok modułów: `apply-market-benchmarks.test.ts`, `plan-recalc.test.ts` (tylko polityka env).
3. GitHub Actions na PR: lint → **test** → build:ci.
4. `change.md` status `planned` → po implementacji `implementing` / `implemented` przez `/10x-implement`.

### Weryfikacja końcowa:

```bash
pnpm test
pnpm lint
pnpm build:ci
```

## What We're NOT Doing

- E2E (Playwright), testy API Route Handlers, testy komponentów React.
- Mockowanie `checkPlanRecalcLimit` / integracji Prisma (osobny slice lub rozszerzenie F-07).
- Testy `investment-state.ts` w tym change (możliwe w S-10 lub osobnym PR).
- Progi coverage (`@vitest/coverage-v8`), `test:watch` w CI.
- Guard na `NaN` multiplier w `applyMarketBenchmarks` (znane ryzyko z impl-review F-02 — nie blokujemy F-07; opcjonalny test dokumentujący obecne zachowanie tylko jeśli implementer uzna za wartościowy, bez refactoru produkcji).

## Implementation Approach

Vitest w środowisku **node** (logika czysta, bez DOM). Osobny `vitest.config.ts` z aliasem `@/*` → `./src/*` (jak `tsconfig.json`). Pliki testów **colocated** (`*.test.ts` obok źródła). Zależność dev: `vitest` (wersja zgodna z Node 20 w CI).

## Phase 1: Vitest toolchain

### Overview

Zainstalować Vitest, skonfigurować alias ścieżek i skrypt `pnpm test`.

### Changes Required:

#### 1. Zależności i skrypty

**File**: `package.json`

**Intent**: Dodać devDependency `vitest` i skrypt uruchamiający testy jednorazowo (CI + agent).

**Contract**: `"test": "vitest run"` w `scripts`; opcjonalnie `"test:watch": "vitest"` tylko dla dev lokalnego (nie wymagane w Progress).

#### 2. Konfiguracja Vitest

**File**: `vitest.config.ts` (nowy)

**Intent**: Uruchamiać testy z `src/**/*.test.ts`, środowisko Node, resolve alias `@` → `./src`.

**Contract**: `defineConfig` z `test.environment: 'node'`, `test.include` ograniczone do `src/**/*.test.ts` (nie skanować `node_modules` / `.next`).

#### 3. Smoke test (opcjonalnie)

**Intent**: Można pominąć osobny smoke — pierwszy prawdziwy test w Phase 2 wystarczy. Po Phase 1 `pnpm test` może zwrócić „no tests” dopóki Phase 2 nie landuje; **kolejność implementacji: Phase 1 + 2 w jednej sesji** albo tymczasowy placeholder `expect(true).toBe(true)` usunięty w Phase 2.

### Success Criteria:

#### Automated Verification:

- `pnpm install` (lockfile zaktualizowany po `pnpm add -D vitest`)
- `vitest --version` dostępne przez `pnpm exec vitest --version`

#### Manual Verification:

- Brak konfliktu z `next build` / istniejącym `tsconfig.json`

**Implementation Note**: Po Phase 1+2 razem `pnpm test` musi przechodzić z realnymi testami.

---

## Phase 2: Unit tests — benchmarks i polityka rate limit

### Overview

Dodać testy jednostkowe zgodne z decyzjami planowania: `applyMarketBenchmarks` + `getPlanRecalcPolicy`.

### Changes Required:

#### 1. Testy `applyMarketBenchmarks`

**File**: `src/lib/plan-refinement/apply-market-benchmarks.test.ts` (nowy)

**Intent**: Zabezpieczyć regresje S-04: pass-through, clamp, zmiana kosztu, flaga `refinementApplied`.

**Contract**: Minimum **4** przypadki `it(...)`:

| Case | Wejście | Oczekiwane |
|------|---------|------------|
| Pusty `benchmarks` | `[]` | `results` identyczne z wejściem, `refinementApplied: false` |
| Mnożnik w zakresie | np. `multiplier: 1.1`, cost 1000 | `estimatedCost: 1100`, `refinementApplied: true`, metadata benchmarku ustawione |
| Clamp dolny/górny | `multiplier: 0.5` → koszt jak dla 0.85; `multiplier: 2.0` → jak dla 1.25 | zaokrąglone `Math.round` |
| Brak zmiany kosztu | mnożnik 1.0 lub brak dopasowania kategorii | `refinementApplied: false` (ścieżka `!anyCostChanged`) |

Fixture: 1–2 `PlanStageResultInput` + `StageWithModifiers` z `slug` i `category` (pozostałe pola Prisma — minimalne obiekty z `as StageWithModifiers` jeśli TypeScript wymaga).

#### 2. Testy `getPlanRecalcPolicy`

**File**: `src/lib/rate-limit/plan-recalc.test.ts` (nowy)

**Intent**: Zweryfikować parsowanie env i defaulty (3 / 24h) bez bazy.

**Contract**: Minimum **3** przypadki z `vi.stubEnv` / `beforeEach` reset env:

- Brak zmiennych → `{ limit: 3, windowHours: 24 }`
- `PLAN_RECALC_LIMIT=5`, `PLAN_RECALC_WINDOW_HOURS=12` → odpowiednie wartości
- Niepoprawne wartości (`abc`, `0`, `-1`) → fallback do defaultów

**Nie** importować ani testować `checkPlanRecalcLimit` w tym pliku.

### Success Criteria:

#### Automated Verification:

- `pnpm test` — wszystkie testy zielone
- `pnpm lint` — bez nowych błędów ESLint w plikach testów

#### Manual Verification:

- Przegląd nazw testów — czytelne po polsku lub angielsku (spójnie z repo; preferowany angielski w `describe`/`it` jak w kodzie źródłowym)

---

## Phase 3: CI i dokumentacja agenta

### Overview

Podpiąć testy do GitHub Actions i zaktualizować reguły repo, żeby agenci używali `pnpm test`.

### Changes Required:

#### 1. GitHub Actions

**File**: `.github/workflows/ci.yml`

**Intent**: PR nie merguje się z czerwoną logiką domenową.

**Contract**: Nowy step po `Lint`, przed `Build (no DB migrate)`:

```yaml
- name: Test
  run: pnpm test
```

#### 2. AGENTS.md

**File**: `AGENTS.md`

**Intent**: Usunąć sprzeczność „brak test runnera” — wskazać `pnpm test` dla logiki w `src/lib/`.

**Contract**: W sekcji Build/test: dodać `pnpm test` (Vitest, unit tests dla czystej logiki); zastąpić lub zawęzić zdanie „do not invent a test stack” do „nie dodawać E2E/Playwright bez prośby użytkownika”.

### Success Criteria:

#### Automated Verification:

- `pnpm lint`
- `pnpm test`
- `pnpm build:ci`

#### Manual Verification:

- (Opcjonalnie) push branch / PR — workflow CI pokazuje krok Test zielony

---

## Testing Strategy

### Unit Tests:

- Wyłącznie czyste funkcje; brak `DATABASE_URL`, brak Supabase.
- Env: izolacja przez `vi.stubEnv` w `plan-recalc.test.ts`.

### Integration Tests:

- Brak w F-07.

### Manual Testing Steps:

1. Lokalnie: `pnpm test` po każdej fazie z testami.
2. Potwierdzić, że CI na PR uruchamia test (owner / po push).

## Performance Considerations

Vitest na ~7–10 testów — sekundy; brak wpływu na `next build` poza dłuższym CI o kilka sekund.

## Migration Notes

Brak migracji DB. `pnpm install` wymagany po merge (nowa devDependency).

## References

- Roadmap F-07: `context/foundation/roadmap.md`
- Health-check rekomendacja: `context/foundation/health-check.md`
- Deferred tests S-04: `context/archive/2026-05-27-internet-refinement/reviews/impl-review.md` (F2)
- Rate limit policy: `context/archive/2026-05-28-rate-limit-enforcement/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Vitest toolchain

#### Automated

- [x] 1.1 `pnpm install` (lockfile po `vitest`)
- [x] 1.2 `pnpm exec vitest --version`

#### Manual

- [ ] 1.3 Brak konfliktu z istniejącym `tsconfig` / build

### Phase 2: Unit tests — benchmarks i polityka rate limit

#### Automated

- [ ] 2.1 `pnpm test` — wszystkie testy zielone
- [ ] 2.2 `pnpm lint` — bez nowych błędów w plikach testów

#### Manual

- [ ] 2.3 Nazwy i opisy testów są czytelne przy przeglądzie

### Phase 3: CI i dokumentacja agenta

#### Automated

- [ ] 3.1 `pnpm lint`
- [ ] 3.2 `pnpm test`
- [ ] 3.3 `pnpm build:ci`

#### Manual

- [ ] 3.4 (Opcjonalnie) PR — krok Test w GitHub Actions zielony
