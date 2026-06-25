---
title: "Plan refaktoru: agregat strażnik niezmiennika generacji planu"
created: 2026-06-13
type: refactor-plan
git_commit: feec9185d8af94b9bb468c600a73059ee6248a19
related:
  - context/domain/01-domain-distillation.md
  - context/foundation/prd.md
  - context/changes/refactor-opportunities/plan.md
selected_invariant: INV-GEN-01
---

# Plan refaktoru: agregat strażnik niezmiennika generacji planu

## KROK 0 — Kontekst

### Dokumenty wymagań (przeczytane)

| Dokument | Sekcje istotne dla niezmienników |
|---|---|
| `context/foundation/prd.md` | Vision (`:18-24`), Success Criteria Primary (`:42-44`), US-01 AC (`:61-65`), FR-006/008 (`:86-93`), Business Logic (`:109-115`), Non-Goals orientacyjność (`:126-127`) |
| `context/foundation/tech-stack.md` | Granica Auth vs dane domenowe (`:24`) |
| `context/foundation/lessons.md` | API routes dla domeny; split schematu ankiety (`:47-57`) |
| `context/foundation/roadmap.md` | North star kalibracji — wiarygodność liczb (`:26-28`) |
| `context/domain/01-domain-distillation.md` | Mapa terminów i wstępna lista niezmienników |
| `README.md` | **Brak** narracji produktowej — szablon create-next-app (`README.md:1-7`) |

### Stack i warstwy logiki biznesowej

| Warstwa | Ścieżka | Rola względem generacji |
|---|---|---|
| **Persystencja** | `prisma/schema.prisma` | `Plan`, `PlanVersion`, `QuestionnaireResponse`, `PlanStageResult` |
| **Silnik (pure)** | `src/lib/plan-generation/` | `filterStages` → `scheduleTimeline` → `computeStageCost` |
| **Refinement** | `src/lib/plan-refinement/apply-market-benchmarks.ts` | Mnożniki po silniku |
| **Orkiestracja zapisu** | `src/lib/plan/persist-plan-version.ts` | Tx: wersja + odpowiedzi + generacja + wyniki |
| **Walidacja wejścia** | `src/lib/validations/questionnaire.ts` | Zod przed API |
| **API write** | `src/app/api/plans/route.ts`, `recalculate/route.ts` | HTTP + auth |
| **API read** | `results/route.ts` | Odrzuca pusty wynik **po fakcie** |
| **UI** | `questionnaire-form.tsx`, `plan/[planId]/page.tsx` | Submit → redirect; read → komunikat błędu |

---

## KROK 1 — Zidentyfikowane niezmienniki biznesowe

