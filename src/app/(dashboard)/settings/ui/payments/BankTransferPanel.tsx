"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

export default function BankTransferPanel() {
  const { register } = useFormContext<PaymentsFormValues>();

  return (
    <div className="space-y-4">
      {/* Row: Account name + number + IFSC */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="bank_account_name"
            className="block text-sm font-medium mb-1"
          >
            Account name
          </label>
          <input
            id="bank_account_name"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Account holder name"
            {...register("bank.account_name")}
          />
        </div>
        <div>
          <label
            htmlFor="bank_account_number"
            className="block text-sm font-medium mb-1"
          >
            Account number
          </label>
          <input
            id="bank_account_number"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="XXXXXXXXXXXX"
            {...register("bank.account_number")}
          />
        </div>
        <div>
          <label
            htmlFor="bank_ifsc"
            className="block text-sm font-medium mb-1"
          >
            IFSC
          </label>
          <input
            id="bank_ifsc"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="SBIN0000000"
            {...register("bank.ifsc")}
          />
        </div>
      </div>

      {/* Row: Bank + Branch */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="bank_bank"
            className="block text-sm font-medium mb-1"
          >
            Bank
          </label>
          <input
            id="bank_bank"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Bank name"
            {...register("bank.bank")}
          />
        </div>
        <div>
          <label
            htmlFor="bank_branch"
            className="block text-sm font-medium mb-1"
          >
            Branch
          </label>
          <input
            id="bank_branch"
            className="w-full border rounded-md px-3 py-2 text-sm"
            placeholder="Branch name"
            {...register("bank.branch")}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="bank_notes"
          className="block text-sm font-medium mb-1"
        >
          Notes (shown on Thank-you &amp; Email)
        </label>
        <textarea
          id="bank_notes"
          rows={3}
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Bank transfer instructions for the customer"
          {...register("bank.notes")}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Customers will see these instructions on checkout, thank-you page and
          in order emails.
        </p>
      </div>
    </div>
  );
}
