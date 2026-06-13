---
title: "Plan refaktoru: Anti-Corruption Layer dla persystencji Prisma"
created: 2026-06-13
type: refactor-plan
git_commit: feec9185d8af94b9bb468c600a73059ee6248a19
related:
  - context/domain/01-domain-distillation.md
  - context/domain/02-invariant-aggregate-refactor.md
  - context/changes/refactor-opportunities/plan.md
  - context/foundation/lessons.md
  - context/foundation/tech-stack.md
selected_leak: "@prisma/client (ORM + typy modeli)"
---

# Plan refaktoru: Anti-Corruption Layer dla persystencji Prisma

## KROK 0 — Odkrycie kontekstu

### Dokumenty bazowe (przeczytane)

| Dokument | Deklaracja istotna dla wymienialności / granic |
|---|---|
| `context/foundation/tech-stack.md:24` | PostgreSQL + **Prisma ORM** jako schema source of truth; **domain reads/writes przez Prisma Client w Route Handlers** — nie ad-hoc Supabase table APIs |
| `context/foundation/lessons.md:5-9` | UI i Server Components wołają **tylko HTTP endpoints** dla danych domenowych; handler używa Prisma — **nigdy** Supabase JS dla tabel domenowych |
| `context/foundation/prd.md:86-93` | FR-006/008 — generacja kosztów i harmonogramu z danych ankiety |
| `context/changes/refactor-opportunities/plan.md:11-12` | C3: `investment-state.ts:1` importuje `@prisma/client`; C2: RSC powtarzają `prisma.plan.findFirst` |
| `context/domain/01-domain-distillation.md:163-170` | Rozjazd #2 (RSC → Prisma) i #9 (triple `InvestmentState`) |
| `README.md:1-7` | Brak deklaracji architektury — szablon create-next-app |

**Wniosek:** dokumenty **nie** deklarują wymienności ORM w sensie plug-in, ale **deklarują twardą granicę**: Prisma to infrastruktura persystencji za API; silnik generacji ma pozostać **pure**; UI nie powinno znać kształtu wierszy Postgres. Kod łamie tę intencję przez re-eksport typów ORM i bezpośrednie `prisma` w RSC.

### Stack i zależności zewnętrzne

| Warstwa | Technologia | Rola |
|---|---|---|
| Runtime / UI | Next.js 16, React 19 | App Router, RSC, Route Handlers |
| Auth | `@supabase/ssr`, `@supabase/supabase-js` | Sesja użytkownika (celowo poza Prisma) |
| Persystencja | `@prisma/client`, PostgreSQL (Supabase host) | Schema w `prisma/schema.prisma`, singleton `src/lib/prisma.ts` |
| Walidacja wire | `zod` | Formularze + body API |
| Integracja | `googleapis` | Eksport kalendarza Google |
| Testy | Vitest, Playwright | Unit + E2E |

Manifest: `package.json` — `@prisma/client` ^6.19.0, `@supabase/ssr`, `googleapis`, `zod`.

### Warstwy kodu (mapa)

```
src/app/(marketing)/          — landing (auth read only)
src/app/(auth)/               — Server Actions (auth + rejestracja przez prisma)
src/app/(app)/                — RSC panelu (auth Supabase + ❌ prisma domenowe)
src/app/api/                  — Route Handlers (auth + prisma)
src/components/               — UI (❌ typy QuestionDefinition z ORM)
src/lib/plan-generation/      — silnik pure (typy ❌ przez proxy ORM)
src/lib/plan/                 — orkiestracja zapisu (❌ Prisma.TransactionClient)
src/lib/types/domain.ts       — ❌ re-eksport @prisma/client
src/lib/investment-state.ts   — ❌ enum z @prisma/client
src/lib/google-calendar/      — integracja (googleapis + prisma)
src/lib/supabase/             — auth boundary (zamierzona)
prisma/                       — schema + seed (source of truth DB)
```

Reguła `plan-generation-stays-pure` w `.dependency-cruiser.js:21-31` zabrania importu `@prisma/client` **bezpośrednio** z `plan-generation/`, ale typy ORM wchodzą przez `@/lib/types/domain` — obejście reguły.

