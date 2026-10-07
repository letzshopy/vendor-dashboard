"use client";

import {
  useFormContext,
} from "react-hook-form";

import type {
  PaymentsFormValues,
} from "@/types/payments";

export default function CODPanel() {
  const {
    register,
  } =
    useFormContext<PaymentsFormValues>();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        Customer instructions
      </label>

      <textarea
        rows={3}
        className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
        placeholder="Example: Keep exact cash ready at delivery"
        {...register(
          "cod.notes"
        )}
      />

      <p className="mt-1.5 text-xs text-muted-foreground">
        Shown when the customer chooses Cash on Delivery.
      </p>
    </div>
  );
}
