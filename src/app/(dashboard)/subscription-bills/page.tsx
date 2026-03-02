import { getAllSubscriptionInvoices } from "@/lib/subscription-invoices";
import SubscriptionInvoicesClient from "./SubscriptionInvoicesClient";

export const dynamic = "force-static";

export default async function SubscriptionBillsPage() {
  const invoices = getAllSubscriptionInvoices();

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            LetzShopy Subscription Invoices
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            View and download invoices for your LetzShopy yearly subscription
            payments. All charges are processed via Easebuzz AutoPay.
          </p>
        </header>

        {/* Table card */}
        <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100">
          <div className="p-3 sm:p-4">
            <SubscriptionInvoicesClient invoices={invoices} />
          </div>
        </section>
      </div>
    </main>
  );
}
