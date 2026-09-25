"use client";

import {
  ShieldCheck,
} from "lucide-react";

export default function PayGlocalPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl bg-surface-soft px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>

        <div className="min-w-0">
          <div className="text-sm font-bold text-heading">
            PayGlocal online payments
          </div>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Automatic payment confirmation and WooCommerce order updates.
          </p>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Gateway credentials and technical integration are managed securely by LetzShopy and are not shown in the vendor dashboard.
      </p>
    </div>
  );
}
