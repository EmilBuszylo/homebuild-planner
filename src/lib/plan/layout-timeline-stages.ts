import { resolveCoachingHintsForTimeline } from "@/lib/plan/coaching-hints";
import type { TimelineCoachingMarker } from "@/lib/plan/coaching-hints";
import { formatTimelineAxisDate } from "@/lib/format/plan-date";
import type { PlanResultsStageDto } from "@/lib/plan-results";

export type { TimelineCoachingMarker } from "@/lib/plan/coaching-hints";

export const TIMELINE_PX_PER_DAY = 12;
export const TIMELINE_MIN_LABEL_GAP_PX = 88;
/** Odsunięcie markera wskazówki od lewej krawędzi wykresu (px), żeby nie nachodził na etykiety. */
export const TIMELINE_MARKER_EDGE_PADDING_PX = 28;

export type TimelineStageLayout = PlanResultsStageDto & {
  endDay: number;
  rowIndex: number;
  coachingMarkers: TimelineCoachingMarker[];
};

export type TimelineAxisTick = {
  day: number;
  label: string;
  /** Wyrównanie etykiety względem linii siatki (koniec osi → `end`). */
  align: "start" | "end";
};

export type TimelineLayout = {
  stages: TimelineStageLayout[];
  totalSpanDays: number;
  axisTicks: TimelineAxisTick[];
};

function visualDurationDays(durationDays: number): number {
  return Math.max(durationDays, 1);
}

function minDayGap(pxPerDay: number, minLabelGapPx: number): number {
  return Math.max(1, Math.ceil(minLabelGapPx / pxPerDay));
}

export function buildTimelineAxisTicks(
  keyDate: string,
  totalSpanDays: number,
  pxPerDay = TIMELINE_PX_PER_DAY,
  minLabelGapPx = TIMELINE_MIN_LABEL_GAP_PX,
): TimelineAxisTick[] {
  if (totalSpanDays <= 0) {
    return [
      {
        day: 0,
        label: formatTimelineAxisDate(keyDate, 0, true),
        align: "start",
      },
    ];
  }

  const gapDays = minDayGap(pxPerDay, minLabelGapPx);
  let step = gapDays;

  while (step * pxPerDay < minLabelGapPx && step < totalSpanDays) {
    step += gapDays;
  }

  const dayMarks: number[] = [0];
  for (let day = step; day < totalSpanDays; day += step) {
    if (day - dayMarks[dayMarks.length - 1] >= gapDays) {
      dayMarks.push(day);
    }
  }

  const lastMark = dayMarks[dayMarks.length - 1];
  if (totalSpanDays - lastMark >= gapDays) {
    dayMarks.push(totalSpanDays);
  } else if (totalSpanDays !== lastMark) {
    if (dayMarks.length === 1) {
      dayMarks.push(totalSpanDays);
    } else {
      dayMarks[dayMarks.length - 1] = totalSpanDays;
    }
  }

  return dayMarks.map((day, index) => ({
    day,
    label: formatTimelineAxisDate(
      keyDate,
      day,
      index === 0 || index === dayMarks.length - 1,
    ),
    align:
      index === dayMarks.length - 1 && day === totalSpanDays ? "end" : "start",
  }));
}

export function layoutTimelineStages(
  stages: PlanResultsStageDto[],
  keyDate: string,
  pxPerDay = TIMELINE_PX_PER_DAY,
): TimelineLayout {
  if (stages.length === 0) {
    return {
      stages: [],
      totalSpanDays: 1,
      axisTicks: buildTimelineAxisTicks(keyDate, 1, pxPerDay),
    };
  }

  const indexed = stages.map((stage, index) => ({
    ...stage,
    endDay: stage.startDay + visualDurationDays(stage.durationDays),
    sourceIndex: index,
  }));

  const ordered = [...indexed].sort((a, b) => {
    if (a.startDay !== b.startDay) {
      return a.startDay - b.startDay;
    }
    return a.sourceIndex - b.sourceIndex;
  });

  const coachingByTarget = resolveCoachingHintsForTimeline(
    ordered.map((s) => ({
      stageSlug: s.stageSlug,
      startDay: s.startDay,
      durationDays: s.durationDays,
    })),
  );

  const laidOut: TimelineStageLayout[] = ordered.map((stage, rowIndex) => {
    const coaching =
      coachingByTarget.get(stage.stageSlug) ?? { markers: [] };

    return {
      stageSlug: stage.stageSlug,
      name: stage.name,
      category: stage.category,
      estimatedCost: stage.estimatedCost,
      startDay: stage.startDay,
      durationDays: stage.durationDays,
      endDay: stage.endDay,
      rowIndex,
      coachingMarkers: coaching.markers,
    };
  });

  const totalSpanDays = Math.max(1, ...laidOut.map((s) => s.endDay));

  return {
    stages: laidOut,
    totalSpanDays,
    axisTicks: buildTimelineAxisTicks(keyDate, totalSpanDays, pxPerDay),
  };
}
