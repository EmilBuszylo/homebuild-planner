"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { reportError } from "@/lib/observability/report-error";
import { prisma } from "@/lib/prisma";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerServerSchema } from "@/lib/validations/auth";

export type AuthResult = {
  error?: string;
};

const ERROR_MAP: Record<string, string> = {
  "Invalid login credentials": "Nieprawidłowy e-mail lub hasło",
  "User already registered": "Konto z tym adresem e-mail już istnieje",
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie za chwilę",
  "For security purposes, you can only request this after":
    "Zbyt wiele prób. Spróbuj ponownie za chwilę",
};

function translateAuthError(message: string): string {
  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return value;
  }
  return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return createAdminClient(url, secretKey);
}

/** signUp without a session (email confirmation on) leaves middleware with no cookie. */
async function ensureSessionAfterSignUp(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { email: string; password: string; userId: string },
  hadSession: boolean,
): Promise<AuthResult | undefined> {
  if (hadSession) return undefined;

  const admin = createSupabaseAdmin();
  if (!admin) {
    return {
      error: "Konto utworzone — potwierdź adres e-mail przed zalogowaniem.",
    };
  }

  const { error: confirmError } = await admin.auth.admin.updateUserById(
    params.userId,
    { email_confirm: true },
  );
  if (confirmError) {
    console.error("Failed to confirm user email after signUp:", confirmError);
    reportError(confirmError, {
      route: "register",
      extra: { phase: "email_confirm" },
    });
    return { error: "Nie udało się aktywować konta. Spróbuj ponownie." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });
  if (signInError) {
    return { error: translateAuthError(signInError.message) };
  }

  return undefined;
}

export async function login(values: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  return Sentry.withServerActionInstrumentation(
    "login",
    { headers: await headers(), recordResponse: true },
    async () => {
      const parsed = loginSchema.safeParse(values);
      if (!parsed.success) {
        return { error: "Nieprawidłowe dane logowania." };
      }

      const supabase = await createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        return { error: translateAuthError(error.message) };
      }

      redirect(routes.dashboard);
    },
  );
}

export async function register(values: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  return Sentry.withServerActionInstrumentation(
    "register",
    { headers: await headers(), recordResponse: true },
    async () => {
      const parsed = registerServerSchema.safeParse(values);
      if (!parsed.success) {
        return { error: "Nieprawidłowe dane rejestracji." };
      }

      const supabase = await createClient();

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        return { error: translateAuthError(error.message) };
      }

      const supabaseUser = data.user;
      if (!supabaseUser?.email) {
        return { error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie." };
      }

      try {
        await prisma.user.create({
          data: {
            id: supabaseUser.id,
            email: supabaseUser.email,
          },
        });
      } catch (err) {
        const admin = createSupabaseAdmin();
        if (admin) {
          try {
            await admin.auth.admin.deleteUser(supabaseUser.id);
          } catch (cleanupErr) {
            console.error(
              "Failed to clean up Supabase user after Prisma error:",
              cleanupErr,
            );
            reportError(cleanupErr, {
              route: "register",
              extra: { phase: "supabase_cleanup", userId: supabaseUser.id },
            });
            return {
              error:
                "Nie udało się utworzyć konta. Konto mogło zostać częściowo utworzone — spróbuj się zalogować lub skontaktuj z administratorem.",
            };
          }
        } else {
          console.error(
            "SUPABASE_SECRET_KEY not set — cannot clean up orphaned Supabase user:",
            supabaseUser.id,
          );
        }
        console.error("Prisma user creation failed:", err);
        reportError(err, {
          route: "register",
          extra: { phase: "prisma_create" },
        });
        return {
          error: "Nie udało się utworzyć konta. Spróbuj ponownie.",
        };
      }

      if (!data.session) {
        if (!process.env.CI) {
          return {
            error:
              "Konto utworzone — potwierdź adres e-mail przed zalogowaniem.",
          };
        }

        const sessionError = await ensureSessionAfterSignUp(
          supabase,
          {
            email: parsed.data.email,
            password: parsed.data.password,
            userId: supabaseUser.id,
          },
          false,
        );
        if (sessionError?.error) {
          return sessionError;
        }
      }

      redirect(routes.dashboard);
    },
  );
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.login);
}
