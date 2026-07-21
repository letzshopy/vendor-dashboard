"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function CustomerFeedbackError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Customer feedback route error", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-[28px] border border-rose-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="mt-4 text-xl font-semibold text-slate-900">
          Customer Feedback could not load
        </h1>

        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Your dashboard is still available. Try this page again, or return to
          the feedback list. Any unsaved feedback should be entered again only
          after the page has recovered.
        </p>

        {error.digest ? (
          <p className="mt-3 text-xs text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>

          <Link
            href="/sales/feedback"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
          >
            Back to feedback list
          </Link>
        </div>
      </section>
    </main>
  );
}
