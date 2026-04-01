// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

/** Chromium / service worker / extension noise; not actionable app code (no match in repo or deps). */
function isMatchingIdUpdateNoise(value: unknown): boolean {
  const s =
    typeof value === "string"
      ? value
      : value != null &&
          typeof value === "object" &&
          "message" in value &&
          typeof (value as { message: unknown }).message === "string"
        ? (value as { message: string }).message
        : value != null
          ? String(value)
          : "";
  return (
    s.includes("Object Not Found Matching Id") &&
    s.includes("MethodName:update") &&
    s.includes("ParamCount:")
  );
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  ignoreErrors: [
    /Object Not Found Matching Id:.*MethodName:update.*ParamCount:/i,
  ],

  beforeSend(event, hint) {
    if (isMatchingIdUpdateNoise(hint.originalException)) {
      return null;
    }
    const first = event.exception?.values?.[0]?.value;
    if (first != null && isMatchingIdUpdateNoise(first)) {
      return null;
    }
    return event;
  },
});
