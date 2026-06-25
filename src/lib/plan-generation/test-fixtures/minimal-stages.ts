import { InvestmentState } from "@prisma/client";

import type { StageWithModifiers } from "../types";

/**
 * Directional-only STRUCTURE subset for generation smoke tests (Risk #3).
 * Rates are intentionally stale — calibrated per-stage oracles use
 * `fullStagesForCalibration`. Survives `filterStages` for golden payload:
 * FROM_SCRATCH → DEVELOPER.
 */
export const minimalStagesForGeneration: StageWithModifiers[] = [
  {
    id: "fixture-foundations",
    slug: "foundations",
    name: "Fundamenty",
    description: null,
    coachingNote: null,
    category: "STRUCTURE",
    sortOrder: 1,
    completedByState: InvestmentState.FOUNDATIONS,
    predecessorSlugs: [],
    costPerM2Economy: 500,
    costPerM2Standard: 690,
    costPerM2Premium: 880,
    durationMinDays: 14,
    durationMaxDays: 28,
    costModifiers: [],
  },
  {
    id: "fixture-walls",
    slug: "walls",
    name: "Ściany nośne",
    description: null,
    coachingNote: null,
    category: "STRUCTURE",
    sortOrder: 2,
    completedByState: InvestmentState.OPEN_SHELL,
    predecessorSlugs: ["foundations"],
    costPerM2Economy: 350,
    costPerM2Standard: 500,
    costPerM2Premium: 700,
    durationMinDays: 21,
    durationMaxDays: 42,
    costModifiers: [],
  },
];
