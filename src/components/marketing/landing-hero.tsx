import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  return (
    <section className="border-b">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-20">
        <div className="flex min-w-0 flex-col gap-6">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Orientacyjny kosztorys i harmonogram budowy domu
          </h1>
          <p className="text-lg text-muted-foreground">
            Odpowiedz na ankietę o swoim projekcie — otrzymasz wstępny podział
            kosztów na etapy budowy i uporządkowany timeline prac. Bez
            zgadywania kolejności ekip i bez wiążącej oferty na start.
          </p>
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
        </div>
        <div className="relative hidden aspect-[4/3] overflow-hidden rounded-xl bg-muted lg:block">
          <Image
            src="/auth-hero.png"
            alt="Ilustracja — budowa domu"
            fill
            className="object-cover dark:brightness-[0.2] dark:grayscale"
            sizes="(min-width: 1024px) 50vw, 0px"
            priority
          />
        </div>
      </div>
    </section>
  );
}
