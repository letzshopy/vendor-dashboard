"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useForm,
  FormProvider,
  type SubmitHandler,
} from "react-hook-form";
import type { PaymentsFormValues } from "@/types/payments";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Landmark,
  Save,
  Settings2,
  Smartphone,
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

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative flex h-7 w-12 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

function StatusPill({
  active,
  labelOn = "Enabled",
  labelOff = "Off",
}: {
  active: boolean;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {active ? labelOn : labelOff}
    </span>
  );
}

function GlobalPaymentsCard({
  enabled,
  onToggle,
  showAdvanced,
  onToggleAdvanced,
  register,
}: {
  enabled: boolean;
  onToggle: () => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  register: ReturnType<typeof useForm<PaymentsFormValues>>["register"];
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Settings2 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  Accept payments
                </h3>
                <StatusPill
                  active={enabled}
                  labelOn="Accepting"
                  labelOff="Stopped"
                />
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Turn this on to show payment methods at checkout. Turn off to
                temporarily hide all payment options.
              </p>
            </div>
          </div>

          <Toggle checked={enabled} onChange={onToggle} />
        </div>

        {enabled && (
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/85 p-3">
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Advanced order status
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Optional: choose order status after confirmed successful
                  payment.
                </p>
              </div>

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              />
            </button>

            {showAdvanced && (
              <div className="mt-4 max-w-md">
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
                  <option value="processing">Processing recommended</option>
                  <option value="on-hold">On hold</option>
                  <option value="pending">Pending payment</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            )}
          </div>
        )}

        {!enabled && (
          <div className="mt-4 rounded-[20px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Payments are currently disabled. Your saved UPI, bank, COD and
            gateway settings will remain safe, but checkout payment methods will
            be hidden.
          </div>
        )}
      </div>
    </section>
  );
}

function MethodCard({
  icon,
  title,
  description,
  badge,
  enabled,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[26px] border bg-white shadow-sm transition ${
        enabled
          ? "border-indigo-200 ring-1 ring-indigo-100"
          : "border-slate-200"
      }`}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-start gap-3 text-left"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                enabled
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 text-indigo-600"
              }`}
            >
              {icon}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                  {title}
                </h3>
                <StatusPill active={enabled} />
                {badge}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                {description}
              </p>
            </div>
          </button>

          <Toggle checked={enabled} onChange={onToggle} />
        </div>
      </div>

      {enabled && (
        <div className="border-t border-slate-100 bg-slate-50/60 p-4 md:p-5">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
            {children}
          </div>
        </div>
      )}
    </section>
  );
}

export default function PaymentsTab() {
  const methods = useForm<PaymentsFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty },
  } = methods;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGlobalAdvanced, setShowGlobalAdvanced] = useState(false);

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
          cache: "no-store",
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

  function toggleField(path: keyof PaymentsFormValues | string, value: boolean) {
    setValue(path as any, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }

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

      const saved = (data?.settings || payload) as PaymentsFormValues;

      reset(saved);
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
                  First enable payments. Then choose only the payment methods
                  you want to configure.
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
              Loading payment settings...
            </div>
          ) : (
            <>
              <GlobalPaymentsCard
                enabled={!!paymentsEnabled}
                onToggle={() =>
                  toggleField("general.enabled", !paymentsEnabled)
                }
                showAdvanced={showGlobalAdvanced}
                onToggleAdvanced={() =>
                  setShowGlobalAdvanced((prev) => !prev)
                }
                register={register}
              />

              {paymentsEnabled && (
                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Choose payment methods
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                          Switch on only the method you want. Its setup form
                          will open below that method.
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {enabledCount} active
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 md:p-5">
                    <MethodCard
                      icon={<CreditCard className="h-5 w-5" />}
                      title="Easebuzz gateway"
                      description="Accept UPI, cards and netbanking with automatic payment confirmation."
                      enabled={!!easebuzzEnabled}
                      onToggle={() =>
                        toggleField("easebuzz.enabled", !easebuzzEnabled)
                      }
                      badge={
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                          Recommended
                        </span>
                      }
                    >
                      <EasebuzzPanel />
                    </MethodCard>

                    <MethodCard
                      icon={<Smartphone className="h-5 w-5" />}
                      title="UPI manual payment"
                      description="Show UPI ID / QR at checkout and verify payments manually."
                      enabled={!!upiEnabled}
                      onToggle={() => toggleField("upi.enabled", !upiEnabled)}
                      badge={
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                          No gateway charges
                        </span>
                      }
                    >
                      <div className="space-y-4">
                        <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/70 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                Payment screenshot proof
                              </div>
                              <p className="mt-1 text-xs leading-5 text-slate-600">
                                Enable this if customers should upload payment
                                screenshot on the thank-you page before manual
                                verification.
                              </p>
                            </div>

                            <Toggle
                              checked={!!requireScreenshot}
                              onChange={() =>
                                toggleField(
                                  "upi.require_screenshot",
                                  !requireScreenshot
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
                              ? "Screenshot upload is ON. Customer will see proof upload block."
                              : "Screenshot upload is OFF. Verify using transaction number only."}
                          </div>
                        </div>

                        <UPIPanel />
                      </div>
                    </MethodCard>

                    <MethodCard
                      icon={<Landmark className="h-5 w-5" />}
                      title="Bank transfer"
                      description="Show bank account details for direct account transfer."
                      enabled={!!bankEnabled}
                      onToggle={() =>
                        toggleField("bank.enabled", !bankEnabled)
                      }
                    >
                      <BankTransferPanel />
                    </MethodCard>

                    <MethodCard
                      icon={<Banknote className="h-5 w-5" />}
                      title="Cash on Delivery"
                      description="Allow customers to place an order and pay at delivery."
                      enabled={!!codEnabled}
                      onToggle={() => toggleField("cod.enabled", !codEnabled)}
                    >
                      <CODPanel />
                    </MethodCard>
                  </div>
                </section>
              )}

              <div className="sticky bottom-3 z-10 md:bottom-4">
                <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {isDirty ? "Unsaved payment changes" : "All changes saved"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Save to apply payment changes to checkout.
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                      disabled={saving || loading || !isDirty}
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