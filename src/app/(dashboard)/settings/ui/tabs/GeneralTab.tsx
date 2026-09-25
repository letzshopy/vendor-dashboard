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
  Printer,
  Ruler,
  ShieldCheck,
  Star,
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

const textareaClass =
  "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";

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
  );
}

  if (!p) return null;

  const setField = <K extends keyof ProductsGeneral>(
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
        <SectionCard
          icon={<DollarSign className="h-5 w-5" />}
          title="Currency & Pricing"
          description="These settings control how product prices appear in your store."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Currency">
              <select
                className={selectClass}
                value={p.currency}
                onChange={(e) => setField("currency", e.target.value)}
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </Field>

            <Field label="Price decimals" error={err.priceDecimals}>
              <input
                type="number"
                min={0}
                max={4}
                className={inputClass}
                value={p.priceDecimals}
                onChange={(e) =>
                  setField(
                    "priceDecimals",
                    Math.max(0, Math.min(4, Number(e.target.value)))
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Ruler className="h-5 w-5" />}
          title="Measurements"
          description="Used for product dimensions and shipping weight calculations."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Weight unit">
              <select
                className={selectClass}
                value={p.weightUnit}
                onChange={(e) => setField("weightUnit", e.target.value as any)}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="lb">lb</option>
                <option value="oz">oz</option>
              </select>
            </Field>

            <Field label="Dimensions unit">
              <select
                className={selectClass}
                value={p.dimensionUnit}
                onChange={(e) =>
                  setField("dimensionUnit", e.target.value as any)
                }
              >
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="m">m</option>
                <option value="in">in</option>
                <option value="yd">yd</option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Star className="h-5 w-5" />}
          title="Reviews"
          description="Choose whether customers can leave product reviews."
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="text-sm font-bold text-heading">
              Enable product reviews
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
          icon={<Warehouse className="h-5 w-5" />}
          title="Inventory"
          description="Automatic stock tracking, display settings and email alerts."
        >
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
            <div className="text-sm font-bold text-heading">
              Enable stock management
            </div>

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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                Low-stock notification
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
                Out-of-stock notification
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

            <Field
              label="Notification recipient email"
              error={err.stockEmailRecipient}
            >
              <input
                className={inputClass}
                value={p.stockEmailRecipient}
                onChange={(e) => setField("stockEmailRecipient", e.target.value)}
                placeholder="alerts@yourstore.com"
              />
            </Field>

            <Field label="Low-stock threshold" error={err.lowStockThreshold}>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={p.lowStockThreshold}
                onChange={(e) =>
                  setField("lowStockThreshold", Math.max(0, Number(e.target.value)))
                }
              />
            </Field>
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-surface-soft p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-foreground">
                Hide out-of-stock products
              </span>

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

            <Field label="Stock display format">
              <select
                className={selectClass}
                value={p.stockDisplayFormat}
                onChange={(e) =>
                  setField("stockDisplayFormat", e.target.value as any)
                }
              >
                <option value="no_amount">Never show quantity remaining</option>
                <option value="always">Always show quantity (“2 in stock”)</option>
                <option value="low_amount">
                  Only when low (“Only 2 left in stock”)
                </option>
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Printer className="h-5 w-5" />}
          title="Packing slip sender address"
          description="Choose which From / Return address appears at the bottom of downloaded packing slips."
        >
          <div className="space-y-3">
            <label
              className={
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition " +
                (!p.packslipShowReturn
                  ? "border-[#B9C3E6] bg-[#F5F7FC]"
                  : "border-border bg-card hover:bg-muted")
              }
            >
              <input
                type="radio"
                name="packslip-address-source"
                className="mt-0.5 h-4 w-4 border-slate-300 text-heading focus:ring-[#E85D4A]"
                checked={!p.packslipShowReturn}
                onChange={() => setField("packslipShowReturn", false)}
              />

              <div className="min-w-0">
                <div className="text-sm font-bold text-heading">
                  Use Store Profile address
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Recommended. The business address saved in Settings → Profile
                  is used automatically as the From / Return address.
                </p>
              </div>
            </label>

            <label
              className={
                "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition " +
                (p.packslipShowReturn
                  ? "border-[#F2B5AA] bg-[#FFF7F5]"
                  : "border-border bg-card hover:bg-muted")
              }
            >
              <input
                type="radio"
                name="packslip-address-source"
                className="mt-0.5 h-4 w-4 border-slate-300 text-[#E85D4A] focus:ring-[#E85D4A]"
                checked={p.packslipShowReturn}
                onChange={() => setField("packslipShowReturn", true)}
              />

              <div className="min-w-0">
                <div className="text-sm font-bold text-heading">
                  Use a different return address
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Choose this only when parcels should be returned to a different
                  address from the Store Profile address.
                </p>
              </div>
            </label>
          </div>

          {p.packslipShowReturn ? (
            <Field label="Custom From / Return address">
              <textarea
                className={textareaClass + " whitespace-pre-wrap"}
                rows={4}
                placeholder={"Business / contact name\nAddress line 1\nCity, State, PIN\nMobile"}
                value={p.packslipReturnAddress}
                onChange={(e) =>
                  setField("packslipReturnAddress", e.target.value)
                }
              />
            </Field>
          ) : (
            <div className="rounded-2xl border border-border bg-surface-soft px-4 py-3 text-xs leading-5 text-muted-foreground">
              <span className="font-semibold text-heading">
                Store Profile address selected.
              </span>{" "}
              No separate packing-slip address needs to be maintained here.
            </div>
          )}

          <p className="text-xs leading-5 text-muted-foreground">
            This sender address is printed at the bottom of each packing slip.
            Customer Shipping Address and Mobile remain at the top.
          </p>
        </SectionCard>

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
            <div className="min-w-0 px-1">
              <div className="text-xs font-bold text-heading">
                {isDirty
                  ? "Unsaved changes"
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
              Save
            </AsyncButton>
          </div>
        </div>
      </div>
  );
}