---

## KROK 1 — Identyfikacja przeciekających zależności

### Oś A: `@prisma/client` (typy ORM + `Prisma.TransactionClient`)

**Import bezpośredni `@prisma/client`:**

| Plik | Linia |
|---|---|
| `src/lib/types/domain.ts` | `1-6`, `8-16` |
| `src/lib/prisma.ts` | `1` |
| `src/lib/investment-state.ts` | `1` |
| `src/lib/plan/persist-plan-version.ts` | `1` |
| `src/lib/plan/upsert-plan-stage-note.ts` | `1` |
| `src/lib/rate-limit/plan-recalc.ts` | `1` |
| `src/lib/plan-generation/test-fixtures/minimal-stages.ts` | `1` |
| `src/lib/plan-generation/test-fixtures/full-stages-calibration.ts` | `1` |
| `src/lib/plan/persist-plan-version.test.ts` | `1` |
| `src/lib/api/plans-route-handlers.test.ts` | `1` |
| `src/lib/api/stage-notes-route-handlers.test.ts` | `1` |

**Import pośredni przez `@/lib/types/domain` (kształt modeli Prisma w silniku i UI):**

| Plik | Linia |
|---|---|
| `src/lib/plan-generation/types.ts` | `2-4` |
| `src/lib/plan-generation/compute-costs.ts` | `2` |
| `src/lib/plan-generation/compute-costs.test.ts` | `4` |
| `src/lib/plan-generation/test-fixtures/full-stages-calibration.ts` | `3` |
| `src/components/questionnaire/questionnaire-form.tsx` | `12` |
| `src/components/questionnaire/step-content.tsx` | `10` |
| `src/components/questionnaire/question-renderers.tsx` | `6` |
| `src/components/questionnaire/questionnaire-summary.tsx` | `6` |

**Singleton `prisma` (`@/lib/prisma`) — ten sam pakiet runtime w wielu warstwach:**

| Plik | Linia |
|---|---|
| `src/app/(app)/layout.tsx` | `2` |
| `src/app/(app)/dashboard/page.tsx` | `20` |
| `src/app/(app)/questionnaire/page.tsx` | `9` |
| `src/app/(auth)/actions.ts` | `9` |
| `src/app/api/plans/route.ts` | `5` |
| `src/app/api/plans/[planId]/recalculate/route.ts` | `5` |
| `src/app/api/plans/[planId]/results/route.ts` | `6` |
| `src/app/api/plans/[planId]/stage-notes/route.ts` | `9` |
| `src/app/api/health/db/route.ts` | `4` |
| `src/lib/plan/get-active-stage-slugs.ts` | `1` |
| `src/lib/plan/load-plan-stage-notes.ts` | `2` |
| `src/lib/google-calendar/export-stages-to-calendar.ts` | `2` |
| `src/lib/google-calendar/google-oauth.ts` | `10` |

### Oś B: `InvestmentState` — trzy powierzchnie tego samego enumu

| Powierzchnia | Plik | Linia |
|---|---|---|
| Schema DB | `prisma/schema.prisma` | `22-28` |
| ORM enum | `src/lib/types/domain.ts` | `2` |
| ORM w logice kolejności | `src/lib/investment-state.ts` | `1`, `3-8` |
| Zod infer | `src/lib/validations/questionnaire.ts` | `9-17` |
| Silnik (Zod) | `src/lib/plan-generation/stage-filter.ts` | `1`, `20-21` |
| Fixtures (ORM) | `src/lib/plan-generation/test-fixtures/minimal-stages.ts` | `1`, `20` |
| Fixtures (ORM) | `src/lib/plan-generation/test-fixtures/full-stages-calibration.ts` | `1`, `14` |

### Oś C: `@supabase/ssr` + `@supabase/supabase-js`

