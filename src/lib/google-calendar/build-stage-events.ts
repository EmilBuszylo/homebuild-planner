import { ORIENTATIONAL_FOOTER_LINE } from "@/lib/copy/orientational";
import { formatPln } from "@/lib/format/currency";
import { isoDateFromKeyAndOffset } from "@/lib/format/plan-date";
import type { PlanStageNoteDto } from "@/lib/plan-results";

export type StageForCalendarExport = {
  stageSlug: string;
  name: string;
  estimatedCost: number;
  startDay: number;
  durationDays: number;
};

export type GoogleCalendarEventInput = {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
};

export function buildGoogleCalendarEvents(params: {
  keyDate: string;
  stages: StageForCalendarExport[];
  stageNotes?: Record<string, PlanStageNoteDto>;
  stageSlugs?: string[];
}): GoogleCalendarEventInput[] {
  const slugFilter = params.stageSlugs
    ? new Set(params.stageSlugs)
    : null;

  const selected = slugFilter
    ? params.stages.filter((stage) => slugFilter.has(stage.stageSlug))
    : params.stages;

  return selected.map((stage) => {
    const startDate = isoDateFromKeyAndOffset(params.keyDate, stage.startDay);
    const endDayOffset =
      stage.durationDays <= 0
        ? stage.startDay + 1
        : stage.startDay + stage.durationDays;
    const endDate = isoDateFromKeyAndOffset(params.keyDate, endDayOffset);

    const noteBody = params.stageNotes?.[stage.stageSlug]?.body?.trim();
    const descriptionParts = [
      `Koszt orientacyjny: ${formatPln(stage.estimatedCost)}`,
      noteBody ? `Notatka: ${noteBody}` : null,
      ORIENTATIONAL_FOOTER_LINE,
    ].filter((line): line is string => Boolean(line));

    return {
      summary: stage.name,
      description: descriptionParts.join("\n\n"),
      start: { date: startDate },
      end: { date: endDate },
    };
  });
}