| ID | Reguła (MUSI być prawdziwa) | Źródło |
|---|---|---|
| **INV-GEN-01** | **Udane zakończenie generacji/planowania** (commit wersji planu) **musi** produkować co najmniej jeden `PlanStageResult` nadający się do wyświetlenia kosztorysu i timeline — inaczej operacja **nie jest** sukcesem produktowym | `prd.md:43-44` („otrzymuje orientacyjny kosztorys etapów budowy **oraz timeline**”); US-01 AC `prd.md:63` („generuje kosztorys i timeline i **prezentuje** je”); FR-006, FR-008 |
| **INV-FREEZE-01** | Koszty i timing odczytu są **zamrożone** w `PlanStageResult`; read path **nie** przelicza silnika | `cost-calibration/research.md` (freeze-on-write); `results/route.ts` bez `plan-generation` |
| **INV-STATE-01** | `starting_state` jest **wcześniejszy** niż `investment_state` (strict `<`) | `lessons.md:54`; logika stanów `prd.md:113` |
| **INV-FILTER-01** | Etap trafia do harmonogramu tylko gdy jego `completedByState` mieści się między stanem startowym a docelowym | **INFERENCE** z `stage-filter.ts:48-65`; wejście PRD `prd.md:113` |
| **INV-VER-01** | Każde generacja/przeliczenie tworzy **nową** `PlanVersion` z rosnącym `versionNumber` | US-01 `prd.md:59-65`; `schema.prisma:167` |
| **INV-ATOM-01** | Odpowiedzi ankiety i wyniki etapów dla danej wersji są zapisywane **w jednej transakcji** | **INFERENCE** z `persist-plan-version.ts` wywoływanego w `$transaction` (`route.ts:32`, `recalculate/route.ts:48`) |
| **INV-OWN-01** | Tylko właściciel planu (`plan.userId`) może czytać/mutować wyniki i przeliczać | `prd.md:119-121`; `results/route.ts:42` |
| **INV-1PLAN-01** | Pierwszy POST tworzy plan tylko gdy użytkownik nie ma jeszcze planu (409 w przeciwnym razie) | **INFERENCE** z flow; `route.ts:39-64` |
| **INV-ORIENT-01** | Prezentowane kwoty mają charakter **orientacyjny**, nie wiążący | `prd.md:126-127`; `orientational.ts:16-17` |
| **INV-NOTE-01** | Notatki etapów są per **plan** + `stageSlug`, nie per wersja | `timeline-notes/plan.md:5`; `schema.prisma:195-207` |
| **INV-NOTE-02** | Notatka może być zapisana tylko dla `stageSlug` obecnego w bieżącym harmonogramie | `timeline-notes/plan.md:28-29`; `upsert-plan-stage-note.ts:28-30` |
| **INV-BENCH-01** | Mnożnik benchmarku ∈ [0.85, 1.25] | `apply-market-benchmarks.ts:3-4`, `:20-24` |
| **INV-RECALC-01** | Pełne przeliczenia są limitowane w oknie czasowym | `prd.md:107`; `plan-recalc.ts:38-58` |
| **INV-COST-01** | Koszt etapu wymaga dodatniego metrażu i `build_standard`; w przeciwnym razie koszt etapu = 0 | **INFERENCE** z implementacji; `compute-costs.ts:77-79` |

---

## KROK 2 — Klasyfikacja i wybór #1

Ocena skali: **rdzeniowość** (1=niska, 3=najwyższa), **rozsmarowanie** (liczba warstw/plików), **egzekucja** (E=egzekwuje, D=deklaruje, N=naruszalny / niespójny).

| ID | (a) Rdzeniowość | (b) Rozsmarowanie | (c) Egzekucja | Uzasadnienie rdzeniowości |
|---|---:|---:|---|---|
| **INV-GEN-01** | **3** | **6 warstw** (engine, persist, POST×2, GET, UI) | **N** | Bezpośrednio definiuje obietnicę produktu (Success Criteria Primary) |
| INV-FREEZE-01 | 3 | 3 (persist, GET, brak silnika na read) | **E** | Dobrze utrzymane architektonicznie |
| INV-STATE-01 | 3 | 4 (Zod, UI, investment-state, engine) | **D/E** | API+UI OK; silnik **połyka** brak par przez `return []` |
| INV-FILTER-01 | 3 | 2 (`stage-filter`, `generate-plan-results`) | **E** w silniku; **N** na granicy persist |
| INV-VER-01 | 2 | 2 (persist, recalculate route) | **E** | |
| INV-OWN-01 | 2 | 4 route handlery | **E** | Generic security |
| INV-ORIENT-01 | 2 | 2 (copy UI) | **D** | Tylko tekst, nie typ domenowy |
| INV-NOTE-01/02 | 1 | 2 | **E** | Supporting FR-007 |

### Wybór #1: **INV-GEN-01**

**Uzasadnienie:** To jedyny niezmiennik, który łączy **najwyższą rdzeniowość** (cały sens US-01 / FR-006 / FR-008) z **najgorszą egzekucją**:

