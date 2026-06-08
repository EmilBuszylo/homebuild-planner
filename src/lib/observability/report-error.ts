import * as Sentry from "@sentry/nextjs";

export type ReportErrorContext = {
  route?: string;
  extra?: Record<string, unknown>;
};

export function reportError(
  error: unknown,
  context?: ReportErrorContext,
): void {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  try {
    if (context?.route || context?.extra) {
      Sentry.withScope((scope) => {
        if (context.route) {
          scope.setTag("route", context.route);
        }
        if (context.extra) {
          scope.setContext("report_error", context.extra);
        }
        Sentry.captureException(error);
      });
      return;
    }

    Sentry.captureException(error);
  } catch {
    // Never let observability break request handling.
  }
}
