import SubscriptionInvoicesClient from "./SubscriptionInvoicesClient";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";

export const dynamic = "force-dynamic";

async function getInvoices(): Promise<SubscriptionInvoice[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/subscription-invoices`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Failed to load subscription invoices:", error);
    return [];
  }
}

export default async function SubscriptionBillsPage() {
  const invoices = await getInvoices();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            LetzShopy Subscription Invoices
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            View and download all paid subscription invoices for your LetzShopy
            plan. These invoices can be used for billing records and GST
            reference.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
          <div className="p-3 sm:p-4">
            <SubscriptionInvoicesClient invoices={invoices} />
          </div>
        </section>
      </div>
    </main>
  );
}