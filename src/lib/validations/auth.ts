import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Hasło musi mieć co najmniej 8 znaków")
  .regex(/[a-z]/, "Hasło musi zawierać małą literę")
  .regex(/[A-Z]/, "Hasło musi zawierać wielką literę")
  .regex(/[0-9]/, "Hasło musi zawierać cyfrę")
  .regex(/[^a-zA-Z0-9]/, "Hasło musi zawierać znak specjalny");

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail jest wymagany")
    .email("Podaj poprawny adres e-mail"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, "E-mail jest wymagany")
      .email("Podaj poprawny adres e-mail"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Powtórz hasło"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być identyczne",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
