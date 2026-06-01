import Link from "next/link";
import { Home } from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type AppHeaderProps = {
  latestPlanId?: string | null;
};

export function AppHeader({ latestPlanId }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          href={routes.dashboard}
          className="flex shrink-0 items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="size-4" aria-hidden />
          </div>
          <span className="hidden sm:inline">Planer budowy domu</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1">
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link href={routes.dashboard}>Panel</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
            <Link href={routes.questionnaire}>Ankieta</Link>
          </Button>
          {latestPlanId ? (
            <Button asChild variant="ghost" size="sm" className="px-2 sm:px-3">
              <Link href={routes.plan(latestPlanId)}>
                <span className="sm:hidden">Plan</span>
                <span className="hidden sm:inline">Twój plan</span>
              </Link>
            </Button>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
