import { notFound } from "next/navigation";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";
import { getBillingInvoices } from "@/lib/subscriptionInvoiceServer";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = "force-dynamic";

async function getInvoice(id: string): Promise<SubscriptionInvoice | null> {
  try {
    const invoices = await getBillingInvoices();
    return invoices.find((invoice) => invoice.id === id) || null;
  } catch (error: unknown) {
    console.error(
      "Failed to load billing invoice:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}

export default async function SubscriptionInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-5xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5 print:bg-white">
      <InvoiceDetailClient invoice={invoice} />
    </main>
  );
}
