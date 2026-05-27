import type { Prisma } from "@prisma/client";

import {
  generatePlanResults,
  toQuestionnaireResponsesMap,
} from "@/lib/plan-generation";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";

export async function persistPlanVersionWithResults(
  tx: Prisma.TransactionClient,
  params: {
    planId: string;
    versionNumber: number;
    inputs: QuestionnaireInputs;
  },
): Promise<{ planVersionId: string }> {
  const planVersion = await tx.planVersion.create({
    data: {
      planId: params.planId,
      versionNumber: params.versionNumber,
    },
  });

  const responses = Object.entries(params.inputs).map(([slug, value]) => ({
    planVersionId: planVersion.id,
    questionSlug: slug,
    value: String(value),
  }));

  await tx.questionnaireResponse.createMany({ data: responses });

  const stages = await tx.constructionStage.findMany({
    include: { costModifiers: true },
    orderBy: { sortOrder: "asc" },
  });

  const responsesMap = toQuestionnaireResponsesMap(params.inputs);
  const stageResults = generatePlanResults(stages, responsesMap);

  await tx.planStageResult.createMany({
    data: stageResults.map((result) => ({
      planVersionId: planVersion.id,
      stageSlug: result.stageSlug,
      estimatedCost: result.estimatedCost,
      startDay: result.startDay,
      durationDays: result.durationDays,
      sortOrder: result.sortOrder,
    })),
  });

  return { planVersionId: planVersion.id };
}
