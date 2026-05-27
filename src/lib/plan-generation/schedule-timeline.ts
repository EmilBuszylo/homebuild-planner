import type { StageWithModifiers } from "./types";

export type ScheduledStageTiming = {
  stageSlug: string;
  startDay: number;
  durationDays: number;
};

function midpointDuration(minDays: number, maxDays: number): number {
  return Math.round((minDays + maxDays) / 2);
}

export function scheduleTimeline(
  stages: StageWithModifiers[],
): ScheduledStageTiming[] {
  const includedSlugs = new Set(stages.map((s) => s.slug));
  const endDayBySlug = new Map<string, number>();

  const ordered = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);

  return ordered.map((stage) => {
    let startDay = 0;

    for (const predSlug of stage.predecessorSlugs) {
      if (!includedSlugs.has(predSlug)) {
        continue;
      }
      const predEnd = endDayBySlug.get(predSlug);
      if (predEnd !== undefined && predEnd > startDay) {
        startDay = predEnd;
      }
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
