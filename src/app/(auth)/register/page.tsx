import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { PAGE_METADATA } from "@/lib/copy/site";

export const metadata: Metadata = {
  title: PAGE_METADATA.register.title,
  description: PAGE_METADATA.register.description,
};

export default function RegisterPage() {
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