- API write zwraca **201/200 sukces** nawet gdy `PlanStageResult` = 0 wierszy (`plans-route-handlers.test.ts:395-411`).
- Orkiestrator **zawsze** commituje wersję z pustymi wynikami (`persist-plan-version.test.ts:76-91`, `:93-112`).
- Silnik **połyka** pusty filtr (`stage-filter.ts:26-28`, `:33-34` → `return []`) zamiast fail-fast.
- Read path dopiero **później** zwraca 404 (`results/route.ts:47-51`); UI pokazuje błąd (`plan/[planId]/page.tsx:72-75`) mimo wcześniejszego „sukcesu” submitu (`questionnaire-form.tsx:170-172`).

Produkt obiecuje kosztorys + timeline **po zatwierdzeniu ankiety**; dziś możliwy jest stan: *plan istnieje, wersja istnieje, odpowiedzi zapisane, zero etapów, użytkownik widzi stronę błędu*.

---

## KROK 3 — Diagnoza INV-GEN-01

### Gdzie reguła **powinna** żyć vs gdzie **żyje**

| Warstwa | Plik:linia | Co robi dziś | Stosunek do INV-GEN-01 |
|---|---|---|---|
| **Silnik — filtr** | `stage-filter.ts:26-28` | Brak `starting`/`target` → `return []` | **Połyka** — brak wyjątku |
| **Silnik — filtr** | `stage-filter.ts:33-34` | Nieznany order → `return []` | **Połyka** |
| **Silnik — koszt** | `compute-costs.ts:77-79` | Brak standardu / area≤0 → koszt **0** (etap nadal w wyniku) | **Połyka** — nie blokuje generacji |
| **Silnik — pipeline** | `generate-plan-results.ts:14-18` | Akceptuje pusty `included` → `[]` | **Połyka** |
| **Orkiestracja** | `persist-plan-version.ts:18-31` | Tworzy `PlanVersion` + odpowiedzi **przed** walidacją wyniku | **Narusza atomowość sensu** — wersja powstaje nawet przy pustej generacji |
| **Orkiestracja** | `persist-plan-version.ts:38-64` | Zapisuje `createMany` z **pustą** tablicą | **Narusza** INV-GEN-01 |
| **API POST plan** | `route.ts:51-55`, `:67` | Wywołuje persist; przy sukcesie tx → **201** | **Nie egzekwuje** — brak check długości wyników |
| **API recalculate** | `recalculate/route.ts:73-77`, `:85` | To samo → **200** | **Nie egzekwuje** |
| **API GET results** | `results/route.ts:47-51` | `stageResults.length === 0` → **404** | **Egzekwuje po fakcie** (za późno) |
| **UI submit** | `questionnaire-form.tsx:170-172` | `201/200` → redirect na `/moj-plan/:id` | **Zakłada sukces** bez weryfikacji wyników |
| **UI read** | `plan/[planId]/page.tsx:72-75` | `not_found` → komunikat błędu | **Jedyny strażnik UX** — reaktywny, nie prewencyjny |
| **Testy** | `persist-plan-version.test.ts:93-112` | **Oczekuje** pustych wyników jako akceptowalne | **Kodyfikuje naruszenie** |
| **Testy** | `plans-route-handlers.test.ts:395-411` | **Risk #4 regression: 201 przy zero results** | **Kodyfikuje naruszenie** |

### Wzorce anty-wzorców

1. **„Połknij i persistuj”** — `filterStages` → `[]` → zapis pustej tablicy zamiast rollback/throw.
2. **„Sukces HTTP ≠ sukces domenowy”** — 201/200 bez `PlanStageResult`, GET 404 jako oddzielna faza.
3. **Klient jako strażnik pośredni** — UI nie waliduje non-empty; użytkownik dowiaduje się na stronie planu.
4. **Brak named domain error** — brak typu błędu do mapowania na 422/400; tylko 404 na read lub 500 na wyjątku infra.

### Co dziś chroni INV-GEN-01 (częściowo)

- **Happy path E2E / testy golden** — `plans-route-handlers.test.ts:372-392` wymaga ≥1 etapu z dodatnim kosztem dla poprawnego payloadu.
- **Walidacja Zod** na API — odrzuca **część** invalid inputs (`questionnaireInputsSchema`); nie gwarantuje non-empty filter (np. pusty katalog etapów w DB — test `:395-411`).

