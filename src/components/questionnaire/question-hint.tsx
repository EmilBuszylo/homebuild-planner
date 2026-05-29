"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";

import type { ChoiceHint } from "@/lib/questionnaire/hints/types";
import {
  getQuestionChoiceHint,
  getQuestionHint,
  hasQuestionChoiceHints,
} from "@/lib/questionnaire/question-hints";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FieldDescription } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type HintContent = Pick<ChoiceHint, "short" | "expanded">;

function HintTooltipBody({ hint }: { hint: HintContent }) {
  return (
    <div className="max-w-xs space-y-1.5 text-left leading-relaxed sm:max-w-sm">
      <p>{hint.short}</p>
      {hint.expanded ? (
        <p className="text-background/80">{hint.expanded}</p>
      ) : null}
    </div>
  );
}

function MergedHintTooltipBody({
  questionHint,
  choiceHint,
  choiceLabel,
}: {
  questionHint: HintContent;
  choiceHint?: HintContent | null;
  choiceLabel?: string;
}) {
  return (
    <div className="max-w-xs space-y-1.5 text-left leading-relaxed sm:max-w-sm">
      <HintTooltipBody hint={questionHint} />
      {choiceHint ? (
        <div className="space-y-1 border-t border-background/20 pt-2">
          {choiceLabel ? (
            <p className="text-[11px] font-medium uppercase tracking-wide text-background/70">
              {choiceLabel}
            </p>
          ) : null}
          <p>{choiceHint.short}</p>
          {choiceHint.expanded ? (
            <p className="text-background/80">{choiceHint.expanded}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type HintIconProps = {
  hint: HintContent;
  className?: string;
};

/** Subtelna ikonka przy etykiecie pytania — jedna na pole. */
export function HintIcon({ hint, className }: HintIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/40 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
          aria-label="Podpowiedź — najedź, aby przeczytać"
        >
          <Info className="size-3" strokeWidth={2.25} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="px-3 py-2">
        <HintTooltipBody hint={hint} />
      </TooltipContent>
    </Tooltip>
  );
}

export function QuestionHintIcon({ slug }: { slug: string }) {
  const hint = getQuestionHint(slug);
  if (!hint) {
    return null;
  }
  return <HintIcon hint={hint} />;
}

type ChoiceHintLabelProps = {
  slug: string;
  value: string;
  children: ReactNode;
  className?: string;
};

/** Etykieta opcji z kropkowanym podkreśleniem — bez dodatkowej ikonki. */
export function ChoiceHintLabel({
  slug,
  value,
  children,
  className,
}: ChoiceHintLabelProps) {
  const hint = getQuestionChoiceHint(slug, value);
  if (!hint) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "cursor-help underline decoration-muted-foreground/70 decoration-dotted underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground/50",
            className,
          )}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="px-3 py-2">
        <HintTooltipBody hint={hint} />
      </TooltipContent>
    </Tooltip>
  );
}

/** Jedna linia pod tytułem — tłumaczy, że opcje mają wyjaśnienia. */
export function ChoiceHintsGuide({ slug }: { slug: string }) {
  if (!hasQuestionChoiceHints(slug)) {
    return null;
  }

  return (
    <FieldDescription className="text-xs leading-relaxed">
      Każda opcja ma krótkie wyjaśnienie — najedź lub dotknij podkreślony
      tekst. Poniżej widać opis aktualnego wyboru.
    </FieldDescription>
  );
}

/** Podgląd wyjaśnienia wybranej opcji — bez hovera. */
export function SelectedChoiceHintPreview({
  slug,
  value,
}: {
  slug: string;
  value?: string;
}) {
  if (!value) {
    return null;
  }

  const hint = getQuestionChoiceHint(slug, value);
  if (!hint) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-live="polite"
    >
      <p className="text-xs leading-relaxed text-muted-foreground">
        {hint.short}
      </p>
      {hint.expanded ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground/80">
          {hint.expanded}
        </p>
      ) : null}
    </div>
  );
}

type SummaryHintIconProps = {
  slug: string;
  choiceValue?: string;
  choiceLabel?: string;
};

/** Jedna ikonka na wiersz podsumowania — łączy hint pytania i wybranej opcji. */
export function SummaryHintIcon({
  slug,
  choiceValue,
  choiceLabel,
}: SummaryHintIconProps) {
  const questionHint = getQuestionHint(slug);
  const choiceHint =
    choiceValue !== undefined
      ? getQuestionChoiceHint(slug, choiceValue)
      : null;

  if (!questionHint) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-sm text-muted-foreground/40 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Podpowiedź — najedź, aby przeczytać"
        >
          <Info className="size-3" strokeWidth={2.25} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="px-3 py-2">
        <MergedHintTooltipBody
          questionHint={questionHint}
          choiceHint={choiceHint}
          choiceLabel={choiceLabel}
        />
      </TooltipContent>
    </Tooltip>
  );
}
