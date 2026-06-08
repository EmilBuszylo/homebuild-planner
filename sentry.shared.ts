import type { ErrorEvent } from "@sentry/nextjs";

/** Strip email from Sentry user context — keep opaque user id for correlation. */
export function scrubPiiBeforeSend(event: ErrorEvent): ErrorEvent | null {
  if (event.user?.email) {
    delete event.user.email;
  }
  return event;
}
