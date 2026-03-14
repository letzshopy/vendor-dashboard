import { notFound } from "next/navigation";
import type { SubscriptionInvoice } from "@/lib/subscription-invoices";
import InvoiceDetailClient from "./InvoiceDetailClient";

export const dynamic = "force-dynamic";

async function getInvoice(id: string): Promise<SubscriptionInvoice | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/subscription-invoices/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data ?? null;
  } catch (error) {
    console.error("Failed to load subscription invoice:", error);
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
    <main className="min-h-screen bg-gradient-to-b from-[#f7f3ff] via-[#f8fbff] to-white print:bg-white">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <InvoiceDetailClient invoice={invoice} />
      </div>
    </main>
  );
}