| Plik | Linia | Uwaga |
|---|---|---|
| `src/lib/supabase/server.ts` | `1` | Zamierzony adapter auth |
| `src/lib/supabase/client.ts` | `1` | Browser auth |
| `src/lib/supabase/middleware.ts` | `1` | Middleware |
| `src/app/(auth)/actions.ts` | `6`, `11` | Auth + admin client przy rejestracji |
| RSC + API (15 plików) | `createClient` z `@/lib/supabase/server` | Wzorzec auth — **nie** domena tabel |

Supabase **nie** przecieka do silnika `plan-generation/`; granica auth jest świadoma (`tech-stack.md:24`).

### Oś D: `googleapis`

| Plik | Linia |
|---|---|
| `src/lib/google-calendar/google-oauth.ts` | `1` |

Wołania modułu (bez importu `googleapis`): `src/app/(app)/plan/[planId]/page.tsx:14`, `src/app/api/integrations/google/*/route.ts`, `src/lib/google-calendar/export-stages-to-calendar.ts`. Przeciek **ograniczony** do katalogu `google-calendar/` + jedno RSC wołające `isGoogleCalendarConnected` — adapter już częściowo istnieje, brak typów Google w UI.

### Oś E: `zod` (walidacja wire)

Importy w `src/lib/validations/*`, Route Handlers, formularze auth i ankiety. **Zamierzone** na granicy HTTP/form — nie deklaracja wymienności biblioteki; typ `QuestionnaireInputs` z Zod wchodzi do `persist-plan-version.ts:8` jako kontrakt wejścia (akceptowalne na granicy aplikacji, poza zakresem tego ACL).

---

## KROK 2 — Klasyfikacja i wybór #1

| Oś | `@prisma/client` | `InvestmentState` (triple) | Supabase auth | `googleapis` |
|---|---|---|---|---|
| **(a) Warstwy / pliki** | **24 prod** (11 direct + 8 proxy + 13 singleton) + testy | Podzbiór osi A; 7 plików | ~18 plików, **tylko auth** | ~6 plików, jeden import SDK |
| **(b) Koszt wymiany dziś** | **Bardzo wysoki** — schema, seed, wszystkie handlery, RSC, silnik typowany ORM | Średni — wymaga synchronizacji 3 powierzchni | Niski — produkt zakotwiczony w Supabase Auth | Niski — nice-to-have FR |
| **(c) Intencja dokumentów** | **Silny rozjazd** — lessons: API-only; depcruise: pure engine; tech-stack: Prisma za handlerem | **Rozjazd #9** w `01-domain-distillation.md:170`; C3 w refactor-opportunities | Zgodność — auth Server Actions | Brak deklaracji wymienności |

### Wybór #1: **`@prisma/client` (typy modeli + klient persystencji)**

**Uzasadnienie:** To jedyna zależność, która jednocześnie (1) dotyka **silnika pure**, **UI**, **RSC**, **API** i **lib/plan**, (2) ma **najwyższy koszt** ewentualnej migracji ORM/hosta DB, bo kształt wierszy jest kontraktem kompilacji w całym grafie, (3) **łamie** explicite `lessons.md:5-9` (RSC → prisma) i **obejście** `plan-generation-stays-pure` przez `types/domain.ts`. Triple `InvestmentState` jest **objawem** tego samego przecieku, nie osobnym root cause — rozwiązuje się w ramach ACL katalogu domenowego (faza ACL-3). Supabase i googleapis mają węższe, zamierzone granice.

---

## KROK 3 — Diagnoza

### 3.1 Proxy leak: `types/domain.ts` jako most ORM → domena → UI

```1:16:src/lib/types/domain.ts
export {
  InvestmentState,
  BuildStandard,
  InsulationLevel,
  QuestionType,
} from "@prisma/client";

export type {
  QuestionDefinition,
  ConstructionStage,
  StageCostModifier,
  Plan,
  PlanVersion,
  QuestionnaireResponse,
  PlanStageResult,
} from "@prisma/client";
```

Silnik **nie** importuje `@prisma/client`, ale importuje **identyczne** typy wygenerowane przez Prisma:

