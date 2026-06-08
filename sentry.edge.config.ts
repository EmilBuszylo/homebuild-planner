import * as Sentry from "@sentry/nextjs";

import { scrubPiiBeforeSend } from "./sentry.shared";

const dsn = process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0,
  beforeSend: scrubPiiBeforeSend,
});