---

## KROK 4 — Projekt agregatu-strażnika

### Nazwa odkryta (Ubiquitous Language)

- **Agregat (root):** `PlanVersionSnapshot` — jedna **wersja planu** w momencie generacji: odpowiedzi ankiety + zamrożone wyniki etapów + metadata refinement.
- **Operacja fabryczna:** `PlanVersionSnapshot.generate(...)` — jedyne legalne wejście do utworzenia wersji z wynikami.
- **Błąd domenowy:** `EmptyGenerationResultError` — generacja nie produkuje żadnego etapu do wyświetlenia.
- **Repozytorium:** `PlanVersionSnapshotRepository` — persystuje cały agregat w **jednej transakcji**.

> Uwaga: nazwa celowo odróżnia od gołego rekordu Prisma `PlanVersion` — agregat obejmuje **regułę kompletności wyniku**, której ORM nie wyraża.

### Niezmiennik egzekwowany w agregacie

```
INV-GEN-01: Po generate(), stageResults.length >= 1
            ORAZ ∃ stage: estimatedCost > 0  (opcjonalnie INV-GEN-01b — patrz fazy)
```

### Sygnatury i pseudokod

```typescript
// src/lib/domain/plan-version-snapshot/errors.ts
export class EmptyGenerationResultError extends Error {
  readonly code = "EMPTY_GENERATION_RESULT";
  constructor(readonly planId: string, readonly reason: EmptyGenerationReason) {
    super("Generacja nie produkuje etapów do wyświetlenia");
    this.name = "EmptyGenerationResultError";
  }
}

export type EmptyGenerationReason =
  | "NO_STAGES_AFTER_FILTER"
  | "EMPTY_STAGE_CATALOG"
  | "ALL_STAGE_COSTS_ZERO";  // faza opcjonalna 2

// src/lib/domain/plan-version-snapshot/plan-version-snapshot.ts
export type StageResultValue = {
  stageSlug: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
  sortOrder: number;
};

export class PlanVersionSnapshot {
  private constructor(
    readonly planId: string,
    readonly versionNumber: number,
    readonly inputs: QuestionnaireInputs,
    readonly stageResults: StageResultValue[],
    readonly refinement: {
      applied: boolean;
      benchmarkAsOf: Date | null;
      benchmarkSource: string | null;
    },
  ) {}

  /** PRE: inputs przeszły questionnaireInputsSchema (warstwa API) */
  /** PRE: stages.length > 0 (katalog niepusty) */
  /** POST: stageResults.length >= 1 else throw EmptyGenerationResultError */
  static generate(params: {
    planId: string;
    versionNumber: number;
    inputs: QuestionnaireInputs;
    stages: StageWithModifiers[];
    benchmarks: MarketBenchmarkRow[];
  }): PlanVersionSnapshot {
    const responses = toQuestionnaireResponsesMap(params.inputs);

    if (params.stages.length === 0) {
      throw new EmptyGenerationResultError(params.planId, "EMPTY_STAGE_CATALOG");
    }

    const localResults = generatePlanResults(params.stages, responses);

    if (localResults.length === 0) {
      throw new EmptyGenerationResultError(params.planId, "NO_STAGES_AFTER_FILTER");
    }

    const refinement = applyMarketBenchmarks(localResults, params.stages, params.benchmarks);

    if (refinement.results.length === 0) {
      throw new EmptyGenerationResultError(params.planId, "NO_STAGES_AFTER_FILTER");
    }

    // Faza 2 (opcjonalna): if every estimatedCost === 0 → throw ALL_STAGE_COSTS_ZERO

    return new PlanVersionSnapshot(
      params.planId,
      params.versionNumber,
      params.inputs,
      refinement.results,
      {
        applied: refinement.refinementApplied,
        benchmarkAsOf: refinement.benchmarkFetchedAt,
        benchmarkSource: refinement.benchmarkSourceName,
      },
    );
  }
}

// src/lib/domain/plan-version-snapshot/plan-version-snapshot-repository.ts
export class PlanVersionSnapshotRepository {
  /** Jedna transakcja: wersja + odpowiedzi + wyniki LUB rollback całości */
  async save(tx: Prisma.TransactionClient, snapshot: PlanVersionSnapshot): Promise<{ planVersionId: string }> {
    const planVersion = await tx.planVersion.create({ /* planId, versionNumber */ });

    await tx.questionnaireResponse.createMany({ /* inputs → rows */ });

    if (snapshot.refinement.applied) {
      await tx.planVersion.update({ /* refinement metadata */ });
    }

    await tx.planStageResult.createMany({ data: snapshot.stageResults /* map fields */ });

    return { planVersionId: planVersion.id };
  }
}
```

