"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useForm,
  FormProvider,
  type SubmitHandler,
} from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";
import {
  Banknote,
  CreditCard,
  Landmark,
  Save,
  Settings2,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
    require_screenshot: true,
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

function SectionCard({
  icon,
  title,
  description,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              {icon}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                {description}
              </p>
            </div>
          </div>

          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative flex h-7 w-12 items-center rounded-full border transition-colors ${
        checked
          ? "border-emerald-500 bg-emerald-500"
          : "border-slate-300 bg-slate-200"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[25px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

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
  const easebuzzEnabled = watch("easebuzz.enabled");
  const upiEnabled = watch("upi.enabled");
  const bankEnabled = watch("bank.enabled");
  const codEnabled = watch("cod.enabled");
  const requireScreenshot = watch("upi.require_screenshot");

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
            require_screenshot:
              data.upi?.require_screenshot !== undefined
                ? !!data.upi.require_screenshot
                : data.upi?.screenshot_upload !== undefined
                ? !!data.upi.screenshot_upload
                : true,
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

  const enabledCount = useMemo(() => {
    let count = 0;
    if (easebuzzEnabled) count += 1;
    if (upiEnabled) count += 1;
    if (bankEnabled) count += 1;
    if (codEnabled) count += 1;
    return count;
  }, [easebuzzEnabled, upiEnabled, bankEnabled, codEnabled]);

  const onSubmit: SubmitHandler<PaymentsFormValues> = async (values) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: PaymentsFormValues = {
        ...values,
        upi: {
          ...values.upi,
          require_screenshot: !!values.upi.require_screenshot,
        },
      };

      const res = await fetch("/api/payments/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Failed to save (${res.status})`);
      }

      setSuccess("Payment settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccess(null), 3500);
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
        <div className="space-y-4 p-3 md:space-y-5 md:p-5">
          {success && (
            <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
              <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
                {success}
              </div>
            </div>
          )}

          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">
                  Payments & Checkout
                </div>
                <div className="mt-1 text-xs text-slate-500 md:text-sm">
                  Configure online gateway, manual UPI, bank transfer and COD
                  for your store.
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Loading payment settings...
            </div>
          ) : (
            <>
              <SectionCard
                icon={<Settings2 className="h-5 w-5" />}
                title="Global payment settings"
                description="Control whether payments are enabled and which status should be used after successful payment."
                badge={
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {enabledCount} active
                  </span>
                }
              >
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Accept payments
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Turn this off to temporarily stop accepting payment
                        methods at checkout.
                      </p>
                    </div>

                    <Toggle
                      checked={paymentsEnabled}
                      onChange={() =>
                        methods.setValue("general.enabled", !paymentsEnabled)
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="max-w-md">
                    <label
                      htmlFor="default_status"
                      className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Default order status after successful payment
                    </label>
                    <select
                      id="default_status"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                      {...register("general.default_status")}
                    >
                      <option value="processing">
                        Processing (recommended)
                      </option>
                      <option value="on-hold">On hold</option>
                      <option value="pending">Pending payment</option>
                      <option value="completed">Completed</option>
                    </select>
                    <p className="mt-2 text-xs text-slate-500">
                      This status is applied after confirmed successful payment.
                    </p>
                  </div>
                </div>

                {!paymentsEnabled && (
                  <div className="rounded-[20px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Payments are currently disabled. You can still configure all
                    methods below and enable them later.
                  </div>
                )}
              </SectionCard>

              <SectionCard
                icon={<CreditCard className="h-5 w-5" />}
                title="Easebuzz gateway"
                description="Accept UPI, cards and netbanking with automatic payment confirmation."
                badge={
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                    Recommended
                  </span>
                }
              >
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Enable Easebuzz
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Best option for automatic payment success updates and a
                        smoother customer checkout experience.
                      </p>
                    </div>

                    <label className="mt-0.5 inline-flex items-center">
                      <input
                        id="easebuzz_enabled"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("easebuzz.enabled")}
                      />
                    </label>
                  </div>
                </div>

                <EasebuzzPanel />
              </SectionCard>

              <SectionCard
                icon={<Smartphone className="h-5 w-5" />}
                title="UPI manual payment"
                description="Show UPI details or QR at checkout and verify payments manually."
                badge={
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    No gateway charges
                  </span>
                }
              >
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Enable UPI
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Customers pay using UPI and you verify the payment
                        inside orders.
                      </p>
                    </div>

                    <label className="mt-0.5 inline-flex items-center">
                      <input
                        id="upi_enabled"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("upi.enabled")}
                      />
                    </label>
                  </div>
                </div>

                {upiEnabled && (
                  <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/70 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          Payment screenshot proof
                        </div>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          Enable this if you want customers to upload payment
                          screenshot on the thank-you page before you verify the
                          UPI payment.
                        </p>
                      </div>

                      <Toggle
                        checked={!!requireScreenshot}
                        onChange={() =>
                          methods.setValue(
                            "upi.require_screenshot",
                            !requireScreenshot,
                            { shouldDirty: true }
                          )
                        }
                      />
                    </div>

                    <input
                      type="hidden"
                      {...register("upi.require_screenshot")}
                    />

                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                      {requireScreenshot
                        ? "Screenshot upload is ON. Customers will see a payment proof upload block."
                        : "Screenshot upload is OFF. You will verify using transaction number only."}
                    </div>
                  </div>
                )}

                <UPIPanel />
              </SectionCard>

              <SectionCard
                icon={<Landmark className="h-5 w-5" />}
                title="Bank transfer"
                description="Show bank account details so customers can transfer directly and you confirm manually."
              >
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Enable bank transfer
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Useful for large orders or customers who prefer direct
                        account transfer.
                      </p>
                    </div>

                    <label className="mt-0.5 inline-flex items-center">
                      <input
                        id="bank_enabled"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("bank.enabled")}
                      />
                    </label>
                  </div>
                </div>

                <BankTransferPanel />
              </SectionCard>

              <SectionCard
                icon={<Banknote className="h-5 w-5" />}
                title="Cash on Delivery"
                description="Allow customers to place an order and pay the courier at delivery."
              >
                <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Enable COD
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Good for trust-building, but use only if your shipping
                        flow supports cash collection.
                      </p>
                    </div>

                    <label className="mt-0.5 inline-flex items-center">
                      <input
                        id="cod_enabled"
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        {...register("cod.enabled")}
                      />
                    </label>
                  </div>
                </div>

                <CODPanel />
              </SectionCard>

              <div className="sticky bottom-3 z-10 md:bottom-4">
                <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        Save payment configuration
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Review the enabled methods and save to apply them to
                        checkout.
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                      disabled={saving || loading}
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </form>
    </FormProvider>
  );
}