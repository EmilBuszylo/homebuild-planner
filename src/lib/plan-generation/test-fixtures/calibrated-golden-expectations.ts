/**
 * Per-stage oracle for golden DEVELOPER path (120 m², STANDARD, insulation STANDARD).
 * Source: `context/changes/cost-calibration/calibration-rates.md` golden table — workbook
 * row sums (not `computeStageCost` in tests).
 */
export const CALIBRATED_GOLDEN_EXPECTATIONS: Record<string, number> = {
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

/** Sum of per-stage expectations (deterministic rounding in engine). */
export const CALIBRATED_GOLDEN_TOTAL = 599_650;

/** ±2% band from workbook total (plan Phase 3). */
export const CALIBRATED_GOLDEN_TOTAL_MIN = Math.round(
  CALIBRATED_GOLDEN_TOTAL * 0.98,
);
export const CALIBRATED_GOLDEN_TOTAL_MAX = Math.round(
  CALIBRATED_GOLDEN_TOTAL * 1.02,
);