```1:10:src/lib/plan-generation/types.ts
import type {
  ConstructionStage,
  StageCostModifier,
} from "@/lib/types/domain";

export type StageWithModifiers = ConstructionStage & {
  costModifiers: StageCostModifier[];
};
```

UI renderuje ankietę na typie **`QuestionDefinition`** (= model Prisma):

```12:12:src/components/questionnaire/questionnaire-form.tsx
import type { QuestionDefinition } from "@/lib/types/domain";
```

**Skutek:** zmiana kolumny w `prisma/schema.prisma` (np. `QuestionDefinition.options Json?`) wymusza rekompilację komponentów React i silnika kosztów — brak stabilnego kontraktu domenowego.

### 3.2 RSC omija granicę API (lessons vs kod)

Deklaracja:

```5:9:context/foundation/lessons.md
## Route non-auth Supabase access through Next.js API routes
...
- **Rule**: For every non-auth data operation, expose a Next.js Route Handler under `src/app/api/`; the handler uses **Prisma Client** ... UI and Server Components call only those HTTP endpoints
```

Kod questionnaire ładuje plan i pytania **bezpośrednio**:

```28:47:src/app/(app)/questionnaire/page.tsx
  const plan = await prisma.plan.findFirst({
    where: { userId: user.id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { responses: true },
      },
    },
  });
  ...
  const questions = await prisma.questionDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });
```

Ten sam wzorzec: `src/app/(app)/layout.tsx:17-21`, `src/app/(app)/dashboard/page.tsx:39-43`.

### 3.3 Triple `InvestmentState` — zduplikowana wiedza o enumie

```1:8:src/lib/investment-state.ts
import type { InvestmentState } from "@prisma/client";

export const investmentStateOrder: Record<InvestmentState, number> = {
  FROM_SCRATCH: 0,
  ...
```

Silnik bierze typ z Zod, logika kolejności z ORM:

```1:2:src/lib/plan-generation/stage-filter.ts
import type { InvestmentState } from "@/lib/validations/questionnaire";
import { getInvestmentStateOrder } from "@/lib/investment-state";
```

Fixtures testowe importują **runtime enum** Prisma (`minimal-stages.ts:1`), podczas gdy produkcja filtruje przez stringi Zod — ryzyko rozjazdu przy zmianie seed/schema.

### 3.4 `Prisma.TransactionClient` w kontraktach lib (nie tylko adapter)

```1:1:src/lib/plan/persist-plan-version.ts
import type { Prisma } from "@prisma/client";
```

Orkiestracja zapisu i rate-limit znają typ transakcji ORM — wymiana biblioteki wymaga dotknięcia logiki domenowej zapisu, nie tylko warstwy IO.

### 3.5 Brak bundla klienta — ale coupling kompilacji

`@prisma/client` nie trafia do Client Components (importy typ-only / RSC server-only). **Groźniejszy** jest coupling **typów** i **zapytań** rozproszonych poza adapter — nie tree-shaking w przeglądarce, lecz niemożność wymiany persystencji bez refaktoru UI i silnika.

---

## KROK 4 — Projekt ACL

### 4.1 Lokalizacja

```
src/lib/domain/                    — value objects, encje read-model, porty (zero @prisma/client)
src/lib/infrastructure/prisma/     — JEDYNE miejsce importu @prisma/client + mapowanie
```

`src/lib/types/domain.ts` — **deprecated**, zastąpiony eksportami z `src/lib/domain/` (bez re-eksportu Prisma).

### 4.2 Value objects / encje domenowe (jedyne miejsce wiedzy o kształcie)

#### `DomainInvestmentState` (enum domenowy)

```typescript
// src/lib/domain/investment-state.ts
export const DOMAIN_INVESTMENT_STATES = [
  "FROM_SCRATCH", "FOUNDATIONS", "OPEN_SHELL", "CLOSED_SHELL", "DEVELOPER",
] as const;
export type DomainInvestmentState = (typeof DOMAIN_INVESTMENT_STATES)[number];

export function parseDomainInvestmentState(raw: string): DomainInvestmentState | null;
export function investmentStateOrder(state: DomainInvestmentState): number;
export function compareInvestmentState(a: DomainInvestmentState, b: DomainInvestmentState): number;
```

