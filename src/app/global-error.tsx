"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pl">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-6 font-sans text-foreground antialiased">
        <h1 className="text-2xl font-bold tracking-tight">
          Coś poszło nie tak
        </h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub wróć na stronę
          główną.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Spróbuj ponownie
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium"
          >
            Strona główna
          </Link>
        </div>
      </body>
    </html>
  );
}
