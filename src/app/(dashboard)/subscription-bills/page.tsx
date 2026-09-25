import {
  ReceiptText,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  getBillingInvoices,
} from "@/lib/subscriptionInvoiceServer";

import SubscriptionInvoicesClient from "./SubscriptionInvoicesClient";

export const dynamic =
  "force-dynamic";

async function getInvoices() {
  try {
    return await getBillingInvoices();
  } catch (
    error: unknown
  ) {
    console.error(
      "Failed to load billing invoices:",
      error instanceof
        Error
        ? error.message
        : "Unknown error"
    );

    return [];
  }
}

export default async function SubscriptionBillsPage() {
  const invoices =
    await getInvoices();

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Reports & Billing"
        icon={ReceiptText}
        title="Subscription Invoices"
        description="View paid subscription and domain-renewal invoices."
      />

      <div className="md:mt-5">
        <SubscriptionInvoicesClient
          invoices={
            invoices
          }
        />
      </div>
    </main>
  );
}
