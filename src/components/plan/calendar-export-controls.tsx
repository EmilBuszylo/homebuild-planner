"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PLAN_CALENDAR_CONNECT_LABEL,
  PLAN_CALENDAR_CONNECTED_TOAST,
  PLAN_CALENDAR_DISCONNECT_LABEL,
  PLAN_CALENDAR_EXPORT_CANCEL_LABEL,
  PLAN_CALENDAR_EXPORT_DUPLICATE_HINT,
  PLAN_CALENDAR_EXPORT_ERROR,
  PLAN_CALENDAR_EXPORT_LABEL,
  PLAN_CALENDAR_EXPORT_SELECT_STAGES,
  PLAN_CALENDAR_EXPORT_SUBMIT_LABEL,
  PLAN_CALENDAR_EXPORT_SUCCESS,
} from "@/lib/copy/orientational";
import type { PlanResultsStageDto } from "@/lib/plan-results";
import { cn } from "@/lib/utils";

type CalendarExportControlsProps = {
  planId: string;
  stages: PlanResultsStageDto[];
  initialConnected: boolean;
};

function CalendarExportControlsInner({
  planId,
  stages,
  initialConnected,
}: CalendarExportControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showConnectedToast =
    searchParams.get("googleCalendar") === "connected";

  const [connected, setConnected] = useState(initialConnected);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showConnectedToast) {
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("googleCalendar");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [showConnectedToast, searchParams, pathname, router]);

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setSelectedSlugs(stages.map((stage) => stage.stageSlug));
      setError(null);
    }
    setPopoverOpen(open);
  }

  function toggleSlug(slug: string) {
    setSelectedSlugs((current) =>
      current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug],
    );
  }

  async function handleExport() {
    if (selectedSlugs.length === 0) {
      setError("Wybierz co najmniej jeden etap.");
      return;
    }

    setIsExporting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/plans/${planId}/calendar-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageSlugs: selectedSlugs }),
      });

      const data = (await res.json().catch(() => null)) as {
        error?: string;
        createdCount?: number;
      } | null;

      if (!res.ok) {
        setError(data?.error ?? PLAN_CALENDAR_EXPORT_ERROR);
        return;
      }

      setMessage(
        PLAN_CALENDAR_EXPORT_SUCCESS.replace(
          "{count}",
          String(data?.createdCount ?? 0),
        ),
      );
      setPopoverOpen(false);
    } catch {
      setError(PLAN_CALENDAR_EXPORT_ERROR);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
      });
      if (res.ok) {
        setConnected(false);
        setMessage(null);
      }
    } finally {
      setIsDisconnecting(false);
    }
  }

  const statusMessage = showConnectedToast
    ? PLAN_CALENDAR_CONNECTED_TOAST
    : message;

  if (!connected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button asChild size="sm" variant="outline">
          <a href={`/api/integrations/google/authorize?planId=${planId}`}>
            <CalendarPlus className="mr-1.5 size-4" aria-hidden />
            {PLAN_CALENDAR_CONNECT_LABEL}
          </a>
        </Button>
        {statusMessage ? (
          <p className="text-muted-foreground text-xs">{statusMessage}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline">
              <CalendarPlus className="mr-1.5 size-4" aria-hidden />
              {PLAN_CALENDAR_EXPORT_LABEL}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3">
            <p className="text-sm font-medium">
              {PLAN_CALENDAR_EXPORT_SELECT_STAGES}
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {stages.map((stage) => (
                <li key={stage.stageSlug}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={selectedSlugs.includes(stage.stageSlug)}
                      onChange={() => toggleSlug(stage.stageSlug)}
                      disabled={isExporting}
                    />
                    <span>{stage.name}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground text-xs">
              {PLAN_CALENDAR_EXPORT_DUPLICATE_HINT}
            </p>
            {error ? (
              <p className="text-destructive text-xs" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={() => setPopoverOpen(false)}
              >
                {PLAN_CALENDAR_EXPORT_CANCEL_LABEL}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isExporting}
                onClick={handleExport}
              >
                {PLAN_CALENDAR_EXPORT_SUBMIT_LABEL}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          disabled={isDisconnecting}
          onClick={handleDisconnect}
        >
          {PLAN_CALENDAR_DISCONNECT_LABEL}
        </Button>
      </div>
      {statusMessage ? (
        <p className={cn("text-xs", "text-muted-foreground")}>{statusMessage}</p>
      ) : null}
      {error && !popoverOpen ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CalendarExportControls(props: CalendarExportControlsProps) {
  return (
    <Suspense fallback={null}>
      <CalendarExportControlsInner {...props} />
    </Suspense>
  );
}
