"use client";

import { useState } from "react";
import { Star, StickyNote, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PLAN_STAGE_NOTE_CANCEL_LABEL,
  PLAN_STAGE_NOTE_DELETE_ARIA_LABEL,
  PLAN_STAGE_NOTE_DELETE_ERROR,
  PLAN_STAGE_NOTE_OPEN_ARIA_LABEL,
  PLAN_STAGE_NOTE_STAR_ARIA_LABEL,
  PLAN_STAGE_NOTE_PLACEHOLDER,
  PLAN_STAGE_NOTE_SAVE_ERROR,
  PLAN_STAGE_NOTE_SAVE_LABEL,
} from "@/lib/copy/orientational";
import type { PlanStageNoteDto } from "@/lib/plan-results";
import { cn } from "@/lib/utils";

const NOTE_TEXTAREA_CLASS =
  "min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30";

type StageNoteControlsProps = {
  planId: string;
  stageSlug: string;
  note?: PlanStageNoteDto;
  onNoteChange: (stageSlug: string, note: PlanStageNoteDto | null) => void;
};

type SavedStageNoteResponse = PlanStageNoteDto & { stageSlug: string };

type DeleteStageNoteResponse = { deleted: true; stageSlug: string };

async function putStageNote(
  planId: string,
  payload: { stageSlug: string; body: string; isPinned: boolean },
): Promise<
  | { ok: true; data: SavedStageNoteResponse }
  | { ok: false; error: string }
> {
  const res = await fetch(`/api/plans/${planId}/stage-notes`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      error: data?.error ?? PLAN_STAGE_NOTE_SAVE_ERROR,
    };
  }

  const data = (await res.json()) as SavedStageNoteResponse;
  return { ok: true, data };
}

async function deleteStageNote(
  planId: string,
  stageSlug: string,
): Promise<
  | { ok: true; data: DeleteStageNoteResponse }
  | { ok: false; error: string }
> {
  const params = new URLSearchParams({ stageSlug });
  const res = await fetch(
    `/api/plans/${planId}/stage-notes?${params.toString()}`,
    { method: "DELETE" },
  );

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    return {
      ok: false,
      error: data?.error ?? PLAN_STAGE_NOTE_DELETE_ERROR,
    };
  }

  const data = (await res.json()) as DeleteStageNoteResponse;
  return { ok: true, data };
}

export function StageNoteControls({
  planId,
  stageSlug,
  note,
  onNoteChange,
}: StageNoteControlsProps) {
  const [body, setBody] = useState(note?.body ?? "");
  const [isPinned, setIsPinned] = useState(note?.isPinned ?? false);
  const [draftBody, setDraftBody] = useState(note?.body ?? "");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSavedNoteText = body.length > 0;

  function applyDeletedNote() {
    setBody("");
    setDraftBody("");
    setIsPinned(false);
    onNoteChange(stageSlug, null);
  }

  async function persist(
    nextBody: string,
    nextPinned: boolean,
  ): Promise<boolean> {
    setIsSaving(true);
    setError(null);

    const result = await putStageNote(planId, {
      stageSlug,
      body: nextBody,
      isPinned: nextPinned,
    });

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    const saved = result.data;
    setBody(saved.body);
    setDraftBody(saved.body);
    setIsPinned(saved.isPinned);
    onNoteChange(stageSlug, {
      body: saved.body,
      isPinned: saved.isPinned,
      updatedAt: saved.updatedAt,
    });
    return true;
  }

  async function removeNote(): Promise<boolean> {
    setIsSaving(true);
    setError(null);

    const result = await deleteStageNote(planId, stageSlug);

    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    applyDeletedNote();
    return true;
  }

  async function handleStarToggle() {
    const nextPinned = !isPinned;
    const previousPinned = isPinned;

    if (!nextPinned && body.length === 0) {
      setIsPinned(nextPinned);
      const ok = await removeNote();
      if (!ok) {
        setIsPinned(previousPinned);
      }
      return;
    }

    setIsPinned(nextPinned);
    const ok = await persist(body, nextPinned);
    if (!ok) {
      setIsPinned(previousPinned);
    }
  }

  async function handleSaveNote() {
    if (draftBody.length === 0 && !isPinned && hasSavedNoteText) {
      const ok = await removeNote();
      if (ok) {
        setPopoverOpen(false);
      }
      return;
    }

    const ok = await persist(draftBody, isPinned);
    if (ok) {
      setPopoverOpen(false);
    }
  }

  async function handleDeleteNote() {
    const ok = await removeNote();
    if (ok) {
      setPopoverOpen(false);
    }
  }

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setDraftBody(body);
      setError(null);
    }
    setPopoverOpen(open);
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50",
          isPinned && "text-amber-600 hover:text-amber-700 dark:text-amber-500",
        )}
        aria-label={PLAN_STAGE_NOTE_STAR_ARIA_LABEL}
        aria-pressed={isPinned}
        disabled={isSaving}
        onClick={handleStarToggle}
      >
        <Star
          className={cn("size-3.5", isPinned && "fill-current")}
          aria-hidden
        />
      </button>

      <Popover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              hasSavedNoteText && "text-foreground",
            )}
            aria-label={PLAN_STAGE_NOTE_OPEN_ARIA_LABEL}
          >
            <StickyNote className="size-3.5" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-72 space-y-3">
          <textarea
            className={NOTE_TEXTAREA_CLASS}
            value={draftBody}
            onChange={(event) => setDraftBody(event.target.value)}
            placeholder={PLAN_STAGE_NOTE_PLACEHOLDER}
            maxLength={2000}
            disabled={isSaving}
            aria-label={PLAN_STAGE_NOTE_OPEN_ARIA_LABEL}
          />
          {error ? (
            <p className="text-destructive text-xs" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {hasSavedNoteText ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={isSaving}
                aria-label={PLAN_STAGE_NOTE_DELETE_ARIA_LABEL}
                onClick={handleDeleteNote}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            ) : (
              <span aria-hidden className="size-7 shrink-0" />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving}
                onClick={() => setPopoverOpen(false)}
              >
                {PLAN_STAGE_NOTE_CANCEL_LABEL}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSaving}
                onClick={handleSaveNote}
              >
                {PLAN_STAGE_NOTE_SAVE_LABEL}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
