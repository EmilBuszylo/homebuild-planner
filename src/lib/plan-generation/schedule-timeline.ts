import type { StageWithModifiers } from "./types";

export type ScheduledStageTiming = {
  stageSlug: string;
  startDay: number;
  durationDays: number;
};

function midpointDuration(minDays: number, maxDays: number): number {
  return Math.round((minDays + maxDays) / 2);
}

function implicitStartFromEarlierStages(
  stage: StageWithModifiers,
  ordered: StageWithModifiers[],
  endDayBySlug: Map<string, number>,
  includedSlugs: Set<string>,
): number {
  let startDay = 0;

  for (const other of ordered) {
    if (other.sortOrder >= stage.sortOrder) {
      break;
    }
    if (!includedSlugs.has(other.slug)) {
      continue;
    }
    const otherEnd = endDayBySlug.get(other.slug);
    if (otherEnd !== undefined && otherEnd > startDay) {
      startDay = otherEnd;
    }
  }

  return startDay;
}

export function scheduleTimeline(
  stages: StageWithModifiers[],
): ScheduledStageTiming[] {
  const includedSlugs = new Set(stages.map((s) => s.slug));
  const endDayBySlug = new Map<string, number>();

  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return ordered.map((stage) => {
    let startDay = 0;
    let matchedPredInPlan = false;

    for (const predSlug of stage.predecessorSlugs) {
      if (!includedSlugs.has(predSlug)) {
        continue;
      }
      matchedPredInPlan = true;
      const predEnd = endDayBySlug.get(predSlug);
      if (predEnd !== undefined && predEnd > startDay) {
        startDay = predEnd;
      }
    }

    if (!matchedPredInPlan && stage.predecessorSlugs.length > 0) {
      startDay = implicitStartFromEarlierStages(
        stage,
        ordered,
        endDayBySlug,
        includedSlugs,
      );
    }

    const durationDays = midpointDuration(
      stage.durationMinDays,
      stage.durationMaxDays,
    );
    endDayBySlug.set(stage.slug, startDay + durationDays);

    return {
      stageSlug: stage.slug,
      startDay,
      durationDays,
    };
  });
}
