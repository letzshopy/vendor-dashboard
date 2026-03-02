"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function EasebuzzPanel() {
  const { register, watch } = useFormContext<PaymentsFormValues>();

  // True/false for conditional section
  const enabled = !!watch("easebuzz.enabled");

  return (
    <div className="space-y-2 border rounded-lg p-3 bg-slate-50">
      {/* Enable toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="easebuzz-enabled"
          className="h-4 w-4"
          {...register("easebuzz.enabled")}
        />
        <label htmlFor="easebuzz-enabled" className="font-medium">
          Enable Easebuzz (online payments)
        </label>
      </div>

      <p className="text-[11px] text-slate-600">
        Customers can pay online via cards, UPI, netbanking etc. using
        Easebuzz. Make sure the credentials match the domain configured in
        your Easebuzz account.
      </p>

      {/* Settings only visible when enabled */}
      {enabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mt-1">
          <div className="space-y-1">
            <label className="block font-medium" htmlFor="easebuzz-mode">
              Mode
            </label>
            <select
              id="easebuzz-mode"
              className="border rounded px-2 py-1 w-full"
              {...register("easebuzz.mode")}
            >
              <option value="test">Test (Sandbox)</option>
              <option value="live">Live</option>
            </select>
          </div>

          <div className="space-y-1">
            <label
              className="block font-medium"
              htmlFor="easebuzz-merchant-key"
            >
              Merchant Key
            </label>
            <input
              id="easebuzz-merchant-key"
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder="Your Easebuzz key"
              {...register("easebuzz.merchant_key")}
            />
          </div>

          <div className="space-y-1">
            <label className="block font-medium" htmlFor="easebuzz-salt">
              Salt
            </label>
            <input
              id="easebuzz-salt"
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder="Salt"
              {...register("easebuzz.salt")}
            />
          </div>

          <div className="space-y-1">
            <label
              className="block font-medium"
              htmlFor="easebuzz-merchant-id"
            >
              Merchant ID
            </label>
            <input
              id="easebuzz-merchant-id"
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder="Your merchant ID"
              {...register("easebuzz.merchant_id")}
            />
          </div>

          <div className="space-y-1">
            <label
              className="block font-medium"
              htmlFor="easebuzz-webhook-secret"
            >
              Webhook Secret
            </label>
            <input
              id="easebuzz-webhook-secret"
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder="Secret for verifying webhooks"
              {...register("easebuzz.webhook_secret")}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="block font-medium" htmlFor="easebuzz-hint">
              Gateway hint / ID (optional)
            </label>
            <input
              id="easebuzz-hint"
              type="text"
              className="border rounded px-2 py-1 w-full"
              placeholder='e.g. "easebuzz" – helps auto-detect gateway ID'
              {...register("easebuzz.hint")}
            />
          </div>
        </div>
      )}
    </div>
  );
}
