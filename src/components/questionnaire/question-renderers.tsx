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

function SingleChoiceField({ question, control }: QuestionFieldProps) {
  const options = (question.options as QuestionOption[] | null) ?? [];
  const slug = question.slug as FieldPath<QuestionnaireInputs>;

  return (
    <Controller
      name={slug}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel>{fieldLabel(question)}</FieldLabel>
          <RadioGroup
            value={(field.value as string) ?? undefined}
            onValueChange={field.onChange}
          >
            {options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem
                  value={opt.value}
                  id={`${question.slug}-${opt.value}`}
                />
                <Label
                  htmlFor={`${question.slug}-${opt.value}`}
                  className="cursor-pointer font-normal"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
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
          <FieldLabel htmlFor={question.slug}>{fieldLabel(question)}</FieldLabel>
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
          <FieldLabel htmlFor={question.slug}>{fieldLabel(question)}</FieldLabel>
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
            <span className="text-sm font-medium">
              {fieldLabel(question)}
            </span>
          </label>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
