"use client";

import {
  ShieldCheck,
  WalletCards,
} from "lucide-react";

export default function ZohoPaymentsPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl bg-surface-soft px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <div className="text-sm font-bold text-heading">
            Zoho Payments online payments
          </div>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Secure checkout with automatic WooCommerce payment confirmation.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3">
        <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-5 text-muted-foreground">
          Transaction fees, net settlement amount and payout status can be shown in the LetzShopy payment dashboard when the required Zoho read authorization is available.
        </p>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Gateway credentials and OAuth tokens stay securely in WordPress and Zoho. They are never shown in the vendor dashboard.
      </p>
    </div>
  );
}
