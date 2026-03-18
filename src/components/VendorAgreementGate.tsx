"use client";

import { useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

export default function VendorAgreementGate() {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const agreementSections = useMemo(
    () => [
      {
        title: "1. Agreement Overview",
        body:
          "By accessing and using LetzShopy as a Store Owner, you agree to operate your store as an independent business and to comply with this Vendor Agreement.",
      },
      {
        title: "2. Independent Business Model",
        body:
          "LetzShopy is a Software-as-a-Service platform. It provides technology infrastructure for your store and does not act as a marketplace, reseller, or intermediary for your products.",
      },
      {
        title: "3. Product and Order Responsibility",
        body:
          "You are solely responsible for product listings, pricing, stock, taxes, order fulfillment, delivery, customer communication, cancellations, and refunds relating to your store.",
      },
      {
        title: "4. Payment Responsibility",
        body:
          "Payments received from customers belong to the Vendor. LetzShopy only provides technical infrastructure and does not assume ownership of customer transactions.",
      },
      {
        title: "5. GST and Tax Compliance",
        body:
          "You are solely responsible for your GST status, invoicing, filings, and all tax compliance obligations applicable to your business.",
      },
      {
        title: "6. Acceptable Use",
        body:
          "You agree not to use the platform for unlawful, fraudulent, misleading, infringing, or prohibited activities.",
      },
      {
        title: "7. Limitation of Liability",
        body:
          "LetzShopy shall not be liable for vendor-side losses, customer disputes, tax disputes, order issues, shipping delays, or business damages arising from your store operations.",
      },
      {
        title: "8. Suspension and Termination",
        body:
          "LetzShopy may suspend or restrict access for non-payment, fraud, abuse, or policy violations.",
      },
    ],
    []
  );

  async function handleAccept() {
    if (!checked) {
      setError("Please confirm that you have read and agree to the Vendor Agreement.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/account/accept-agreement", {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Could not save agreement acceptance.");
      }

      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Could not save agreement acceptance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.28)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-[#27346D] via-[#31418a] to-[#7c3aed] px-6 py-5 text-white">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-2xl bg-white/12 p-2">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Vendor Agreement</h2>
              <p className="mt-1 text-sm text-indigo-100/90">
                Before using your dashboard for the first time, please review and
                accept the Vendor Agreement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-slate-700">
            This agreement is mandatory for Store Owner access. You will not be
            able to use the dashboard until acceptance is completed.
          </div>

          <div className="space-y-4">
            {agreementSections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-sm font-semibold text-slate-900">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {section.body}
                </p>
              </div>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              By clicking <span className="font-medium text-slate-900">I Agree &amp; Continue</span>,
              you confirm that you have read, understood, and accepted this Vendor
              Agreement for your LetzShopy store account.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-6 py-4">
          <label className="flex items-start gap-3 text-sm text-slate-700">
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
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleAccept}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:from-[#5b21b6] hover:to-[#6d28d9] disabled:opacity-60"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "I Agree & Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}