### Cienkie API (write)

```typescript
// route.ts / recalculate/route.ts — pseudokod
const parsed = questionnaireInputsSchema.safeParse(body);
if (!parsed.success) return 400;

try {
  await prisma.$transaction(async (tx) => {
    // rate limit, versionNumber — bez zmian
    const stages = await tx.constructionStage.findMany({ include: { costModifiers: true } });
    const benchmarks = await tx.marketBenchmark.findMany();

    const snapshot = PlanVersionSnapshot.generate({
      planId, versionNumber, inputs: parsed.data, stages, benchmarks,
    });

    await planVersionSnapshotRepository.save(tx, snapshot);
  });
  return 201 / 200;
} catch (e) {
  if (e instanceof EmptyGenerationResultError) {
    return NextResponse.json(
      { error: "Nie udało się wygenerować kosztorysu dla podanych odpowiedzi.", code: e.code, reason: e.reason },
      { status: 422 },
    );
  }
  throw e;
}
```

### Przeniesienie egzekucji z klienta na serwer

| Dziś | Po refaktorze |
|---|---|
| UI: sukces = HTTP 201/200 → redirect | UI: 422 → komunikat na formularzu (`questionnaire-form.tsx`), **bez** tworzenia „pustego” planu do odczytu |
| GET jako „strażnik” pustego wyniku | GET 404 zostaje dla **starych** danych / migracji; nowe write nie tworzą pustych wersji |

---

## KROK 5 — Before / after, plan faz, testy

### Before / after per warstwa

| Miejsce | Before | After |
|---|---|---|
| `stage-filter.ts:26-34` | `return []` | **Bez zmiany w fazie 1** (pure); agregat interpretuje `[]` jako `EmptyGenerationResultError` |
| `generate-plan-results.ts:14-18` | Akceptuje pusty wynik | Agregat rzuca przed persist |
| `persist-plan-version.ts` | Orkiestracja + brak walidacji | **Deprecate** na rzecz `PlanVersionSnapshotRepository.save` lub cienki wrapper wołający agregat |
| `route.ts` POST | 201 przy pustych wynikach | **422** + brak commit tx |
| `recalculate/route.ts` | 200 przy pustych wynikach | **422** + brak commit tx |
| `results/route.ts:47-51` | 404 pusty wynik | Bez zmian (legacy); metryka „pustych wersji” → 0 po refaktorze |
| `questionnaire-form.tsx:170-172` | Redirect na 201/200 | Obsługa **422** z komunikatem PL |
| `persist-plan-version.test.ts:76-112` | Oczekuje `data: []` | **Usunąć / odwrócić** — oczekuj throw |
| `plans-route-handlers.test.ts:395-411` | Regression akceptuje 201 + [] | **Zastąpić** testem 422 |

### Plan faz refaktoru

