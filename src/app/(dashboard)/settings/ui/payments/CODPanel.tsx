"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function CODPanel() {
  const { register } = useFormContext<PaymentsFormValues>();

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="cod_notes"
          className="block text-sm font-medium mb-1"
        >
          Notes (shown on Thank-you &amp; Email)
        </label>
        <textarea
          id="cod_notes"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="COD instructions for the customer"
          {...register("cod.notes")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Customers will see these instructions on checkout, thank-you page and
          in order emails when they choose Cash on Delivery.
        </p>
      </div>
    </div>
  );
}
