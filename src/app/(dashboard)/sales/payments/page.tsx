import { redirect } from "next/navigation";
import { WalletCards } from "lucide-react";

import { isCurrentStoreFeatureAllowed } from "@/lib/storeCapabilityServer";
import PaymentsLedgerClient from "./PaymentsLedgerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments",
};

export default async function PaymentsPage() {
  const allowed =
    await isCurrentStoreFeatureAllowed(
      "payments"
    );

  if (!allowed) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      <header className="mb-5 hidden items-end justify-between gap-5 md:flex">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">
            <WalletCards className="h-4 w-4" />
            Sales
          </div>

          <h1 className="mt-1.5 text-[30px] font-bold tracking-tight text-slate-950">
            Payments
          </h1>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Review payment methods, payment status and transaction references
            across your orders. PayGlocal status is checked only when you ask
            for a live update.
          </p>
        </div>
      </header>

      <PaymentsLedgerClient />
    </main>
  );
}
