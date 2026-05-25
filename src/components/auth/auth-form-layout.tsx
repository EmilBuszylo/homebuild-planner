"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import { Controller } from "react-hook-form";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function AuthFormHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-balance text-muted-foreground">{description}</p>
    </div>
  );
}

export function AuthFormFooter({ children }: { children: React.ReactNode }) {
  return (
    <Field>
      <FieldDescription className="text-center">{children}</FieldDescription>
    </Field>
  );
}

type AuthTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  id: string;
  label: string;
  type?: React.ComponentProps<typeof Input>["type"];
  placeholder?: string;
  autoComplete?: string;
};

export function AuthTextField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
}: AuthTextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            aria-invalid={!!fieldState.error}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

type AuthPasswordFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  id: string;
  label: string;
  autoComplete?: string;
  hint?: string;
};

export function AuthPasswordField<T extends FieldValues>({
  control,
  name,
  id,
  label,
  autoComplete,
  hint,
}: AuthPasswordFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={!!fieldState.error}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type="password"
            autoComplete={autoComplete}
            aria-invalid={!!fieldState.error}
          />
          {hint ? (
            <FieldDescription>{hint}</FieldDescription>
          ) : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function AuthFormGroup({
  className,
  children,
}: React.ComponentProps<typeof FieldGroup>) {
  return <FieldGroup className={cn(className)}>{children}</FieldGroup>;
}

export function AuthSubmitField({
  children,
  className,
}: React.ComponentProps<typeof Field>) {
  return <Field className={className}>{children}</Field>;
}
