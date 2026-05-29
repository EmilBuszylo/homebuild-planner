"use client";

import { Lightbulb } from "lucide-react";

import type { PlanResultsDto } from "@/lib/plan-results";
import { addDaysToIsoDate } from "@/lib/format/plan-date";
import {
  layoutTimelineStages,
  TIMELINE_MARKER_EDGE_PADDING_PX,
  TIMELINE_PX_PER_DAY,
  type TimelineCoachingMarker,
} from "@/lib/plan/layout-timeline-stages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PlanTimelineProps = {
  results: PlanResultsDto;
};

const PX_PER_DAY = TIMELINE_PX_PER_DAY;
const LABEL_COLUMN_WIDTH = "9.5rem";
const ROW_HEIGHT = "3rem";
const CALENDAR_HEIGHT = "2.5rem";

function formatStageRange(
  keyDate: string,
  startDay: number,
  durationDays: number,
): string {
  const startLabel = addDaysToIsoDate(keyDate, startDay);
  if (durationDays <= 0) {
    return startLabel;
  }
  const endLabel = addDaysToIsoDate(keyDate, startDay + durationDays);
  const dayWord = durationDays === 1 ? "dzień" : "dni";
  return `${startLabel} – ${endLabel} (${durationDays} ${dayWord})`;
}

function stageBarStyle(
  startDay: number,
  durationDays: number,
  totalSpanDays: number,
): { left: string; width: string } {
  const leftPercent = (startDay / totalSpanDays) * 100;
  const widthPercent =
    (Math.max(durationDays, 1) / totalSpanDays) * 100;

  return {
    left: `${leftPercent}%`,
    width: `${Math.max(widthPercent, 100 / totalSpanDays)}%`,
  };
}

function clampMarkerLeftPx(
  markerDay: number,
  timelineWidthPx: number,
): { leftPx: number; align: "start" | "center" | "end" } {
  const rawLeft = markerDay * PX_PER_DAY;
  const pad = TIMELINE_MARKER_EDGE_PADDING_PX;
  const maxLeft = Math.max(pad, timelineWidthPx - pad);

  if (rawLeft <= pad) {
    return { leftPx: pad, align: "start" };
  }
  if (rawLeft >= maxLeft) {
    return { leftPx: maxLeft, align: "end" };
  }
  return { leftPx: rawLeft, align: "center" };
}

type StageBarProps = {
  name: string;
  startDay: number;
  durationDays: number;
  totalSpanDays: number;
};

function StageBar({
  name,
  startDay,
  durationDays,
  totalSpanDays,
}: StageBarProps) {
  return (
    <div
      className="absolute top-1/2 h-6 -translate-y-1/2 rounded-md border border-primary/40 bg-primary/20 shadow-sm"
      style={stageBarStyle(startDay, durationDays, totalSpanDays)}
      aria-label={name}
    />
  );
}

type CoachingMarkerProps = {
  marker: TimelineCoachingMarker;
  timelineWidthPx: number;
};

function CoachingMarker({ marker, timelineWidthPx }: CoachingMarkerProps) {
  const { leftPx, align } = clampMarkerLeftPx(
    marker.markerDay,
    timelineWidthPx,
  );

  const triggerAlign =
    align === "start"
      ? "translate-x-0"
      : align === "end"
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-help items-center justify-center rounded-full border-2 border-amber-600 bg-amber-400 shadow-md ring-2 ring-amber-500/40 dark:border-amber-500 dark:bg-amber-600 dark:ring-amber-400/30",
            triggerAlign,
          )}
          style={{ left: leftPx }}
          aria-label="Wskazówka — najedź, aby przeczytać"
        >
          <Lightbulb
            className="size-3.5 shrink-0 text-amber-950 dark:text-amber-50"
            aria-hidden
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="max-w-sm border-amber-200 bg-amber-50 text-left leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
      >
        <p className="font-semibold">Wskazówka</p>
        <p className="mt-1.5 font-normal">{marker.note}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function PlanTimeline({ results }: PlanTimelineProps) {
  const anchorLabel = addDaysToIsoDate(results.keyDate, 0);
  const { stages, totalSpanDays, axisTicks } = layoutTimelineStages(
    results.stages,
    results.keyDate,
    PX_PER_DAY,
  );

  const timelineMinWidth = Math.max(totalSpanDays * PX_PER_DAY, 320);
  const hasAnyCoaching = stages.some((s) => s.coachingMarkers.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Harmonogram prac</CardTitle>
        <CardDescription>
          Planowany przebieg etapów od {anchorLabel} (dzień 0). Każdy wiersz to
          jeden etap; oś u góry pokazuje daty.
          {hasAnyCoaching
            ? " Żółte ikony na wierszu etapu pokazują poradę w danym momencie harmonogramu — najedź, aby przeczytać."
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak etapów w planie.</p>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="flex overflow-hidden rounded-md border">
              <div
                className="relative z-20 shrink-0 border-r bg-muted/30"
                style={{ width: LABEL_COLUMN_WIDTH }}
              >
                <div
                  className="border-b px-2 text-xs font-medium text-muted-foreground"
                  style={{ height: CALENDAR_HEIGHT }}
                  aria-hidden
                />
                {stages.map((stage) => (
                  <div
                    key={stage.stageSlug}
                    className="flex flex-col justify-center border-b px-2 py-1 last:border-b-0"
                    style={{ height: ROW_HEIGHT }}
                  >
                    <p className="truncate text-xs font-medium leading-tight">
                      {stage.name}
                    </p>
                    <p className="text-muted-foreground truncate text-[10px] leading-tight">
                      {formatStageRange(
                        results.keyDate,
                        stage.startDay,
                        stage.durationDays,
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative min-w-0 flex-1 overflow-x-auto">
                <div
                  className="relative"
                  style={{ minWidth: `${timelineMinWidth}px` }}
                >
                  <div
                    className="relative border-b bg-muted/20"
                    style={{ height: CALENDAR_HEIGHT }}
                    aria-hidden
                  >
                    {axisTicks.map((tick) => (
                      <div
                        key={tick.day}
                        className="absolute top-0 flex h-full flex-col"
                        style={{
                          left: `${(tick.day / totalSpanDays) * 100}%`,
                          transform:
                            tick.align === "end"
                              ? "translateX(-100%)"
                              : undefined,
                        }}
                      >
                        <span className="whitespace-nowrap px-1 pt-1 text-[10px] text-muted-foreground">
                          {tick.label}
                        </span>
                        <span className="mt-auto h-full w-px bg-border" />
                      </div>
                    ))}
                  </div>

                  {stages.map((stage) => (
                    <div
                      key={stage.stageSlug}
                      className="relative overflow-hidden border-b last:border-b-0"
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div
                        className="pointer-events-none absolute inset-0"
                        aria-hidden
                      >
                        {axisTicks.map((tick) => (
                          <span
                            key={tick.day}
                            className="absolute top-0 h-full w-px bg-border/50"
                            style={{
                              left: `${(tick.day / totalSpanDays) * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                      <StageBar
                        name={stage.name}
                        startDay={stage.startDay}
                        durationDays={stage.durationDays}
                        totalSpanDays={totalSpanDays}
                      />
                      {stage.coachingMarkers.map((marker) => (
                        <CoachingMarker
                          key={marker.id}
                          marker={marker}
                          timelineWidthPx={timelineMinWidth}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}