**Decyzja zakodowana w ACL:** kolejność enumu = semantyka biznesowa (`schema.prisma:21-22` komentarz); wartości **muszą** być identyczne z `investmentStateSchema` w `validations/questionnaire.ts:9-17` — ACL importuje const array **raz** (single source), Zod schema buduje się z tego samego array (refactor-opportunities C3).

#### `StageCostRule` (zamiast `StageCostModifier` Prisma)

Pola używane przez silnik (`compute-costs.ts:22-70`):

```typescript
// src/lib/domain/catalog/stage-cost-rule.ts
export type StageCostRule = {
  triggerQuestionSlug: string;
  triggerValue: string;
  costAdjustmentPerM2: number;
  fixedCostAdjustment: number;
  description: string | null;
};
```

#### `CatalogStage` (zamiast `ConstructionStage` + nested modifiers)

```typescript
// src/lib/domain/catalog/catalog-stage.ts
export type CatalogStage = {
  slug: string;
  name: string;
  category: string;
  sortOrder: number;
  completedByState: DomainInvestmentState | null;
  predecessorSlugs: readonly string[];
  costPerM2Economy: number;
  costPerM2Standard: number;
  costPerM2Premium: number;
  durationMinDays: number;
  durationMaxDays: number;
  costRules: readonly StageCostRule[];
};

// Mapowanie ORM → domena (TYLKO w adapterze)
function toCatalogStage(row: PrismaConstructionStageRow): CatalogStage { /* pseudokod */ }
function toPrismaStageCreateInput(stage: CatalogStage): Prisma.ConstructionStageCreateInput { /* seed only */ }
```

#### `QuestionSpec` (zamiast `QuestionDefinition` w UI)

Pola używane przez UI (`question-renderers.tsx`, `step-content.tsx`):

```typescript
// src/lib/domain/questionnaire/question-spec.ts
export type QuestionOption = { value: string; label: string };
export type QuestionSpec = {
  slug: string;
  label: string;
  type: "TEXT" | "NUMBER" | "SELECT" | "MULTI_SELECT" | "DATE"; // mapowane z QuestionType ORM
  required: boolean;
  sortOrder: number;
  options: QuestionOption[] | null;
  validation: Record<string, unknown> | null;
  unit: string | null;
};

function toQuestionSpec(row: PrismaQuestionDefinitionRow): QuestionSpec;
```

**Decyzja w ACL:** parsowanie `options Json?` — jeśli JSON nie pasuje do `QuestionOption[]`, adapter rzuca `CatalogMappingError` (log server-side), nie propaguje surowego `JsonValue` do UI.

#### Read-model planu (RSC / API, nie encja zapisu)

```typescript
// src/lib/domain/plan/plan-summary.ts
export type PlanNavSummary = { planId: string };
export type PlanDashboardSummary = { planId: string; createdAt: Date };
export type QuestionnaireDraft = {
  planId: string;
  initialResponses: Record<string, string>;
};
```

### 4.3 Porty (wąskie interfejsy domenowe)

```typescript
// src/lib/domain/ports/construction-catalog-port.ts
export interface ConstructionCatalogPort {
  loadStagesWithRules(): Promise<readonly CatalogStage[]>;
}

// src/lib/domain/ports/question-catalog-port.ts
export interface QuestionCatalogPort {
  loadQuestionsOrdered(): Promise<readonly QuestionSpec[]>;
}

// src/lib/domain/ports/plan-read-port.ts
export type PlanReadVariant = "nav" | "dashboard" | "questionnaire";
export interface PlanReadPort {
  loadPlanForUser(userId: string, variant: PlanReadVariant): Promise<
    PlanNavSummary | PlanDashboardSummary | QuestionnaireDraft | null
  >;
}

// src/lib/domain/ports/plan-persistence-port.ts
export interface PlanUnitOfWork {
  savePlanVersion(input: SavePlanVersionCommand): Promise<SavePlanVersionResult>;
  upsertStageNote(input: UpsertStageNoteCommand): Promise<void>;
  countRecalculationsSince(userId: string, since: Date): Promise<number>;
}

export interface PlanPersistencePort {
  runInTransaction<T>(fn: (uow: PlanUnitOfWork) => Promise<T>): Promise<T>;
}
```

