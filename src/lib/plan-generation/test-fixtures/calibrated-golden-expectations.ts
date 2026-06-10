/**
 * Per-stage oracle for golden DEVELOPER path (120 m², STANDARD, insulation STANDARD).
 * Source: S-01 `calibration-rates.md` + S-05 `utility-rates.md` (scope B default).
 *
 * **Invariant:** expectations are **pre-`applyMarketBenchmarks`**. Production
 * persists refined costs when category multipliers ≠ 1.0. While
 * `prisma/data/market-benchmarks.json` keeps all multipliers at 1.0, oracle totals
 * match persisted plans. Re-run calibration oracles if benchmarks diverge again.
 */
export const CALIBRATED_GOLDEN_EXPECTATIONS: Record<string, number> = {
  sewage_connection: 12_000,
  water_connection: 8_000,
  foundations: 63_000,
  walls: 96_000,
  floor_slabs: 71_400,
  roof_structure: 38_400,
  roof_covering: 30_000,
  windows_doors: 45_600,
  electrical: 31_800,
  plumbing: 23_280,
  heating: 55_930,
  insulation: 28_200,
  facade: 21_000,
  interior_plaster: 13_800,
  floor_screeds: 9_360,
  flooring: 25_200,
  painting: 5_040,
  bathroom_fixtures: 18_600,
  interior_doors: 11_040,
  garage_gate: 12_000,
} as const;

/** Sum of per-stage expectations (S-01 599 650 + S-05 utilities 20 000). */
export const CALIBRATED_GOLDEN_TOTAL = 619_650;

/** ±2% band from workbook total (plan Phase 3). */
export const CALIBRATED_GOLDEN_TOTAL_MIN = Math.round(
  CALIBRATED_GOLDEN_TOTAL * 0.98,
);
export const CALIBRATED_GOLDEN_TOTAL_MAX = Math.round(
  CALIBRATED_GOLDEN_TOTAL * 1.02,
);
