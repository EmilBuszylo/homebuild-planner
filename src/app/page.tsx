import Link from "next/link";

import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingHeader } from "@/components/marketing/landing-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <div className="flex min-h-svh flex-col">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        <div className="flex max-w-lg flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Orientacyjny kosztorys i harmonogram budowy
          </h1>
          <p className="text-lg text-muted-foreground">
            Wypełnij ankietę o swoim domu i otrzymaj wstępny podział kosztów na
            etapy oraz timeline prac — bez zgadywania kolejności.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {isAuthenticated ? (
            <Button asChild size="lg">
              <Link href={routes.dashboard}>Przejdź do panelu</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg">
                <Link href={routes.register}>Załóż konto</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href={routes.login}>Zaloguj się</Link>
              </Button>
            </>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
