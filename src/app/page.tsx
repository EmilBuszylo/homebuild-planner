import Link from "next/link";
import { redirect } from "next/navigation";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { routes } from "@/lib/routes";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(routes.dashboard);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex max-w-lg flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 font-medium">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Home className="size-4" aria-hidden />
          </div>
          <span className="text-xl font-semibold">Planer budowy domu</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Orientacyjny kosztorys i harmonogram budowy
        </h1>
        <p className="text-lg text-muted-foreground">
          Wypełnij ankietę o swoim domu i otrzymaj wstępny podział kosztów na
          etapy oraz timeline prac — bez zgadywania kolejności.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={routes.login}>Zaloguj się</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href={routes.register}>Załóż konto</Link>
        </Button>
      </div>
    </div>
  );
}
