"use client";

import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FormProvider,
  type SubmitHandler,
  useForm,
} from "react-hook-form";
import {
  AlertCircle,
  Banknote,
  ChevronDown,
  CreditCard,
  Landmark,
  Settings2,
  Smartphone,
} from "lucide-react";

import PayGlocalPanel from "@/app/(dashboard)/settings/ui/payments/PayGlocalPanel";
import UPIPanel from "@/app/(dashboard)/settings/ui/payments/UPIPanel";
import BankTransferPanel from "@/app/(dashboard)/settings/ui/payments/BankTransferPanel";
import CODPanel from "@/app/(dashboard)/settings/ui/payments/CODPanel";
import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  Switch,
} from "@/components/ui/switch";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  PaymentsFormValues,
} from "@/types/payments";

const DEFAULT_VALUES:
  PaymentsFormValues = {
  general: {
    enabled: true,
    default_status:
      "processing",
  },
  payglocal: {
    enabled: false,
    gateway_id:
      "payglocal_payment_gateway",
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
    require_screenshot:
      true,
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

function MethodCard({
  icon,
  title,
  description,
  badge,
  enabled,
  onToggle,
  children,
}: {
  icon:
    React.ReactNode;
  title: string;
  description: string;
  badge?:
    React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  children:
    React.ReactNode;
}) {
  return (
    <section
      className={[
        "overflow-hidden rounded-2xl border bg-card transition",
        enabled
          ? "border-primary/35"
          : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 md:px-5">
        <span
          className={[
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
            enabled
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
          ].join(" ")}
        >
          {icon}
        </span>

        <button
          type="button"
          onClick={
            onToggle
          }
          className="ls-focus-ring min-w-0 flex-1 rounded-lg text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-extrabold text-heading">
              {title}
            </h3>

            {badge}
          </div>

          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        </button>

        <Switch
          checked={enabled}
          onCheckedChange={() =>
            onToggle()
          }
        />
      </div>

      {enabled ? (
        <div className="border-t border-border bg-surface-soft p-4 md:p-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            {children}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function PaymentsTab() {
  const methods =
    useForm<PaymentsFormValues>({
      defaultValues:
        DEFAULT_VALUES,
    });

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: {
      isDirty,
    },
  } = methods;

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    showAdvanced,
    setShowAdvanced,
  ] =
    useState(false);

  const paymentsEnabled =
    watch(
      "general.enabled"
    );

  const payglocalEnabled =
    watch(
      "payglocal.enabled"
    );

  const upiEnabled =
    watch(
      "upi.enabled"
    );

  const bankEnabled =
    watch(
      "bank.enabled"
    );

  const codEnabled =
    watch(
      "cod.enabled"
    );

  const requireScreenshot =
    watch(
      "upi.require_screenshot"
    );

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/payments/settings",
            {
              method: "GET",
              cache:
                "no-store",
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Failed to load payments (${response.status})`
          );
        }

        const safe:
          PaymentsFormValues = {
          general: {
            enabled:
              data.general
                ?.enabled !==
              undefined
                ? Boolean(
                    data.general
                      .enabled
                  )
                : true,
            default_status:
              data.general
                ?.default_status ||
              "processing",
          },
          payglocal: {
            enabled:
              Boolean(
                data.payglocal
                  ?.enabled
              ),
            gateway_id:
              data.payglocal
                ?.gateway_id ||
              "payglocal_payment_gateway",
          },
          upi: {
            enabled:
              Boolean(
                data.upi
                  ?.enabled
              ),
            upi_id:
              data.upi
                ?.upi_id ||
              "",
            upi_number:
              data.upi
                ?.upi_number ||
              "",
            payee:
              data.upi
                ?.payee ||
              "",
            qr:
              data.upi?.qr ===
              "yes"
                ? "yes"
                : "no",
            time_min:
              data.upi
                ?.time_min ||
              "",
            notes:
              data.upi
                ?.notes ||
              "",
            qr_src:
              data.upi
                ?.qr_src ||
              "",
            require_screenshot:
              data.upi
                ?.require_screenshot !==
              undefined
                ? Boolean(
                    data.upi
                      .require_screenshot
                  )
                : data.upi
                      ?.screenshot_upload !==
                    undefined
                  ? Boolean(
                      data.upi
                        .screenshot_upload
                    )
                  : true,
          },
          bank: {
            enabled:
              Boolean(
                data.bank
                  ?.enabled
              ),
            account_name:
              data.bank
                ?.account_name ||
              "",
            account_number:
              data.bank
                ?.account_number ||
              "",
            ifsc:
              data.bank
                ?.ifsc ||
              "",
            bank:
              data.bank
                ?.bank ||
              "",
            branch:
              data.bank
                ?.branch ||
              "",
            notes:
              data.bank
                ?.notes ||
              "",
          },
          cod: {
            enabled:
              Boolean(
                data.cod
                  ?.enabled
              ),
            notes:
              data.cod
                ?.notes ||
              "",
          },
          cheque: {
            enabled:
              Boolean(
                data.cheque
                  ?.enabled
              ),
            notes:
              data.cheque
                ?.notes ||
              "",
          },
        };

        if (!cancelled) {
          reset(safe);
        }
      } catch (
        error: unknown
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "Failed to load payment settings";

        if (!cancelled) {
          setError(
            message
          );

          actionFeedback.error({
            id:
              "payments-load",
            title:
              "Could not load payments",
            message,
            durationMs: 4200,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reset]);

  const enabledCount =
    useMemo(() => {
      let count = 0;

      if (
        payglocalEnabled
      ) {
        count += 1;
      }

      if (upiEnabled) {
        count += 1;
      }

      if (bankEnabled) {
        count += 1;
      }

      if (codEnabled) {
        count += 1;
      }

      return count;
    }, [
      payglocalEnabled,
      upiEnabled,
      bankEnabled,
      codEnabled,
    ]);

  function toggleField(
    path: string,
    value: boolean
  ) {
    setValue(
      path as any,
      value,
      {
        shouldDirty:
          true,
        shouldTouch:
          true,
        shouldValidate:
          false,
      }
    );
  }

  async function savePayments(
    values:
      PaymentsFormValues
  ): Promise<boolean> {
    if (
      saving ||
      loading
    ) {
      return false;
    }

    const feedbackId =
      "payments-save";

    setSaving(true);
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving payment settings…",
    });

    try {
      const payload:
        PaymentsFormValues = {
        ...values,
        upi: {
          ...values.upi,
          require_screenshot:
            Boolean(
              values.upi
                .require_screenshot
            ),
        },
      };

      const response =
        await fetch(
          "/api/payments/settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `Failed to save (${response.status})`
        );
      }

      const saved =
        (
          data?.settings ||
          payload
        ) as PaymentsFormValues;

      reset(saved);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Payment settings saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Failed to save payment settings";

      setError(
        message
      );

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save payments",
        message,
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  const onSubmit:
    SubmitHandler<PaymentsFormValues> =
    async (
      values
    ) => {
      await savePayments(
        values
      );
    };

  useUnsavedChanges({
    id:
      "settings-payments",
    dirty: isDirty,
    label:
      "payment settings",
    save: () =>
      savePayments(
        getValues()
      ),
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <FormProvider
      {...methods}
    >
      <form
        onSubmit={
          handleSubmit(
            onSubmit
          )
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {error}
              </span>
            </div>
          ) : null}

          <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-start gap-3 px-4 py-3.5 md:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Settings2 className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-heading">
                  Accept payments
                </div>

                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  Show or hide all checkout payment methods.
                </p>
              </div>

              <Switch
                checked={
                  Boolean(
                    paymentsEnabled
                  )
                }
                onCheckedChange={() =>
                  toggleField(
                    "general.enabled",
                    !paymentsEnabled
                  )
                }
              />
            </div>

            {paymentsEnabled ? (
              <div className="border-t border-border px-4 py-3 md:px-5">
                <button
                  type="button"
                  onClick={() =>
                    setShowAdvanced(
                      (
                        current
                      ) =>
                        !current
                    )
                  }
                  className="ls-focus-ring flex w-full items-center justify-between gap-3 rounded-xl text-left"
                >
                  <div>
                    <div className="text-xs font-bold text-heading">
                      Order status after successful payment
                    </div>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Advanced optional setting
                    </p>
                  </div>

                  <ChevronDown
                    className={[
                      "h-4 w-4 text-muted-foreground transition-transform",
                      showAdvanced
                        ? "rotate-180"
                        : "",
                    ].join(
                      " "
                    )}
                  />
                </button>

                {showAdvanced ? (
                  <div className="mt-3 max-w-md">
                    <select
                      className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
                      {...register(
                        "general.default_status"
                      )}
                    >
                      <option value="processing">
                        Processing — recommended
                      </option>
                      <option value="on-hold">
                        On hold
                      </option>
                      <option value="pending">
                        Pending payment
                      </option>
                      <option value="completed">
                        Completed
                      </option>
                    </select>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-border bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 md:px-5">
                Checkout payment methods are hidden. Saved configurations remain unchanged.
              </div>
            )}
          </section>

          {paymentsEnabled ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold text-heading">
                    Payment methods
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Enable only the methods offered at checkout.
                  </p>
                </div>

                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
                  {enabledCount} active
                </span>
              </div>

              <div className="space-y-3">
                <MethodCard
                  icon={
                    <CreditCard className="h-4.5 w-4.5" />
                  }
                  title="PayGlocal"
                  description="Online gateway with automatic payment confirmation."
                  enabled={
                    Boolean(
                      payglocalEnabled
                    )
                  }
                  onToggle={() =>
                    toggleField(
                      "payglocal.enabled",
                      !payglocalEnabled
                    )
                  }
                  badge={
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground">
                      RECOMMENDED
                    </span>
                  }
                >
                  <PayGlocalPanel />
                </MethodCard>

                <MethodCard
                  icon={
                    <Smartphone className="h-4.5 w-4.5" />
                  }
                  title="Manual UPI"
                  description="Show UPI details and verify customer payment manually."
                  enabled={
                    Boolean(
                      upiEnabled
                    )
                  }
                  onToggle={() =>
                    toggleField(
                      "upi.enabled",
                      !upiEnabled
                    )
                  }
                  badge={
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      NO GATEWAY FEE
                    </span>
                  }
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-heading">
                          Payment screenshot
                        </div>

                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Ask customers to upload payment proof on the success page.
                        </div>
                      </div>

                      <Switch
                        checked={
                          Boolean(
                            requireScreenshot
                          )
                        }
                        onCheckedChange={() =>
                          toggleField(
                            "upi.require_screenshot",
                            !requireScreenshot
                          )
                        }
                      />

                      <input
                        type="hidden"
                        {...register(
                          "upi.require_screenshot"
                        )}
                      />
                    </div>

                    <UPIPanel />
                  </div>
                </MethodCard>

                <MethodCard
                  icon={
                    <Landmark className="h-4.5 w-4.5" />
                  }
                  title="Bank Transfer"
                  description="Show bank account details for direct transfer."
                  enabled={
                    Boolean(
                      bankEnabled
                    )
                  }
                  onToggle={() =>
                    toggleField(
                      "bank.enabled",
                      !bankEnabled
                    )
                  }
                >
                  <BankTransferPanel />
                </MethodCard>

                <MethodCard
                  icon={
                    <Banknote className="h-4.5 w-4.5" />
                  }
                  title="Cash on Delivery"
                  description="Allow order placement with payment at delivery."
                  enabled={
                    Boolean(
                      codEnabled
                    )
                  }
                  onToggle={() =>
                    toggleField(
                      "cod.enabled",
                      !codEnabled
                    )
                  }
                >
                  <CODPanel />
                </MethodCard>
              </div>
            </>
          ) : null}

          <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
              <div className="min-w-0 px-1">
                <div className="text-xs font-bold text-heading">
                  {isDirty
                    ? "Unsaved payment changes"
                    : "All changes saved"}
                </div>
              </div>

              <AsyncButton
                type="submit"
                loading={
                  saving
                }
                loadingLabel="Saving…"
                disabled={
                  !isDirty
                }
              >
                Save Payments
              </AsyncButton>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
