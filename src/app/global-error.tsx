"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

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
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8">
          <h1 className="text-3xl font-bold mb-4 text-red-600">Er ging iets mis</h1>
          <p className="text-gray-600 mb-8">
            We hebben het probleem automatisch gemeld en werken aan een oplossing.
          </p>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => reset()}
          >
            Probeer opnieuw
          </button>
        </div>
      </body>
    </html>
  );
}
