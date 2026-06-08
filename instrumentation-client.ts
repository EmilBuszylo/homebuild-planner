import * as Sentry from "@sentry/nextjs";

import { scrubPiiBeforeSend } from "./sentry.shared";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  beforeSend: scrubPiiBeforeSend,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
