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

/** Next.js / fetch annuleert requests bij navigatie of remount — geen applicatie-bug. */
function isBenignAbortError(value: unknown): boolean {
  if (value == null) return false;
  if (typeof DOMException !== "undefined" && value instanceof DOMException) {
    return value.name === "AbortError";
  }
  if (value instanceof Error && value.name === "AbortError") return true;
  const msg =
    value instanceof Error
      ? value.message
      : typeof value === "object" &&
          value !== null &&
          "message" in value &&
          typeof (value as { message: unknown }).message === "string"
        ? (value as { message: string }).message
        : String(value);
  return (
    /the operation was aborted/i.test(msg) ||
    /signal is aborted without reason/i.test(msg) ||
    /the user aborted a request/i.test(msg)
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
    /^AbortError$/,
    /the operation was aborted/i,
    /signal is aborted without reason/i,
    /the user aborted a request/i,
  ],

  beforeSend(event, hint) {
    if (isBenignAbortError(hint.originalException)) {
      return null;
    }
    if (isMatchingIdUpdateNoise(hint.originalException)) {
      return null;
    }
    const first = event.exception?.values?.[0];
    const val = first?.value;
    const typ = first?.type;
    if (typ === "AbortError" || (typeof val === "string" && isBenignAbortError(val))) {
      return null;
    }
    if (val != null && isMatchingIdUpdateNoise(val)) {
      return null;
    }
    return event;
  },
});
