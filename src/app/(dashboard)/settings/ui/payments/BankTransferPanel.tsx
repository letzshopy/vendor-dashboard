"use client";

import {
  useFormContext,
} from "react-hook-form";

import {
  Input,
} from "@/components/ui/input";
import type {
  PaymentsFormValues,
} from "@/types/payments";

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function BankTransferPanel() {
  const {
    register,
  } =
    useFormContext<PaymentsFormValues>();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Account holder">
          <Input
            placeholder="Account holder name"
            {...register(
              "bank.account_name"
            )}
          />
        </Field>

        <Field label="Account number">
          <Input
            inputMode="numeric"
            placeholder="XXXXXXXXXXXX"
            {...register(
              "bank.account_number"
            )}
          />
        </Field>

        <Field label="IFSC">
          <Input
            placeholder="SBIN0000000"
            {...register(
              "bank.ifsc"
            )}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Bank">
          <Input
            placeholder="Bank name"
            {...register(
              "bank.bank"
            )}
          />
        </Field>

        <Field label="Branch">
          <Input
            placeholder="Branch name"
            {...register(
              "bank.branch"
            )}
          />
        </Field>
      </div>

      <Field label="Customer instructions">
        <textarea
          rows={3}
          className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          placeholder="Bank transfer instructions shown after order placement"
          {...register(
            "bank.notes"
          )}
        />

        <p className="mt-1.5 text-xs text-muted-foreground">
          Shown on checkout, thank-you page and order email.
        </p>
      </Field>
    </div>
  );
}
