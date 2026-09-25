"use client";

import { useEffect, useMemo, useState } from "react";

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
import {
  DollarSign,
  Ruler,
  ShieldCheck,
  Warehouse,
} from "lucide-react";

type ProductsGeneral = {
  currency: string;
  priceDecimals: number;
  weightUnit: "kg" | "g" | "lb" | "oz";
  dimensionUnit: "cm" | "mm" | "m" | "in" | "yd";
  reviewsEnabled: boolean;
  manageStock: boolean;
  notifyLowStock: boolean;
  notifyNoStock: boolean;
  stockEmailRecipient: string;
  lowStockThreshold: number;
  hideOutOfStock: boolean;
  stockDisplayFormat: "no_amount" | "always" | "low_amount";
  packslipReturnAddress: string;
  packslipShowReturn: boolean;
};

const inputClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground";

const selectClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 md:px-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            {icon}
          </div>

          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-heading">
              {title}
            </h3>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {description}
            </p>
          </div>
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
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>
      {children}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export default function GeneralTab() {
  const [p, setP] = useState<ProductsGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const [savedSnap, setSavedSnap] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/general", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        const text = await res.text();
        if (!text) throw new Error("Empty response from /api/settings/general");
        const j = JSON.parse(text);
        if (!j?.products) throw new Error("Missing products in response");

        const prod = j.products as ProductsGeneral & {
          packslipReturnAddress?: string;
          packslipShowReturn?: boolean;
        };

        const normalized: ProductsGeneral = {
          ...prod,
          packslipReturnAddress: prod.packslipReturnAddress || "",
          packslipShowReturn: !!prod.packslipShowReturn,
        };

        setP(normalized);
        setSavedSnap(JSON.stringify(normalized));
      } catch (e: any) {
        setLoadErr(e?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentSnap = useMemo(() => (p ? JSON.stringify(p) : null), [p]);

  function normalizedText(value: string) {
    return value
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim();
  }

  function sameProducts(
    expected: ProductsGeneral,
    actual: ProductsGeneral
  ) {
    return (
      expected.currency === actual.currency &&
      Number(expected.priceDecimals) === Number(actual.priceDecimals) &&
      expected.weightUnit === actual.weightUnit &&
      expected.dimensionUnit === actual.dimensionUnit &&
      expected.reviewsEnabled === actual.reviewsEnabled &&
      expected.manageStock === actual.manageStock &&
      expected.notifyLowStock === actual.notifyLowStock &&
      expected.notifyNoStock === actual.notifyNoStock &&
      normalizedText(expected.stockEmailRecipient) ===
        normalizedText(actual.stockEmailRecipient) &&
      Number(expected.lowStockThreshold) === Number(actual.lowStockThreshold) &&
      expected.hideOutOfStock === actual.hideOutOfStock &&
      expected.stockDisplayFormat === actual.stockDisplayFormat &&
      normalizedText(expected.packslipReturnAddress) ===
        normalizedText(actual.packslipReturnAddress) &&
      expected.packslipShowReturn === actual.packslipShowReturn
    );
  }

  const isDirty = useMemo(() => {
    if (!savedSnap || !currentSnap) return false;
    return savedSnap !== currentSnap;
  }, [currentSnap, savedSnap]);

  useUnsavedChanges({
    id:
      "settings-general",
    dirty: isDirty,
    label:
      "store settings",
    save,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadErr) {
  return (
    <div>
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        <div className="font-semibold">
          General settings could not be loaded.
        </div>
        <div className="mt-2 text-xs leading-5 text-rose-700/80">
          Please refresh the page and try again. If the issue continues, contact
          LetzShopy support.
        </div>
      </div>
    </div>
  );
}

  if (!p) return null;

  const setField = <K extends keyof ProductsGeneral,>(
    k: K,
    v: ProductsGeneral[K]
  ) => setP({ ...p, [k]: v });

  async function save(): Promise<boolean> {
    if (
      !p ||
      syncing
    ) {
      return false;
    }

    const feedbackId =
      "general-settings-save";

    setErr({});
    setSyncing(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving store settings…",
    });

    try {
      const res =
        await fetch(
          "/api/settings/general",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                products: p,
                sync: true,
              }),
          }
        );

      const text =
        await res
          .text()
          .catch(
            () => ""
          );

      const j =
        text
          ? JSON.parse(text)
          : {};

      if (!res.ok) {
        if (
          j.error &&
          typeof j.error ===
            "object"
        ) {
          setErr(
            j.error
          );
        }

        throw new Error(
          typeof j?.message ===
            "string"
            ? j.message
            : "Could not save store settings."
        );
      }

      const verifyRes =
        await fetch(
          "/api/settings/general",
          {
            cache:
              "no-store",
          }
        );

      if (!verifyRes.ok) {
        throw new Error(
          "Could not verify saved store settings."
        );
      }

      const verifyText =
        await verifyRes.text();

      const verifyJson =
        verifyText
          ? JSON.parse(
              verifyText
            )
          : {};

      if (
        !verifyJson?.products
      ) {
        throw new Error(
          "Saved store settings could not be verified."
        );
      }

      const persisted =
        verifyJson.products as
          ProductsGeneral & {
            packslipReturnAddress?: string;
            packslipShowReturn?: boolean;
          };

      const verified:
        ProductsGeneral = {
        ...persisted,
        packslipReturnAddress:
          persisted.packslipReturnAddress ||
          "",
        packslipShowReturn:
          Boolean(
            persisted.packslipShowReturn
          ),
      };

      if (
        !sameProducts(
          p,
          verified
        )
      ) {
        throw new Error(
          "The store returned different settings after save. Your edits are still unsaved."
        );
      }

      setP(verified);
      setSavedSnap(
        JSON.stringify(
          verified
        )
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Store settings saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save store settings",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          icon={
            <DollarSign className="h-5 w-5" />
          }
          title="Store display"
          description="Currency, price format and product review visibility."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency">
              <select
                className={
                  selectClass
                }
                value={
                  p.currency
                }
                onChange={(
                  event
                ) =>
                  setField(
                    "currency",
                    event.target
                      .value
                  )
                }
              >
                <option value="INR">
                  INR — Indian Rupee
                </option>
                <option value="USD">
                  USD — US Dollar
                </option>
                <option value="EUR">
                  EUR — Euro
                </option>
              </select>
            </Field>

            <Field
              label="Price decimals"
              error={
                err.priceDecimals
              }
            >
              <input
                type="number"
                min={0}
                max={4}
                className={
                  inputClass
                }
                value={
                  p.priceDecimals
                }
                onChange={(
                  event
                ) =>
                  setField(
                    "priceDecimals",
                    Math.max(
                      0,
                      Math.min(
                        4,
                        Number(
                          event.target
                            .value
                        )
                      )
                    )
                  )
                }
              />
            </Field>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-heading">
                Product reviews
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Allow customers to leave reviews on product pages.
              </div>
            </div>

            <Switch
              checked={
                p.reviewsEnabled
              }
              onCheckedChange={(
                checked
              ) =>
                setField(
                  "reviewsEnabled",
                  Boolean(
                    checked
                  )
                )
              }
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={
            <Ruler className="h-5 w-5" />
          }
          title="Product measurements"
          description="Default units used for product size and shipping weight."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Weight unit">
              <select
                className={
                  selectClass
                }
                value={
                  p.weightUnit
                }
                onChange={(
                  event
                ) =>
                  setField(
                    "weightUnit",
                    event.target
                      .value as
                      ProductsGeneral["weightUnit"]
                  )
                }
              >
                <option value="kg">
                  kg
                </option>
                <option value="g">
                  g
                </option>
                <option value="lb">
                  lb
                </option>
                <option value="oz">
                  oz
                </option>
              </select>
            </Field>

            <Field label="Dimensions unit">
              <select
                className={
                  selectClass
                }
                value={
                  p.dimensionUnit
                }
                onChange={(
                  event
                ) =>
                  setField(
                    "dimensionUnit",
                    event.target
                      .value as
                      ProductsGeneral["dimensionUnit"]
                  )
                }
              >
                <option value="cm">
                  cm
                </option>
                <option value="mm">
                  mm
                </option>
                <option value="m">
                  m
                </option>
                <option value="in">
                  in
                </option>
                <option value="yd">
                  yd
                </option>
              </select>
            </Field>
          </div>

          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-xs leading-5 text-muted-foreground">
            These units become the defaults when adding or editing products.
          </div>
        </SectionCard>
      </div>

      <SectionCard
        icon={
          <Warehouse className="h-5 w-5" />
        }
        title="Stock settings"
        description="Control stock tracking, alerts and storefront stock visibility."
      >
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
            <span className="text-sm font-bold text-heading">
              Manage stock
            </span>

            <Switch
              checked={
                p.manageStock
              }
              onCheckedChange={(
                checked
              ) =>
                setField(
                  "manageStock",
                  Boolean(
                    checked
                  )
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Low-stock alert
            </span>

            <Switch
              checked={
                p.notifyLowStock
              }
              onCheckedChange={(
                checked
              ) =>
                setField(
                  "notifyLowStock",
                  Boolean(
                    checked
                  )
                )
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Out-of-stock alert
            </span>

            <Switch
              checked={
                p.notifyNoStock
              }
              onCheckedChange={(
                checked
              ) =>
                setField(
                  "notifyNoStock",
                  Boolean(
                    checked
                  )
                )
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field
            label="Alert email"
            error={
              err.stockEmailRecipient
            }
          >
            <input
              className={
                inputClass
              }
              value={
                p.stockEmailRecipient
              }
              onChange={(
                event
              ) =>
                setField(
                  "stockEmailRecipient",
                  event.target
                    .value
                )
              }
              placeholder="alerts@yourstore.com"
            />
          </Field>

          <Field
            label="Low-stock threshold"
            error={
              err.lowStockThreshold
            }
          >
            <input
              type="number"
              min={0}
              className={
                inputClass
              }
              value={
                p.lowStockThreshold
              }
              onChange={(
                event
              ) =>
                setField(
                  "lowStockThreshold",
                  Math.max(
                    0,
                    Number(
                      event.target
                        .value
                    )
                  )
                )
              }
            />
          </Field>

          <Field label="Stock display">
            <select
              className={
                selectClass
              }
              value={
                p.stockDisplayFormat
              }
              onChange={(
                event
              ) =>
                setField(
                  "stockDisplayFormat",
                  event.target
                    .value as
                    ProductsGeneral["stockDisplayFormat"]
                )
              }
            >
              <option value="no_amount">
                Never show quantity
              </option>
              <option value="always">
                Always show quantity
              </option>
              <option value="low_amount">
                Show quantity only when low
              </option>
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-heading">
              Hide out-of-stock products
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Remove unavailable products from normal catalog browsing.
            </div>
          </div>

          <Switch
            checked={
              p.hideOutOfStock
            }
            onCheckedChange={(
              checked
            ) =>
              setField(
                "hideOutOfStock",
                Boolean(
                  checked
                )
              )
            }
          />
        </div>
      </SectionCard>

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
          <div className="min-w-0 px-1">
            <div className="text-xs font-bold text-heading">
              {isDirty
                ? "Unsaved store changes"
                : "All changes saved"}
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={
              syncing
            }
            loadingLabel="Saving…"
            disabled={
              !isDirty
            }
            onClick={() =>
              void save()
            }
          >
            <ShieldCheck className="h-4 w-4" />
            Save Store Settings
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
