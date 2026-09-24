"use client";

import { ShieldCheck } from "lucide-react";

export default function PayGlocalPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-[18px] border border-indigo-100 bg-indigo-50/70 p-4">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
          <ShieldCheck className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            PayGlocal online payments
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            PayGlocal is the supported online payment gateway for LetzShopy
            stores. Use the payment-method switch above to show or hide it at
            checkout.
          </p>
        </div>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        Gateway credentials and technical integration are managed securely by
        LetzShopy and are not displayed in the vendor dashboard. Successful
        gateway payments are reflected automatically in WooCommerce orders.
      </p>
    </div>
  );
}
