"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function PayGlocalPanel() {
  const { watch } = useFormContext<PaymentsFormValues>();
  const enabled = !!watch("payglocal.enabled");

  return (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="text-sm font-semibold text-slate-900">
          PayGlocal online payments
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Accept supported online payment methods through PayGlocal with
          automatic payment status handling in WooCommerce.
        </p>
      </div>

      <p className="text-xs leading-5 text-slate-500">
        PayGlocal gateway credentials, signing keys and provider configuration
        are managed securely by LetzShopy and are not exposed in the vendor
        dashboard.
      </p>

      {enabled && (
        <div className="rounded-[18px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-800">
          PayGlocal is enabled for checkout on this store.
        </div>
      )}
    </div>
  );
}
