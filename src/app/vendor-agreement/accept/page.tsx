"use client";

import { useState } from "react";
import Link from "next/link";

export default function VendorAgreementAcceptPage() {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    if (!checked) {
      setError("Please confirm that you have read and agree to the Vendor Agreement.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/account/accept-agreement", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Could not save agreement acceptance.");
      }

      window.location.href = "/dashboard";
    } catch (e: any) {
      setError(e?.message || "Could not save agreement acceptance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f6f4ff] via-white to-[#fff7fb] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">
            Vendor Agreement
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Before accessing your dashboard for the first time, please review and
            accept the Vendor Agreement. This acceptance is required for Store Owner access.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="leading-relaxed">
            By accepting, you confirm that you understand your responsibilities as
            an independent vendor using LetzShopy as a SaaS platform.
          </p>

          <div className="mt-3">
            <Link
              href="/vendor-agreement"
              target="_blank"
              className="font-medium text-indigo-600 underline underline-offset-2"
            >
              Read full Vendor Agreement
            </Link>
          </div>
        </div>

        <label className="mt-6 flex items-start gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            I confirm that I have read and agree to the Vendor Agreement.
          </span>
        </label>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAccept}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "I Agree & Continue"}
          </button>

          <Link
            href="/signin"
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}