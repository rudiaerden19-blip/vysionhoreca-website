"use client";

import * as Sentry from "@sentry/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
      <h1 className="text-3xl font-bold mb-8">Sentry Test Pagina</h1>
      <p className="mb-8 text-gray-600">
        Klik op de knop hieronder om een test error naar Sentry te sturen.
      </p>
      <button
        type="button"
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        onClick={() => {
          Sentry.startSpan(
            {
              name: "Example Frontend Span",
              op: "test",
            },
            async () => {
              const res = await fetch("/api/sentry-example-api");
              if (!res.ok) {
                throw new Error("Sentry Example Frontend Error");
              }
            }
          );
        }}
      >
        Trigger Sentry Error
      </button>
    </div>
  );
}
