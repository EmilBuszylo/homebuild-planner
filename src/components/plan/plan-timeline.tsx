"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

import {
  PLAN_TIMELINE_COACHING_CARD_SUFFIX,
  PLAN_TIMELINE_COACHING_MARKER_ARIA_LABEL,
  PLAN_TIMELINE_SCROLL_HINT,
  PLAN_TIMELINE_SCROLL_REGION_ARIA_LABEL,
} from "@/lib/copy/orientational";
import type { PlanResultsDto } from "@/lib/plan-results";
import { addDaysToIsoDate } from "@/lib/format/plan-date";
import {
  layoutTimelineStages,
  TIMELINE_MARKER_EDGE_PADDING_PX,
  TIMELINE_PX_PER_DAY,
  type TimelineAxisTick,
  type TimelineCoachingMarker,
  type TimelineStageLayout,
} from "@/lib/plan/layout-timeline-stages";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type PlanTimelineProps = {
  results: PlanResultsDto;
};

const TIMELINE_PX_PER_DAY_MOBILE = 8;
const TIMELINE_MOBILE_MEDIA_QUERY = "(max-width: 639px)";
const ROW_HEIGHT = "3rem";
const CALENDAR_HEIGHT = "2.5rem";

const COACHING_POPOVER_CONTENT_CLASS =
  "max-w-sm border-amber-200 bg-amber-50 text-left leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50";

function useTimelinePxPerDay(): number {
  const [pxPerDay, setPxPerDay] = useState(TIMELINE_PX_PER_DAY);

  useEffect(() => {
    const mq = window.matchMedia(TIMELINE_MOBILE_MEDIA_QUERY);
    const update = () => {
      setPxPerDay(
        mq.matches ? TIMELINE_PX_PER_DAY_MOBILE : TIMELINE_PX_PER_DAY,
      );
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return pxPerDay;
}

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
  pxPerDay: number,
): { leftPx: number; align: "start" | "center" | "end" } {
  const rawLeft = markerDay * pxPerDay;
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
  pxPerDay: number;
};

function CoachingMarker({
  marker,
  timelineWidthPx,
  pxPerDay,
}: CoachingMarkerProps) {
  const { leftPx, align } = clampMarkerLeftPx(
    marker.markerDay,
    timelineWidthPx,
    pxPerDay,
  );

  const triggerAlign =
    align === "start"
      ? "translate-x-0"
      : align === "end"
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute top-1/2 z-20 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-2 border-amber-600 bg-amber-400 shadow-md ring-2 ring-amber-500/40 dark:border-amber-500 dark:bg-amber-600 dark:ring-amber-400/30",
            triggerAlign,
          )}
          style={{ left: leftPx }}
          aria-label={PLAN_TIMELINE_COACHING_MARKER_ARIA_LABEL}
        >
          <Lightbulb
            className="size-3.5 shrink-0 text-amber-950 dark:text-amber-50"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={8}
        className={COACHING_POPOVER_CONTENT_CLASS}
      >
        <p className="font-semibold">Wskazówka</p>
        <p className="mt-1.5 font-normal">{marker.note}</p>
      </PopoverContent>
    </Popover>
  );
}

type StageLabelTextProps = {
  name: string;
  dateRange: string;
};

function StageLabelText({ name, dateRange }: StageLabelTextProps) {
  return (
    <>
      <p className="text-xs font-medium leading-snug line-clamp-3 sm:line-clamp-none sm:truncate">
        {name}
      </p>
      <p className="text-muted-foreground mt-0.5 text-xs leading-snug line-clamp-2 sm:mt-0 sm:text-[10px] sm:leading-tight sm:line-clamp-none sm:truncate">
        {dateRange}
      </p>
    </>
  );
}

type TimelineAxisHeaderProps = {
  axisTicks: TimelineAxisTick[];
  totalSpanDays: number;
};

function TimelineAxisHeader({
  axisTicks,
  totalSpanDays,
}: TimelineAxisHeaderProps) {
  return (
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
              tick.align === "end" ? "translateX(-100%)" : undefined,
          }}
        >
          <span className="whitespace-nowrap px-1 pt-1 text-[10px] text-muted-foreground">
            {tick.label}
          </span>
          <span className="mt-auto h-full w-px bg-border" />
        </div>
      ))}
    </div>
  );
}

