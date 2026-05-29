"use client";

import type { Control, FieldPath } from "react-hook-form";
import { Controller } from "react-hook-form";

import type { QuestionDefinition } from "@/lib/types/domain";
import type { QuestionnaireInputs } from "@/lib/validations/questionnaire";
import {
  Field,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  ChoiceHintLabel,
  ChoiceHintsGuide,
  QuestionHintIcon,
  SelectedChoiceHintPreview,
} from "@/components/questionnaire/question-hint";
import {
  getQuestionChoiceHint,
  hasQuestionChoiceHints,
} from "@/lib/questionnaire/question-hints";

type QuestionOption = { value: string; label: string };

interface QuestionFieldProps {
  question: QuestionDefinition;
  control: Control<QuestionnaireInputs>;
}

export function QuestionField({ question, control }: QuestionFieldProps) {
  switch (question.type) {
    case "SINGLE_CHOICE":
      return <SingleChoiceField question={question} control={control} />;
    case "NUMBER":
      return <NumberField question={question} control={control} />;
    case "DATE":
      return <DateField question={question} control={control} />;
    case "BOOLEAN":
      return <BooleanField question={question} control={control} />;
    default:
      return null;
  }
}

function fieldLabel(question: QuestionDefinition): string {
  return question.required ? question.label : `${question.label} (opcjonalne)`;
}

function LabelWithHint({
  question,
  htmlFor,
}: {
  question: QuestionDefinition;
  htmlFor?: string;
}) {
  return (
    <FieldLabel
      htmlFor={htmlFor}
      className="inline-flex items-baseline gap-1 leading-snug"
    >
      <span>{fieldLabel(question)}</span>
      <QuestionHintIcon slug={question.slug} />
    </FieldLabel>
  );
}

function SingleChoiceField({ question, control }: QuestionFieldProps) {
  const options = (question.options as QuestionOption[] | null) ?? [];
  const slug = question.slug as FieldPath<QuestionnaireInputs>;

  return (
    <Controller
      name={slug}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <LabelWithHint question={question} />
          <ChoiceHintsGuide slug={question.slug} />
          <RadioGroup
            value={(field.value as string) ?? undefined}
            onValueChange={field.onChange}
            className="gap-2"
          >
            {options.map((opt) => {
              const choiceHint = getQuestionChoiceHint(
                question.slug,
                opt.value,
              );
              return (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1 py-0.5 -mx-1 transition-colors",
                    choiceHint && "hover:bg-muted/40",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`${question.slug}-${opt.value}`}
                  />
                  <Label
                    htmlFor={`${question.slug}-${opt.value}`}
                    className="cursor-pointer font-normal"
                  >
                    <ChoiceHintLabel slug={question.slug} value={opt.value}>
                      {opt.label}
                    </ChoiceHintLabel>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
          {hasQuestionChoiceHints(question.slug) ? (
            <SelectedChoiceHintPreview
              slug={question.slug}
              value={(field.value as string) ?? undefined}
            />
          ) : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function NumberField({ question, control }: QuestionFieldProps) {
  const slug = question.slug as FieldPath<QuestionnaireInputs>;

  return (
    <Controller
      name={slug}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <LabelWithHint question={question} htmlFor={question.slug} />
          <div className="flex items-center gap-2">
            <Input
              id={question.slug}
              type="number"
              value={
                field.value !== undefined && field.value !== null
                  ? String(field.value)
                  : ""
              }
              onChange={(e) => {
                const v = e.target.valueAsNumber;
                field.onChange(Number.isNaN(v) ? undefined : v);
              }}
              onBlur={field.onBlur}
              ref={field.ref}
              aria-invalid={!!fieldState.error}
            />
            {question.unit && (
              <span className="shrink-0 text-sm text-muted-foreground">
                {question.unit}
              </span>
            )}
          </div>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function DateField({ question, control }: QuestionFieldProps) {
  const slug = question.slug as FieldPath<QuestionnaireInputs>;

  return (
    <Controller
      name={slug}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <LabelWithHint question={question} htmlFor={question.slug} />
          <Input
            id={question.slug}
            type="date"
            value={(field.value as string) ?? ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            ref={field.ref}
            aria-invalid={!!fieldState.error}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

function BooleanField({ question, control }: QuestionFieldProps) {
  const slug = question.slug as FieldPath<QuestionnaireInputs>;

  return (
    <Controller
      name={slug}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <LabelWithHint question={question} htmlFor={question.slug} />
          <label
            htmlFor={question.slug}
            className="flex cursor-pointer items-center gap-3"
          >
            <input
              id={question.slug}
              type="checkbox"
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="size-4 shrink-0 rounded border border-input accent-primary"
            />
            <span className="text-sm font-normal">Tak</span>
          </label>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
