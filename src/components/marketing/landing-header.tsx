import Link from "next/link";
import { Home } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type LandingHeaderProps = {
  isAuthenticated: boolean;
};

export function LandingHeader({ isAuthenticated }: LandingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href={routes.home}
          className="flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="size-4" aria-hidden />
          </div>
          Planer budowy domu
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Button asChild size="sm">
                <Link href={routes.dashboard}>Przejdź do panelu</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={routes.login}>Zaloguj się</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={routes.register}>Załóż konto</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
