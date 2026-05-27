import Link from "next/link";
import { Home } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { routes } from "@/lib/routes";

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link
          href={routes.dashboard}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="size-4" aria-hidden />
          </div>
          Planer budowy domu
        </Link>
        <SignOutButton />
      </div>
    </header>
  );
}
