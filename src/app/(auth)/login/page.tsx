import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { PAGE_METADATA } from "@/lib/copy/site";

export const metadata: Metadata = {
  title: PAGE_METADATA.login.title,
  description: PAGE_METADATA.login.description,
};

export default function LoginPage() {
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
