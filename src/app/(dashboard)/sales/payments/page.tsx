import {
  redirect,
} from "next/navigation";
import {
  WalletCards,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  isCurrentStoreFeatureAllowed,
} from "@/lib/storeCapabilityServer";

import PaymentsLedgerClient from "./PaymentsLedgerClient";

export const dynamic =
  "force-dynamic";

export const metadata = {
  title: "Payments",
};

export default async function PaymentsPage() {
  const allowed =
    await isCurrentStoreFeatureAllowed(
      "payments"
    );

  if (!allowed) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <PageHeader
        className="hidden md:flex"
        eyebrow="Sales"
        icon={
          WalletCards
        }
        title="Payments"
        description="Track payment method, status and transaction reference for customer orders."
      />

      <div className="mb-3 md:hidden">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
          Sales
        </div>
        <h1 className="mt-0.5 text-[22px] font-extrabold tracking-tight text-heading">
          Payments
        </h1>
      </div>

      <div className="md:mt-5">
        <PaymentsLedgerClient />
      </div>
    </main>
  );
}