Reszta kodu (`plan-generation/`, `components/`, Route Handlers) zna **tylko** te porty i typy z `src/lib/domain/`.

### 4.4 Adaptery Prisma (implementacja portów)

```typescript
// src/lib/infrastructure/prisma/prisma-client.ts — przeniesiony singleton z src/lib/prisma.ts

// src/lib/infrastructure/prisma/mappers/catalog-stage-mapper.ts
export function mapConstructionStage(row: /* Prisma payload */): CatalogStage { /* ... */ }

// src/lib/infrastructure/prisma/adapters/prisma-construction-catalog.adapter.ts
export class PrismaConstructionCatalogAdapter implements ConstructionCatalogPort {
  constructor(private readonly db: PrismaClient) {}
  async loadStagesWithRules(): Promise<readonly CatalogStage[]> {
    const rows = await this.db.constructionStage.findMany({
      include: { costModifiers: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(mapConstructionStage);
  }
}

// src/lib/infrastructure/prisma/adapters/prisma-plan-read.adapter.ts
export class PrismaPlanReadAdapter implements PlanReadPort { /* findFirst + map to PlanNavSummary | ... */ }

// src/lib/infrastructure/prisma/adapters/prisma-plan-persistence.adapter.ts
export class PrismaPlanPersistenceAdapter implements PlanPersistencePort {
  async runInTransaction<T>(fn: (uow: PlanUnitOfWork) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => fn(new PrismaPlanUnitOfWork(tx)));
  }
}
```

**Fabryka wiązania** (composition root — Route Handlers, ewentualnie `src/lib/infrastructure/composition.ts`):

```typescript
export function createConstructionCatalogPort(): ConstructionCatalogPort {
  return new PrismaConstructionCatalogAdapter(getPrismaClient());
}
```

---

## KROK 5 — Dowód izolacji + before/after

### 5.1 Wymiana biblioteki persystencji — dotknięte pliki

| Po refaktorze zmienia się | Nie zmienia się |
|---|---|
| `src/lib/infrastructure/prisma/**` | `src/lib/plan-generation/**` (typy `CatalogStage`, `StageCostRule`) |
| `prisma/schema.prisma` (jeśli nowy ORM wymaga innego mappingu) | `src/components/questionnaire/**` (typ `QuestionSpec`) |
| Composition root / fabryka adapterów | `src/app/api/**` (woła porty, nie Prisma) |
| Testy adapterów + mapperów | Kontrakt Zod ankiety (`validations/questionnaire.ts`) |

### 5.2 Before / after — wybrane miejsca

| Miejsce | Before | After |
|---|---|---|
| Silnik typów | `plan-generation/types.ts:2-4` → `@/lib/types/domain` (Prisma) | `import type { CatalogStage, StageCostRule } from "@/lib/domain/catalog"` |
| Koszty | `compute-costs.ts:2` → `StageCostModifier` ORM | `StageCostRule` domenowy |
| UI ankieta | `questionnaire-form.tsx:12` → `QuestionDefinition` | `QuestionSpec` |
| RSC questionnaire | `questionnaire/page.tsx:28-47` → `prisma.*` | `questionCatalog.loadQuestionsOrdered()` + `planRead.loadPlanForUser(user.id, "questionnaire")` przez port (implementacja nadal może być lokalna w RSC **bez** importu `@prisma/client`) |
| Zapis wersji | `persist-plan-version.ts:1` → `Prisma.TransactionClient` | `PlanUnitOfWork` z `plan-persistence-port.ts` |
| Investment state | `investment-state.ts:1` → `@prisma/client` | `DomainInvestmentState` z `domain/investment-state.ts` |

### 5.3 UI dostaje dane domenowe

