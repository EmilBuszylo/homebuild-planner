import type { PlanStageResultInput, StageWithModifiers } from "@/lib/plan-generation";

export const BENCHMARK_MULTIPLIER_MIN = 0.85;
export const BENCHMARK_MULTIPLIER_MAX = 1.25;

export type MarketBenchmarkRow = {
  stageCategory: string;
  multiplier: number;
  sourceName: string;
  fetchedAt: Date;
};

export type RefinementOutcome = {
  results: PlanStageResultInput[];
  refinementApplied: boolean;
  benchmarkFetchedAt: Date | null;
  benchmarkSourceName: string | null;
};

function clampMultiplier(multiplier: number): number {
  return Math.min(
    BENCHMARK_MULTIPLIER_MAX,
    Math.max(BENCHMARK_MULTIPLIER_MIN, multiplier),
  );
}

export function applyMarketBenchmarks(
  localResults: PlanStageResultInput[],
  stages: StageWithModifiers[],
  benchmarks: MarketBenchmarkRow[],
): RefinementOutcome {
  if (benchmarks.length === 0) {
    return {
      results: localResults,
      refinementApplied: false,
      benchmarkFetchedAt: null,
      benchmarkSourceName: null,
    };
  }

  const benchmarkByCategory = new Map(
    benchmarks.map((row) => [row.stageCategory, row]),
  );
  const categoryBySlug = new Map(stages.map((stage) => [stage.slug, stage.category]));

  const usedBenchmarks: MarketBenchmarkRow[] = [];
  let anyCostChanged = false;

  const results = localResults.map((result) => {
    const category = categoryBySlug.get(result.stageSlug);
    const benchmark = category ? benchmarkByCategory.get(category) : undefined;
    const multiplier = benchmark ? clampMultiplier(benchmark.multiplier) : 1;
    const refinedCost = Math.round(result.estimatedCost * multiplier);

    if (benchmark) {
      usedBenchmarks.push(benchmark);
    }
    if (refinedCost !== result.estimatedCost) {
      anyCostChanged = true;
    }

    return {
      ...result,
      estimatedCost: refinedCost,
    };
  });

  if (!anyCostChanged) {
    return {
      results,
      refinementApplied: false,
      benchmarkFetchedAt: null,
      benchmarkSourceName: null,
    };
  }

  const benchmarkFetchedAt = new Date(
    Math.max(...usedBenchmarks.map((row) => row.fetchedAt.getTime())),
  );
  const sourceNames = [...new Set(usedBenchmarks.map((row) => row.sourceName))];

  return {
    results,
    refinementApplied: true,
    benchmarkFetchedAt,
    benchmarkSourceName: sourceNames.join(", "),
  };
}
