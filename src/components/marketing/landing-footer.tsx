import Link from "next/link";

import { ORIENTATIONAL_FOOTER_LINE } from "@/lib/copy/orientational";
import { routes } from "@/lib/routes";

export function LandingFooter() {
  return (
    <footer className="border-t py-12">
      <div className="mx-auto max-w-6xl px-6 text-center text-sm text-muted-foreground">
        <p className="mb-4">{ORIENTATIONAL_FOOTER_LINE}</p>
        <p>
          <Link
            href={routes.login}
            className="rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Masz już konto? Zaloguj się
          </Link>
        </p>
      </div>
    </footer>
  );
}
