"use server";

import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

export async function login(values: {
  email: string;
  password: string;
}): Promise<AuthResult> {
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
}

export async function register(values: {
  email: string;
  password: string;
}): Promise<AuthResult> {
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
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (secretKey) {
      try {
        const admin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          secretKey,
        );
        await admin.auth.admin.deleteUser(supabaseUser.id);
      } catch (cleanupErr) {
        console.error("Failed to clean up Supabase user after Prisma error:", cleanupErr);
      }
    } else {
      console.error(
        "SUPABASE_SECRET_KEY not set — cannot clean up orphaned Supabase user:",
        supabaseUser.id,
      );
    }
    console.error("Prisma user creation failed:", err);
    return {
      error: "Nie udało się utworzyć konta. Spróbuj ponownie.",
    };
  }

  redirect(routes.dashboard);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logowanie");
}
