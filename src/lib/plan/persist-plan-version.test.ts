import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { validQuestionnairePayload } from "@/lib/api/test-fixtures/questionnaire-payload";
import { minimalStagesForGeneration } from "@/lib/plan-generation/test-fixtures/minimal-stages";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

import { persistPlanVersionWithResults } from "./persist-plan-version";

function createFakeTx(stages: typeof minimalStagesForGeneration) {
  const planVersionId = "pv-test-1";
  const planVersionCreate = vi.fn().mockResolvedValue({
    id: planVersionId,
    planId: "plan-1",
    versionNumber: 1,
  });
  const questionnaireResponseCreateMany = vi.fn().mockResolvedValue({ count: 0 });
  const constructionStageFindMany = vi.fn().mockResolvedValue(stages);
  const marketBenchmarkFindMany = vi.fn().mockResolvedValue([]);
  const planStageResultCreateMany = vi.fn().mockResolvedValue({ count: 0 });
  const planVersionUpdate = vi.fn().mockResolvedValue({});

  const tx = {
    planVersion: {
      create: planVersionCreate,
      update: planVersionUpdate,
    },
    questionnaireResponse: {
      createMany: questionnaireResponseCreateMany,
    },
    constructionStage: {
      findMany: constructionStageFindMany,
    },
    marketBenchmark: {
      findMany: marketBenchmarkFindMany,
    },
    planStageResult: {
      createMany: planStageResultCreateMany,
    },
  } as unknown as Prisma.TransactionClient;

  return {
    tx,
    spies: {
      planVersionCreate,
      questionnaireResponseCreateMany,
      constructionStageFindMany,
      marketBenchmarkFindMany,
      planStageResultCreateMany,
      planVersionUpdate,
      planVersionId,
    },
  };
}

describe("persistPlanVersionWithResults", () => {
  it("persists at least one stage result with positive estimatedCost for golden inputs", async () => {
    const { tx, spies } = createFakeTx(minimalStagesForGeneration);

    const result = await persistPlanVersionWithResults(tx, {
      planId: "plan-1",
      versionNumber: 1,
      inputs: validQuestionnairePayload,
    });

    expect(result.planVersionId).toBe(spies.planVersionId);
    expect(spies.planStageResultCreateMany).toHaveBeenCalledTimes(1);

    const createManyArg = spies.planStageResultCreateMany.mock.calls[0]?.[0] as {
      data: { estimatedCost: number }[];
    };
    expect(createManyArg.data.length).toBeGreaterThanOrEqual(1);
    expect(createManyArg.data.every((row) => row.estimatedCost > 0)).toBe(true);
  });

  it("persists zero stage results when construction stages are empty (Risk #4 regression)", async () => {
    // Research: context/changes/testing-generation-recalc-integrity/research.md — POST can 201 with no PlanStageResult.
    const { tx, spies } = createFakeTx([]);

    await persistPlanVersionWithResults(tx, {
      planId: "plan-1",
      versionNumber: 1,
      inputs: validQuestionnairePayload,
    });

    expect(spies.planStageResultCreateMany).toHaveBeenCalledTimes(1);
    const createManyArg = spies.planStageResultCreateMany.mock.calls[0]?.[0] as {
      data: unknown[];
    };
    expect(createManyArg.data).toEqual([]);
  });

  it("persists zero stage results when filterStages excludes all stages (Risk #4 regression)", async () => {
    const { tx, spies } = createFakeTx(minimalStagesForGeneration);
    const inputs = {
      ...validQuestionnairePayload,
      starting_state: "CLOSED_SHELL",
      investment_state: "OPEN_SHELL",
    } as QuestionnaireInputs;

    await persistPlanVersionWithResults(tx, {
      planId: "plan-1",
      versionNumber: 1,
      inputs,
    });

    expect(spies.planStageResultCreateMany).toHaveBeenCalledTimes(1);
    const createManyArg = spies.planStageResultCreateMany.mock.calls[0]?.[0] as {
      data: unknown[];
    };
    expect(createManyArg.data).toEqual([]);
  });
});
