"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgePercent,
  MapPinned,
  ReceiptText,
  Settings2,
} from "lucide-react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  Switch,
} from "@/components/ui/switch";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import {
  normalizeIndiaStateCode,
} from "@/lib/indiaStates";

type TaxSettings = {
  enable: boolean;
  prices_include_tax:
    | "yes"
    | "no";
  display_shop:
    | "incl"
    | "excl";
  display_cart:
    | "incl"
    | "excl";
  round_subtotal:
    | "yes"
    | "no";
  based_on:
    | "shipping"
    | "billing"
    | "base";
  store_state: string;
  gst_number: string;
  legal_name: string;
  trade_name: string;
  gst_slab:
    | 0
    | 5
    | 12
    | 18;
};

const IN_STATES = [
  ["AN","Andaman and Nicobar Islands"],
  ["AP","Andhra Pradesh"],
  ["AR","Arunachal Pradesh"],
  ["AS","Assam"],
  ["BR","Bihar"],
  ["CH","Chandigarh"],
  ["CT","Chhattisgarh"],
  ["DN","Dadra and Nagar Haveli and Daman and Diu"],
  ["DL","Delhi"],
  ["GA","Goa"],
  ["GJ","Gujarat"],
  ["HR","Haryana"],
  ["HP","Himachal Pradesh"],
  ["JK","Jammu and Kashmir"],
  ["JH","Jharkhand"],
  ["KA","Karnataka"],
  ["KL","Kerala"],
  ["LA","Ladakh"],
  ["LD","Lakshadweep"],
  ["MP","Madhya Pradesh"],
  ["MH","Maharashtra"],
  ["MN","Manipur"],
  ["ML","Meghalaya"],
  ["MZ","Mizoram"],
  ["NL","Nagaland"],
  ["OD","Odisha"],
  ["PY","Puducherry"],
  ["PB","Punjab"],
  ["RJ","Rajasthan"],
  ["SK","Sikkim"],
  ["TN","Tamil Nadu"],
  ["TS","Telangana"],
  ["TR","Tripura"],
  ["UP","Uttar Pradesh"],
  ["UK","Uttarakhand"],
  ["WB","West Bengal"],
] as const;

