"use server";

import { redirect } from "next/navigation";

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

  redirect("/dashboard");
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

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logowanie");
}
