import { notFound } from "next/navigation";
import {
  getSubscriptionInvoiceById,
  SubscriptionInvoice,
} from "@/lib/subscription-invoices";
import InvoiceDetailClient from "./InvoiceDetailClient";

export default async function SubscriptionInvoiceDetailPage({
  params,
}: {
  // ✅ Next 15: params is a Promise
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = getSubscriptionInvoiceById(id);

  if (!invoice) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white print:bg-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <InvoiceDetailClient invoice={invoice as SubscriptionInvoice} />
      </div>
    </main>
  );
}