const DEFAULT_TAX:
  TaxSettings = {
  enable: false,
  prices_include_tax:
    "yes",
  display_shop: "incl",
  display_cart: "incl",
  round_subtotal: "yes",
  based_on: "shipping",
  store_state: "KA",
  gst_number: "",
  legal_name: "",
  trade_name: "",
  gst_slab: 18,
};

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function normalizeTaxSettings(
  value: unknown
): TaxSettings {
  const data =
    isRecord(value)
      ? value
      : {};

  const normalizedState =
    typeof data.store_state ===
      "string"
      ? normalizeIndiaStateCode(
          data.store_state
        )
      : DEFAULT_TAX.store_state;

  const slab =
    Number(data.gst_slab);

  return {
    enable:
      data.enable === true,
    prices_include_tax:
      data.prices_include_tax ===
        "no"
        ? "no"
        : "yes",
    display_shop:
      data.display_shop ===
        "excl"
        ? "excl"
        : "incl",
    display_cart:
      data.display_cart ===
        "excl"
        ? "excl"
        : "incl",
    round_subtotal:
      data.round_subtotal ===
        "no"
        ? "no"
        : "yes",
    based_on:
      data.based_on ===
        "billing"
        ? "billing"
        : data.based_on ===
            "base"
          ? "base"
          : "shipping",
    store_state:
      IN_STATES.some(
        ([code]) =>
          code ===
          normalizedState
      )
        ? normalizedState
        : DEFAULT_TAX.store_state,
    gst_number:
      typeof data.gst_number ===
        "string"
        ? data.gst_number
        : "",
    legal_name:
      typeof data.legal_name ===
        "string"
        ? data.legal_name
        : "",
    trade_name:
      typeof data.trade_name ===
        "string"
        ? data.trade_name
        : "",
    gst_slab:
      slab === 0 ||
      slab === 5 ||
      slab === 12 ||
      slab === 18
        ? slab
        : 18,
  };
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-heading">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const selectClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

export default function TaxTab() {
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
    useState("");

  const [
    settings,
    setSettings,
  ] =
    useState<TaxSettings>(
      DEFAULT_TAX
    );

  const [
    savedSnapshot,
    setSavedSnapshot,
  ] =
    useState("");

  const currentSnapshot =
    useMemo(
      () =>
        JSON.stringify(
          settings
        ),
      [settings]
    );

  const isDirty =
    Boolean(
      savedSnapshot
    ) &&
    currentSnapshot !==
      savedSnapshot;

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            "/api/tax/settings",
            {
              cache:
                "no-store",
            }
          );

        const parsed =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            isRecord(parsed) &&
              typeof parsed.error ===
                "string"
              ? parsed.error
              : "Failed to load tax settings"
          );
        }

        const normalized =
          normalizeTaxSettings(
            parsed
          );

        if (!cancelled) {
          setSettings(
            normalized
          );
          setSavedSnapshot(
            JSON.stringify(
              normalized
            )
          );
        }
      } catch (
        error: unknown
      ) {
        const message =
          error instanceof
            Error
            ? error.message
            : "Failed to load tax settings";

        if (!cancelled) {
          setError(message);
          actionFeedback.error({
            id:
              "tax-settings-load",
            title:
              "Could not load Tax & GST",
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
  }, []);

  async function save():
    Promise<boolean> {
    if (
      saving ||
      loading
    ) {
      return false;
    }

    const feedbackId =
      "tax-settings-save";

    setSaving(true);
    setError("");

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving Tax & GST…",
    });

    try {
      const response =
        await fetch(
          "/api/tax/settings",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                settings
              ),
          }
        );

      const parsed =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          isRecord(parsed) &&
            typeof parsed.error ===
              "string"
            ? parsed.error
            : "Save failed"
        );
      }

      const normalized =
        normalizeTaxSettings(
          parsed
        );

      setSettings(
        normalized
      );
      setSavedSnapshot(
        JSON.stringify(
          normalized
        )
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Tax & GST saved",
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
          : "Save failed";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save Tax & GST",
        message,
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  useUnsavedChanges({
    id:
      "settings-tax",
    dirty: isDirty,
    label:
      "Tax & GST changes",
    save,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Section
        icon={
          <Settings2 className="h-4.5 w-4.5" />
        }
        title="Tax calculation"
        description="Turn GST calculation on or off and control how prices are treated."
      >
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold text-heading">
                Enable GST
              </div>

              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                GST
              </span>
            </div>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Apply configured GST to customer orders.
            </p>
          </div>

          <Switch
            checked={
              settings.enable
            }
            onCheckedChange={(
              checked
            ) =>
              setSettings(
                (
                  current
                ) => ({
                  ...current,
                  enable:
                    Boolean(
                      checked
                    ),
                })
              )
            }
          />
        </div>

        {settings.enable ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Product prices">
              <select
                className={
                  selectClass
                }
                value={
                  settings.prices_include_tax
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      prices_include_tax:
                        event.target
                          .value as
                          TaxSettings["prices_include_tax"],
                    })
                  )
                }
              >
                <option value="yes">
                  Inclusive of GST
                </option>
                <option value="no">
                  GST added on top
                </option>
              </select>
            </Field>

            <Field label="Calculate tax from">
              <select
                className={
                  selectClass
                }
                value={
                  settings.based_on
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      based_on:
                        event.target
                          .value as
                          TaxSettings["based_on"],
                    })
                  )
                }
              >
                <option value="shipping">
                  Shipping address
                </option>
                <option value="billing">
                  Billing address
                </option>
                <option value="base">
                  Store address
                </option>
              </select>
            </Field>

            <Field label="Storefront price display">
              <select
                className={
                  selectClass
                }
                value={
                  settings.display_shop
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      display_shop:
                        event.target
                          .value as
                          TaxSettings["display_shop"],
                    })
                  )
                }
              >
                <option value="incl">
                  Including GST
                </option>
                <option value="excl">
                  Excluding GST
                </option>
              </select>
            </Field>

            <Field label="Checkout price display">
              <select
                className={
                  selectClass
                }
                value={
                  settings.display_cart
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      display_cart:
                        event.target
                          .value as
                          TaxSettings["display_cart"],
                    })
                  )
                }
              >
                <option value="incl">
                  Including GST
                </option>
                <option value="excl">
                  Excluding GST
                </option>
              </select>
            </Field>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3 lg:col-span-2">
              <div className="min-w-0">
                <div className="text-sm font-bold text-heading">
                  Round tax at subtotal
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Round after subtotal instead of per line item.
                </div>
              </div>

              <Switch
                checked={
                  settings.round_subtotal ===
                  "yes"
                }
                onCheckedChange={(
                  checked
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      round_subtotal:
                        checked
                          ? "yes"
                          : "no",
                    })
                  )
                }
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            GST calculation is off. Your GST details remain saved.
          </div>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Section
          icon={
            <MapPinned className="h-4.5 w-4.5" />
          }
          title="Store state"
          description="Used for place-of-supply and IGST / CGST / SGST rules."
        >
          <Field
            label="State"
            hint={`Store base location: IN:${settings.store_state}`}
          >
            <select
              className={
                selectClass
              }
              value={
                settings.store_state
              }
              onChange={(
                event
              ) =>
                setSettings(
                  (
                    current
                  ) => ({
                    ...current,
                    store_state:
                      event.target
                        .value,
                  })
                )
              }
            >
              {IN_STATES.map(
                ([code, name]) => (
                  <option
                    key={code}
                    value={code}
                  >
                    {name}
                  </option>
                )
              )}
            </select>
          </Field>
        </Section>

        <Section
          icon={
            <ReceiptText className="h-4.5 w-4.5" />
          }
          title="GST information"
          description="Business GST identity and standard product tax slab."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="GSTIN">
              <Input
                value={
                  settings.gst_number
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      gst_number:
                        event.target
                          .value.toUpperCase(),
                    })
                  )
                }
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>

            <Field label="GST slab">
              <select
                className={
                  selectClass
                }
                value={
                  settings.gst_slab
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      gst_slab:
                        Number(
                          event.target
                            .value
                        ) as
                          TaxSettings["gst_slab"],
                    })
                  )
                }
              >
                <option value={0}>
                  0%
                </option>
                <option value={5}>
                  5%
                </option>
                <option value={12}>
                  12%
                </option>
                <option value={18}>
                  18%
                </option>
              </select>
            </Field>

            <Field label="Legal name">
              <Input
                value={
                  settings.legal_name
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      legal_name:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Legal business name"
              />
            </Field>

            <Field label="Trade / brand name">
              <Input
                value={
                  settings.trade_name
                }
                onChange={(
                  event
                ) =>
                  setSettings(
                    (
                      current
                    ) => ({
                      ...current,
                      trade_name:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="Store or brand name"
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
            <div>
              <div className="text-sm font-bold text-heading">
                Standard GST slab
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Saved slab is synced to the store standard rate.
              </p>
            </div>

            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
              AUTO SYNC
            </span>
          </div>
        </Section>
      </div>

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
          <div className="min-w-0 px-1">
            <div className="text-xs font-bold text-heading">
              {isDirty
                ? "Unsaved Tax & GST changes"
                : "All changes saved"}
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={saving}
            loadingLabel="Saving…"
            disabled={
              !isDirty
            }
            onClick={() =>
              void save()
            }
          >
            <BadgePercent className="h-4 w-4" />
            Save Tax & GST
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