| Faza | Cel | Test-first? | Zakres |
|---:|---|---|---|
| **0** | Kontrakt błędu domenowego | **Tak** | `EmptyGenerationResultError`, `PlanVersionSnapshot.generate` unit tests w `src/lib/domain/plan-version-snapshot/*.test.ts` |
| **1** | Agregat + repozytorium | **Tak** | `PlanVersionSnapshot.generate` + `Repository.save` (mock tx); **fail-fast** na pustym wyniku |
| **2** | Podmiana `persist-plan-version` | **Tak** | Handler tests: 422 zamiast 201/200 dla pustego katalogu / invalid filter path; zielony golden path |
| **3** | UI submit | Nie (E2E opcjonalnie) | `questionnaire-form.tsx` — branch 422; copy PL |
| **4** | (Opcjonalna) INV-GEN-01b | **Tak** | Odrzucenie wersji gdy **wszystkie** `estimatedCost === 0` (`compute-costs.ts:77-79` dziś maskuje błędne wejście) |
| **5** | Legacy read | Monitor only | Metryka/log w GET 404 „Brak wyników” — powinno zanikać |

**Zależność:** fazy 0→1→2 przed fazą 3; spójne z `context/changes/refactor-opportunities/plan.md` fazą C1 (assembler DTO) — **INV-GEN-01 dotyczy write path** i może być równoległy lub **przed** extract assemblera read.

### Przypadki testowe (Vitest) — INV-GEN-01

| # | Scenariusz | Oczekiwane | Typ |
|---:|---|---|---|
| T1 | Golden inputs + minimal stages | `generate()` → `stageResults.length >= 1`, suma kosztów > 0 | legal |
| T2 | `stages = []` (pusty katalog) | `throw EmptyGenerationResultError` (`EMPTY_STAGE_CATALOG`) | illegal |
| T3 | Inputs: `starting_state=CLOSED_SHELL`, `investment_state=OPEN_SHELL` (jak `persist-plan-version.test.ts:95-99`) | `throw` (`NO_STAGES_AFTER_FILTER`) | illegal |
| T4 | Brak `starting_state` w mapie odpowiedzi (engine path) | `throw` (`NO_STAGES_AFTER_FILTER`) | illegal |
| T5 | Repository.save po legal generate | tx: 1× `planVersion.create`, 1× `questionnaireResponse.createMany`, 1× `planStageResult.createMany` z len≥1 | legal |
| T6 | Repository.save **nie wołany** po illegal generate | brak wierszy w DB (tx rollback) | illegal |
| T7 | POST `/api/plans` mock pusty katalog | **422**, brak 201 | illegal (handler) |
| T8 | POST golden payload | **201**, ≥1 stage result | legal (handler — istniejący `:372-392`) |

### Load-bearing names (rejestr kontraktów)

| Nazwa | Typ | Warstwa | Opis |
|---|---|---|---|
| `PlanVersionSnapshot` | agregat (root) | `src/lib/domain/plan-version-snapshot/` | Wersja planu + wyniki; jedyne legalne miejsce INV-GEN-01 |
| `PlanVersionSnapshot.generate` | metoda fabryczna | domena | filter→schedule→compute→refine + walidacja |
| `EmptyGenerationResultError` | błąd domenowy | domena | Fail-fast; mapowany na HTTP 422 |
| `EmptyGenerationReason` | enum przyczyny | domena | Diagnostyka / logi |
| `PlanVersionSnapshotRepository` | repozytorium | infrastruktura | Atomowy zapis agregatu w tx |
| `INV-GEN-01` | identyfikator niezmiennika | docs | „Generacja musi produkować wyświetlalny wynik” |

Projekt nie wprowadza na tym etapie nowego pliku `lessons.md` — po implementacji fazy 2 zalecany wpis w `context/foundation/lessons.md`: *„Nigdy nie persistuj PlanVersion bez ≥1 PlanStageResult — użyj PlanVersionSnapshot.generate”*.

---

## Powiązane artefakty

- `context/domain/01-domain-distillation.md` — mapa domeny
- `context/changes/refactor-opportunities/plan.md` — refactor strukturalny C1–C4 (ortogonalny do INV-GEN-01, uzupełniający)
- `context/changes/cost-calibration/research.md` — freeze-on-write (INV-FREEZE-01)