**Before:** `questions: QuestionDefinition[]` — identyczne z wierszem tabeli `QuestionDefinition` (`schema.prisma:54-64`).

**After:** `questions: QuestionSpec[]` — options już sparsowane do `QuestionOption[]`; UI nie wie o `Json?`, `cuid()`, ani `@prisma/client`.

### 5.4 Pytania otwarte — rozstrzygnięcia w ACL

| Pytanie | Rozstrzygnięcie | Gdzie zakodować |
|---|---|---|
| Czy RSC nadal może wołać Prisma, skoro tech-stack mówi „Prisma w handlerach”? | **Docelowo nie** dla danych domenowych — RSC woła **port** (implementacja Prisma w infra); pełne HTTP opcjonalne (C2 refactor-opportunities) — oba bez importu ORM w `src/app/(app)/` | `PlanReadPort` + ewentualnie C2 loader |
| Kanoniczny `InvestmentState` — Prisma czy Zod? | **Domena** (`DOMAIN_INVESTMENT_STATES`); Zod i mapper Prisma **derivują** z tego samego const | `domain/investment-state.ts` + aktualizacja `questionnaire.ts` |
| Czy `Plan`, `PlanVersion` typy w API? | Read/write przez **command/result DTO** domenowe lub istniejący `PlanResultsDto` (C1) — **nie** re-eksport modeli Prisma | `assemble-plan-results-dto.ts` (C1), port persistence |
| `Json?` w `QuestionDefinition.options` | Adapter waliduje kształt przy mapowaniu; UI nigdy nie widzi `Json` | `toQuestionSpec` w mapperze |

---

## KROK 6 — Weryfikacja i plan faz

### 6.1 Kryterium sukcesu (grep)

Po zakończeniu wszystkich faz:

```bash
rg '@prisma/client' src/ --glob '!**/infrastructure/prisma/**'
# oczekiwany wynik: brak trafień (poza ewentualnym re-exportem w testach infrastruktury)

rg 'from "@/lib/prisma"' src/ --glob '!**/infrastructure/prisma/**'
# oczekiwany wynik: brak trafień

rg 'from "@/lib/types/domain"' src/
# oczekiwany wynik: brak trafień (plik usunięty lub pusty re-export z domain/)
```

Rozszerzenie `.dependency-cruiser.js`: reguła `no-prisma-outside-infrastructure` — `from: ^src`, `to: @prisma/client`, z wyjątkiem `src/lib/infrastructure/prisma`.

### 6.2 Pliki znające zależność dziś vs po refaktorze

| Plik | Zna `@prisma/client` dziś | Po ACL |
|---|---|---|
| `src/lib/types/domain.ts` | tak | **usunięty / zastąpiony** |
| `src/lib/prisma.ts` | tak | **przeniesiony** → `infrastructure/prisma/` |
| `src/lib/investment-state.ts` | tak | **nie** — `domain/investment-state.ts` |
| `src/lib/plan/persist-plan-version.ts` | tak (typ tx) | **nie** — `PlanUnitOfWork` |
| `src/lib/plan/upsert-plan-stage-note.ts` | tak | **nie** |
| `src/lib/rate-limit/plan-recalc.ts` | tak | **nie** |
| `src/lib/plan-generation/compute-costs.ts` | tak (proxy) | **nie** |
| `src/lib/plan-generation/types.ts` | tak (proxy) | **nie** |
| `src/components/questionnaire/*.tsx` (4 pliki) | tak (proxy) | **nie** |
| `src/app/(app)/*.tsx` (3 RSC) | tak (singleton) | **nie** |
| `src/app/api/**` (6 route) | tak | **nie** — porty |
| `src/lib/google-calendar/*` | tak (singleton) | **nie** — `PlanReadPort` / dedykowany port integracji |
| `src/app/(auth)/actions.ts` | tak | **nie** — port użytkownika |
| Test fixtures `minimal-stages`, `full-stages-calibration` | tak | **nie** — `DomainInvestmentState` |
| `src/lib/infrastructure/prisma/**` | — | **tak (jedyne)** |

### 6.3 Plan faz (zgodny z konwencją projektu)

