import type { StageCostModifier } from "@/lib/types/domain";

import {
  calibrationStageRateDefs,
} from "../calibration/stage-rate-defs";
import type { StageWithModifiers } from "../types";

import { calibrationModifierDefs } from "./calibration-modifier-defs";

export { calibrationStageRateDefs } from "../calibration/stage-rate-defs";

function modifiersForStage(stageId: string, slug: string): StageCostModifier[] {
  const defs = calibrationModifierDefs.filter((m) => m.stageSlug === slug);
  return defs.map((def, index) => ({
    id: `fixture-${slug}-mod-${index}`,
    stageId,
    triggerQuestionSlug: def.triggerQuestionSlug,
    triggerValue: def.triggerValue,
    costAdjustmentPerM2: def.costAdjustmentPerM2,
    fixedCostAdjustment: def.fixedCostAdjustment,
    description: def.description,
  }));
}

/**
 * Full 20-stage fixture for S-01 + S-05 calibration oracles (Risk #3 extension).
 * Values mirror shared calibration module — no Prisma / seed import in tests.
 */
export const fullStagesForCalibration: StageWithModifiers[] =
  calibrationStageRateDefs.map((stage) => {
    const id = `fixture-${stage.slug}`;
    return {
      id,
      slug: stage.slug,
      name: stage.name,
      description: null,
      coachingNote: null,
      category: stage.category,
      sortOrder: stage.sortOrder,
      completedByState: stage.completedByState,
      predecessorSlugs: [...stage.predecessorSlugs],
      costPerM2Economy: stage.costPerM2Economy,
      costPerM2Standard: stage.costPerM2Standard,
      costPerM2Premium: stage.costPerM2Premium,
      durationMinDays: stage.durationMinDays,
      durationMaxDays: stage.durationMaxDays,
      costModifiers: modifiersForStage(id, stage.slug),
    };
  });
