// src/app/support/tickets/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Support Tickets | LetzShopy Vendor Help",
};

const SUPPORT_URL =
  process.env.NEXT_PUBLIC_VENDOR_SUPPORT_URL ||
  "https://letzshopy.in/vendor-support/"; // fallback if env not set

function TicketsContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Support Tickets
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Need help with your LetzShopy store or dashboard? Open a support
              ticket and our team will assist you.
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Left: summary & instructions */}
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              How support works
            </h2>
            <p className="text-sm text-slate-600">
              Tickets are handled by the LetzShopy team. Use this portal for
              any issues related to:
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
              <li>Store setup, design and onboarding</li>
              <li>Orders, checkout, shipping or payment issues</li>
              <li>Vendor dashboard bugs or error messages</li>
              <li>Billing, subscription or WhatsApp add-ons</li>
            </ul>

            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-medium text-slate-800">
                Tips for faster resolution:
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Mention your <strong>Store URL</strong> (e.g.{" "}
                  <span className="font-mono text-xs">
                    demo.letzshopy.in
                  </span>
                  )
                </li>
                <li>
                  Add your <strong>order number</strong> if it’s order-related
                </li>
                <li>Attach screenshots or screen recordings if possible</li>
              </ul>
            </div>
          </section>

          {/* Right: CTA card */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-900">
                Open Support Portal
              </h2>
              <p className="text-sm text-slate-600">
                You&apos;ll be taken to the LetzShopy Support Portal in a new
                tab, where you can view your existing tickets or create a new
                one.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <a
                href={SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                Go to Support Portal
              </a>
              <p className="text-[11px] leading-relaxed text-slate-500">
                The portal uses your email address from LetzShopy. If you
                don&apos;t have an account there yet, you can sign up directly
                on the Support Portal page.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
            Loading support tickets…
          </div>
        </div>
      }
    >
      <TicketsContent />
    </Suspense>
  );
}