type TimelineStageChartRowProps = {
  stage: TimelineStageLayout;
  axisTicks: TimelineAxisTick[];
  totalSpanDays: number;
  timelineMinWidth: number;
  pxPerDay: number;
};

function TimelineStageChartRow({
  stage,
  axisTicks,
  totalSpanDays,
  timelineMinWidth,
  pxPerDay,
}: TimelineStageChartRowProps) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ height: ROW_HEIGHT }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
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
          pxPerDay={pxPerDay}
        />
      ))}
    </div>
  );
}

type TimelineChartPaneProps = {
  stages: TimelineStageLayout[];
  axisTicks: TimelineAxisTick[];
  totalSpanDays: number;
  timelineMinWidth: number;
  pxPerDay: number;
  showAxisHeader?: boolean;
};

function TimelineChartPane({
  stages,
  axisTicks,
  totalSpanDays,
  timelineMinWidth,
  pxPerDay,
  showAxisHeader = true,
}: TimelineChartPaneProps) {
  return (
    <div
      className="relative"
      style={{ minWidth: `${timelineMinWidth}px` }}
    >
      {showAxisHeader ? (
        <TimelineAxisHeader
          axisTicks={axisTicks}
          totalSpanDays={totalSpanDays}
        />
      ) : null}
      {stages.map((stage) => (
        <div
          key={stage.stageSlug}
          className="border-b last:border-b-0"
        >
          <TimelineStageChartRow
            stage={stage}
            axisTicks={axisTicks}
            totalSpanDays={totalSpanDays}
            timelineMinWidth={timelineMinWidth}
            pxPerDay={pxPerDay}
          />
        </div>
      ))}
    </div>
  );
}

export function PlanTimeline({ results }: PlanTimelineProps) {
  const pxPerDay = useTimelinePxPerDay();
  const anchorLabel = addDaysToIsoDate(results.keyDate, 0);
  const { stages, totalSpanDays, axisTicks } = layoutTimelineStages(
    results.stages,
    results.keyDate,
    pxPerDay,
  );

  const timelineMinWidth = Math.max(totalSpanDays * pxPerDay, 320);
  const hasAnyCoaching = stages.some((s) => s.coachingMarkers.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Harmonogram prac</CardTitle>
        <CardDescription>
          Planowany przebieg etapów od {anchorLabel} (dzień 0). Każdy wiersz to
          jeden etap; oś u góry pokazuje daty.
          {hasAnyCoaching ? PLAN_TIMELINE_COACHING_CARD_SUFFIX : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stages.length === 0 ? (
          <p className="text-muted-foreground text-sm">Brak etapów w planie.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              {PLAN_TIMELINE_SCROLL_HINT}
            </p>

            {/* Mobile: etykieta nad wierszem wykresu — pełna szerokość, bez truncate */}
            <div className="divide-y overflow-hidden rounded-md border sm:hidden">
              {stages.map((stage) => {
                const dateRange = formatStageRange(
                  results.keyDate,
                  stage.startDay,
                  stage.durationDays,
                );
                return (
                  <div key={stage.stageSlug}>
                    <div className="border-b bg-muted/30 px-3 py-2.5">
                      <StageLabelText
                        name={stage.name}
                        dateRange={dateRange}
                      />
                    </div>
                    <div className="overflow-x-auto">
                      <TimelineChartPane
                        stages={[stage]}
                        axisTicks={axisTicks}
                        totalSpanDays={totalSpanDays}
                        timelineMinWidth={timelineMinWidth}
                        pxPerDay={pxPerDay}
                        showAxisHeader={true}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: kolumna etykiet + wykres (bez zmian układu) */}
            <div className="hidden overflow-hidden rounded-md border sm:flex">
              <div className="relative z-20 w-[9.5rem] shrink-0 border-r bg-muted/30">
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
                    <StageLabelText
                      name={stage.name}
                      dateRange={formatStageRange(
                        results.keyDate,
                        stage.startDay,
                        stage.durationDays,
                      )}
                    />
                  </div>
                ))}
              </div>

              <div
                className="relative min-w-0 flex-1 overflow-x-auto"
                role="region"
                aria-label={PLAN_TIMELINE_SCROLL_REGION_ARIA_LABEL}
                tabIndex={0}
              >
                <TimelineChartPane
                  stages={stages}
                  axisTicks={axisTicks}
                  totalSpanDays={totalSpanDays}
                  timelineMinWidth={timelineMinWidth}
                  pxPerDay={pxPerDay}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
