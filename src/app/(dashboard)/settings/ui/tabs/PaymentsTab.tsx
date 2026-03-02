"use client";

import React, { useEffect, useState } from "react";
import {
  useForm,
  FormProvider,
  type SubmitHandler,
} from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";

import EasebuzzPanel from "@/app/(dashboard)/settings/ui/payments/EasebuzzPanel";
import UPIPanel from "@/app/(dashboard)/settings/ui/payments/UPIPanel";
import BankTransferPanel from "@/app/(dashboard)/settings/ui/payments/BankTransferPanel";
import CODPanel from "@/app/(dashboard)/settings/ui/payments/CODPanel";

const DEFAULT_VALUES: PaymentsFormValues = {
  general: {
    enabled: true,
    default_status: "processing",
  },
  easebuzz: {
    enabled: false,
    mode: "test",
    merchant_key: "",
    salt: "",
    merchant_id: "",
    webhook_secret: "",
    hint: "easebuzz",
  },
  upi: {
    enabled: false,
    upi_id: "",
    upi_number: "",
    payee: "",
    qr: "no",
    time_min: "",
    notes: "",
    qr_src: "",
  },
  bank: {
    enabled: false,
    account_name: "",
    account_number: "",
    ifsc: "",
    bank: "",
    branch: "",
    notes: "",
  },
  cod: {
    enabled: false,
    notes: "",
  },
  cheque: {
    enabled: false,
    notes: "",
  },
};

export default function PaymentsTab() {
  const methods = useForm<PaymentsFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const { register, watch, handleSubmit, reset } = methods;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const paymentsEnabled = watch("general.enabled");

  // Load initial settings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        setSuccess(null);

        const res = await fetch("/api/payments/settings", {
          method: "GET",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.error || `Failed to load payments (${res.status})`
          );
        }

        const safe: PaymentsFormValues = {
          general: {
            enabled:
              data.general?.enabled !== undefined
                ? !!data.general.enabled
                : true,
            default_status: data.general?.default_status || "processing",
          },
          easebuzz: {
            enabled: !!data.easebuzz?.enabled,
            mode: data.easebuzz?.mode || "test",
            merchant_key: data.easebuzz?.merchant_key || "",
            salt: data.easebuzz?.salt || "",
            merchant_id: data.easebuzz?.merchant_id || "",
            webhook_secret: data.easebuzz?.webhook_secret || "",
            hint: data.easebuzz?.hint || "easebuzz",
          },
          upi: {
            enabled: !!data.upi?.enabled,
            upi_id: data.upi?.upi_id || "",
            upi_number: data.upi?.upi_number || "",
            payee: data.upi?.payee || "",
            qr: data.upi?.qr === "yes" ? "yes" : "no",
            time_min: data.upi?.time_min || "",
            notes: data.upi?.notes || "",
            qr_src: data.upi?.qr_src || "",
          },
          bank: {
            enabled: !!data.bank?.enabled,
            account_name: data.bank?.account_name || "",
            account_number: data.bank?.account_number || "",
            ifsc: data.bank?.ifsc || "",
            bank: data.bank?.bank || "",
            branch: data.bank?.branch || "",
            notes: data.bank?.notes || "",
          },
          cod: {
            enabled: !!data.cod?.enabled,
            notes: data.cod?.notes || "",
          },
          cheque: {
            enabled: !!data.cheque?.enabled,
            notes: data.cheque?.notes || "",
          },
        };

        if (!cancelled) {
          reset(safe);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load payments settings");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const onSubmit: SubmitHandler<PaymentsFormValues> = async (values) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch("/api/payments/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Failed to save (${res.status})`);
      }

      setSuccess("Payment settings saved successfully.");
      // scroll to top to show alert clearly
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Failed to save payments settings");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6 max-w-4xl">
          {/* Header */}
          <header className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  Payments & Checkout
                </h2>
                <p className="text-xs text-slate-500">
                  Configure online gateway, manual UPI, bank transfer and COD
                  for your store.
                </p>
              </div>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                disabled={saving || loading}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {success}
              </div>
            )}
          </header>

          {loading ? (
            <p className="text-sm text-slate-500">Loading payment settings…</p>
          ) : (
            <>
              {/* General toggle card */}
              <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        Payments
                      </h3>
                      <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Global
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Turn this off to temporarily stop accepting online
                      payments. You can still configure gateways below.
                    </p>
                  </div>

                  {/* toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      methods.setValue("general.enabled", !paymentsEnabled)
                    }
                    className={`relative flex h-6 w-11 items-center rounded-full border transition-colors ${
                      paymentsEnabled
                        ? "border-emerald-500 bg-emerald-500/90"
                        : "border-slate-300 bg-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        paymentsEnabled
                          ? "translate-x-[18px]"
                          : "translate-x-[2px]"
                      }`}
                    />
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-1">
                  <div className="max-w-xs">
                    <label
                      htmlFor="default_status"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Default order status on successful payment
                    </label>
                    <select
                      id="default_status"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      {...register("general.default_status")}
                    >
                      <option value="processing">
                        Processing (recommended)
                      </option>
                      <option value="on-hold">On hold</option>
                      <option value="pending">Pending payment</option>
                      <option value="completed">Completed</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-500">
                      This is the status set when the gateway confirms a
                      successful payment.
                    </p>
                  </div>
                </div>

                {!paymentsEnabled && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Payments are currently{" "}
                    <span className="font-semibold">disabled</span>. Customers
                    will see only offline/manual methods you enable at checkout.
                  </div>
                )}
              </section>

              {/* Gateways */}
              <section
                className={`space-y-4 transition-opacity ${
                  paymentsEnabled ? "" : "opacity-95"
                }`}
              >
                {/* Easebuzz */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="easebuzz_enabled"
                      className="flex items-center gap-2"
                    >
                      <input
                        id="easebuzz_enabled"
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("easebuzz.enabled")}
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-900">
                          Easebuzz (Online Gateway)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Card / UPI / Netbanking with automatic order status
                          updates via webhook.
                        </p>
                      </div>
                    </label>
                    <span className="rounded-full bg-indigo-50 px-2 py-[2px] text-[10px] font-medium text-indigo-700">
                      Recommended
                    </span>
                  </div>
                  <EasebuzzPanel />
                </div>

                {/* UPI manual */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="upi_enabled"
                      className="flex items-center gap-2"
                    >
                      <input
                        id="upi_enabled"
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("upi.enabled")}
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-900">
                          UPI (Manual confirmation)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Show your UPI ID / QR at checkout. You mark orders as
                          paid after checking your UPI app.
                        </p>
                      </div>
                    </label>
                    <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-medium text-slate-600">
                      No gateway charges
                    </span>
                  </div>
                  <UPIPanel />
                </div>

                {/* Bank transfer */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="bank_enabled"
                      className="flex items-center gap-2"
                    >
                      <input
                        id="bank_enabled"
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("bank.enabled")}
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-900">
                          Bank transfer
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Show account details for direct bank transfer. You
                          confirm payments manually in your bank app.
                        </p>
                      </div>
                    </label>
                  </div>
                  <BankTransferPanel />
                </div>

                {/* COD */}
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="cod_enabled"
                      className="flex items-center gap-2"
                    >
                      <input
                        id="cod_enabled"
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("cod.enabled")}
                      />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-900">
                          Cash on Delivery (COD)
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Allow customers to pay cash to courier on delivery.
                          Configure any extra instructions below.
                        </p>
                      </div>
                    </label>
                  </div>
                  <CODPanel />
                </div>
              </section>

              {/* Bottom CTA */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                  disabled={saving || loading}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </FormProvider>
  );
}
