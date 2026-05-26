"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  AuthFormFooter,
  AuthFormGroup,
  AuthFormHeader,
  AuthPasswordField,
  AuthServerError,
  AuthSubmitField,
  AuthTextField,
} from "@/components/auth/auth-form-layout";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";
import { createZodResolver } from "@/lib/validations/zod-resolver";
import { register } from "@/app/(auth)/actions";

const PASSWORD_HINT =
  "Min. 8 znaków, wielka i mała litera, cyfra oraz znak specjalny.";

export function RegisterForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"form">) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<RegisterFormValues>({
    resolver: createZodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  function onSubmit(values: RegisterFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await register({
        email: values.email,
        password: values.password,
      });
      if (result?.error) {
        setServerError(result.error);
      }
    });
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
          title="Załóż konto"
          description="Podaj dane, aby rozpocząć planowanie budowy"
        />
        <AuthTextField
          control={form.control}
          name="email"
          id="register-email"
          label="E-mail"
          type="email"
          placeholder="jan@example.com"
          autoComplete="email"
        />
        <AuthPasswordField
          control={form.control}
          name="password"
          id="register-password"
          label="Hasło"
          autoComplete="new-password"
          hint={PASSWORD_HINT}
        />
        <AuthPasswordField
          control={form.control}
          name="confirmPassword"
          id="register-confirm-password"
          label="Powtórz hasło"
          autoComplete="new-password"
        />
        <AuthServerError message={serverError} />
        <AuthSubmitField>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Zakładanie konta..." : "Załóż konto"}
          </Button>
        </AuthSubmitField>
        <AuthFormFooter>
          Masz już konto? <Link href={routes.login}>Zaloguj się</Link>
        </AuthFormFooter>
      </AuthFormGroup>
    </form>
  );
}
