import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright uses 127.0.0.1; dev HMR and server actions need this host allowed.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async rewrites() {
    return [
      { source: "/logowanie", destination: "/login" },
      { source: "/rejestracja", destination: "/register" },
      { source: "/panel", destination: "/dashboard" },
      { source: "/ankieta", destination: "/questionnaire" },
      { source: "/moj-plan/:planId", destination: "/plan/:planId" },
    ];
  },
};

const hasSentryUpload = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !hasSentryUpload,
  },
  release: {
    create: hasSentryUpload,
    finalize: hasSentryUpload,
  },
  bundleSizeOptimizations: {
    excludeTracing: true,
  },
});
