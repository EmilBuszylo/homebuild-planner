import Link from "next/link";

import { routes } from "@/lib/routes";

export function LandingFooter() {
  return (
    <footer className="border-t py-8">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
        <p className="mb-4">
          Wyceny i harmonogramy w aplikacji mają charakter orientacyjny i nie
          stanowią oferty handlowej ani wiążącego kosztorysu wykonawcy.
        </p>
        <p>
          <Link
            href={routes.login}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Masz już konto? Zaloguj się
          </Link>
        </p>
      </div>
    </footer>
  );
}
