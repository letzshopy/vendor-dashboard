import SubscriptionInvoicesClient from "./SubscriptionInvoicesClient";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";
import { ReceiptText } from "lucide-react";

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
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <ReceiptText className="h-3.5 w-3.5" />
              Subscription Bills
            </div>

            <h1 className="mt-3 text-[24px] font-semibold tracking-tight text-slate-900 md:text-[30px]">
              Subscription Invoices
            </h1>
          </div>

          <div className="shrink-0 rounded-[20px] bg-white/90 px-4 py-3 text-right shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Total
            </div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {invoices.length}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <SubscriptionInvoicesClient invoices={invoices} />
      </section>
    </main>
  );
}