Fazy inkrementalne; po każdej: `pnpm lint`, `pnpm test`, `pnpm build:ci`. **Nie** uruchamiać `pnpm db:migrate` (brak zmian schema). Nakładają się z `refactor-opportunities` — numery ACL można wpleść w istniejący plan.

| Faza | Zakres | Powiązanie | Weryfikacja |
|---|---|---|---|
| **ACL-0** | Utworzyć `src/lib/domain/`, `src/lib/infrastructure/prisma/`; przenieść singleton; dodać regułę depcruise | — | Build green; stary `@/lib/prisma` re-exportuje z infra (compat shim) |
| **ACL-1** | `CatalogStage`, `StageCostRule`, `ConstructionCatalogPort`, adapter + mapper; podmiana importów w `plan-generation/` | C4 prerequisite | `compute-costs.test.ts` green; brak `@/lib/types/domain` w `plan-generation/` |
| **ACL-2** | `QuestionSpec`, `QuestionCatalogPort`, adapter; UI questionnaire na `QuestionSpec` | — | RSC questionnaire nadal ładuje przez port; 4 komponenty bez Prisma types |
| **ACL-3** | `DomainInvestmentState`; przepięcie `investment-state.ts`, fixtures, Zod schema z jednego const | **= refactor-opportunities C3** | `stage-filter.test.ts`, parity enum |
| **ACL-4** | `PlanPersistencePort` + `PlanUnitOfWork`; `persist-plan-version`, `upsert-plan-stage-note`, `plan-recalc` | Wspiera **INV-GEN-01** (`02-invariant-aggregate-refactor.md`) | `persist-plan-version.test.ts` mockuje port, nie `Prisma` |
| **ACL-5** | `PlanReadPort`; RSC `layout`, `dashboard`, `questionnaire` | **= refactor-opportunities C2** | Te same testy E2E risk-04; grep bez `@/lib/prisma` w `(app)/` |
| **ACL-6** | Usunąć `types/domain.ts`; przepiąć google-calendar i auth actions na porty; usunąć compat shim | C1 assembler niezależny | grep sukcesu (§6.1) |
| **ACL-7 (opcjonalnie)** | Testy kontraktu mapperów (round-trip sample rows); `depcruise` w CI | follow-up z refactor-opportunities | CI reguła `no-prisma-outside-infrastructure` |

**Kolejność względem innych planów domenowych:** ACL-1 + ACL-3 **przed** pełnym refaktorem agregatu INV-GEN-01 (silnik i enum muszą być odcięte od ORM); ACL-4 **równolegle lub tuż przed** fazą 0–2 z `02-invariant-aggregate-refactor.md`; C1 (DTO assembler) **niezależny**, ale korzysta z mapperów read-model z ACL-5/6 zamiast inline typów Prisma w route.

**Owner-only:** brak migracji schema; ewentualny re-seed (C4) pozostaje bez zmian wartości enum.

---

## Podsumowanie

Przeciek **#1** to `@prisma/client`: typy modeli wchodzą do silnika pure i UI przez `types/domain.ts`, a singleton `prisma` jest rozproszony po RSC, API i bibliotekach — w sprzeczności z `lessons.md:5-9` i regułą `plan-generation-stays-pure`. ACL koncentruje wiedzę o kształcie persistence w **`src/lib/domain/`** (value objects + porty) oraz **`src/lib/infrastructure/prisma/`** (mappery i adaptery). Silnik operuje na `CatalogStage` / `StageCostRule`, UI na `QuestionSpec`, zapis na `PlanUnitOfWork` — bez importu ORM. Triple `InvestmentState` i proxy typów katalogu są objawami tego samego problemu; faza ACL-3 i ACL-1 je zamykają. Kryterium sukcesu: `rg '@prisma/client' src/` zwraca wyłącznie pliki pod `infrastructure/prisma/`. Plan faz ACL-0…6 nakłada się na refactor-opportunities C2–C4 i przygotowuje grunt pod refaktor agregatu INV-GEN-01 bez dotykania schema DB.
