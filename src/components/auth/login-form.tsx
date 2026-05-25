"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AuthFormFooter,
  AuthFormGroup,
  AuthFormHeader,
  AuthPasswordField,
  AuthSubmitField,
  AuthTextField,
} from "@/components/auth/auth-form-layout";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  loginSchema,
  type LoginFormValues,
} from "@/lib/validations/auth";
import { createZodResolver } from "@/lib/validations/zod-resolver";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const form = useForm<LoginFormValues>({
    resolver: createZodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginFormValues) {
    // UI-only: Supabase auth wired in a later change
    console.log("login", values);
  }

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      {...props}
    >
      <AuthFormGroup>
        <AuthFormHeader
          title="Zaloguj się"
          description="Wprowadź e-mail i hasło, aby wejść do konta"
        />
        <AuthTextField
          control={form.control}
          name="email"
          id="email"
          label="E-mail"
          type="email"
          placeholder="jan@example.com"
          autoComplete="email"
        />
        <AuthPasswordField
          control={form.control}
          name="password"
          id="password"
          label="Hasło"
          autoComplete="current-password"
        />
        <AuthSubmitField>
          <Button type="submit">Zaloguj</Button>
        </AuthSubmitField>
        <AuthFormFooter>
          Nie masz konta? <Link href={routes.register}>Zarejestruj się</Link>
        </AuthFormFooter>
      </AuthFormGroup>
    </form>
  );
}
