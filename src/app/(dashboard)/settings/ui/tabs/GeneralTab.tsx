"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DollarSign,
  Package,
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
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm " +
  "text-slate-900 placeholder:text-slate-400 shadow-sm transition " +
  "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const selectClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm " +
  "text-slate-900 shadow-sm transition focus:border-indigo-400 " +
  "focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm " +
  "text-slate-900 placeholder:text-slate-400 shadow-sm transition resize-none " +
  "focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

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
    <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            {icon}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-5">{children}</div>
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
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
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

  const [banner, setBanner] = useState<
    null | { type: "success" | "error"; message: string }
  >(null);

  const snapshotRef = useRef<string | null>(null);

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
        snapshotRef.current = JSON.stringify(normalized);
      } catch (e: any) {
        setLoadErr(e?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentSnap = useMemo(() => (p ? JSON.stringify(p) : null), [p]);

  const isDirty = useMemo(() => {
    if (!snapshotRef.current || !currentSnap) return false;
    return snapshotRef.current !== currentSnap;
  }, [currentSnap]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    if (isDirty) {
      window.addEventListener("beforeunload", onBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      if (!isDirty) return;
      const leave = window.confirm(
        "You have unsaved general settings. Leave this page without saving?"
      );
      if (!leave) {
        e.preventDefault();
        window.history.go(1);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty]);

  if (loading) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  if (loadErr) {
  return (
    <div className="p-4 md:p-5">
      <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
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

  const setField = <K extends keyof ProductsGeneral>(
    k: K,
    v: ProductsGeneral[K]
  ) => setP({ ...p, [k]: v });

  async function save() {
  if (!p) return;

  setErr({});
  setBanner(null);
  setSyncing(true);

  try {
    const res = await fetch("/api/settings/general", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products: p, sync: true }),
    });

    const text = await res.text().catch(() => "");
    const j = text ? JSON.parse(text) : {};

    if (!res.ok) {
      if (j.error && typeof j.error === "object") {
        setErr(j.error);
      }

      setBanner({
        type: "error",
        message:
  typeof j?.message === "string"
    ? j.message
    : "Could not save general settings.",
      });

      return;
    }

    const updated: ProductsGeneral = j?.products || p;

    setP(updated);
    snapshotRef.current = JSON.stringify(updated);

    setBanner({
      type: "success",
      message: "General settings saved & synced to store.",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setBanner(null), 2600);
  } catch {
    setBanner({
      type: "error",
      message: "Something went wrong while saving. Please try again.",
    });
  } finally {
    setSyncing(false);
  }
}
  return (
    <>
      {banner && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div
            className={`pointer-events-auto rounded-full px-4 py-1.5 text-sm font-medium shadow-lg ${
              banner.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-rose-500 text-white"
            }`}
          >
            {banner.message}
          </div>
        </div>
      )}

      <div className="space-y-4 p-3 md:space-y-5 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Store-wide product settings
              </div>
              <div className="mt-1 text-xs text-slate-500 md:text-sm">
                Control currency, measurement units, reviews, stock behaviour
                and pack slip return address.
              </div>
            </div>
          </div>
        </div>

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
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={p.reviewsEnabled}
              onChange={(e) => setField("reviewsEnabled", e.target.checked)}
            />
            <span>Enable product reviews</span>
          </label>
        </SectionCard>

        <SectionCard
          icon={<Warehouse className="h-5 w-5" />}
          title="Inventory"
          description="Automatic stock tracking, display settings and email alerts."
        >
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={p.manageStock}
              onChange={(e) => setField("manageStock", e.target.checked)}
            />
            <span>Enable stock management</span>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.notifyLowStock}
                onChange={(e) => setField("notifyLowStock", e.target.checked)}
              />
              <span>Low-stock notification</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.notifyNoStock}
                onChange={(e) => setField("notifyNoStock", e.target.checked)}
              />
              <span>Out-of-stock notification</span>
            </label>

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

          <div className="space-y-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/50 p-4">
            <label className="flex items-center gap-3 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.hideOutOfStock}
                onChange={(e) => setField("hideOutOfStock", e.target.checked)}
              />
              <span>Hide out-of-stock products from catalog</span>
            </label>

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
          title="Pack slips"
          description="Control the From / Return address printed on your pack slips."
        >
          <Field label="From / Return address">
            <textarea
              className={textareaClass + " whitespace-pre-wrap"}
              rows={4}
              placeholder="Your address"
              value={p.packslipReturnAddress}
              onChange={(e) => setField("packslipReturnAddress", e.target.value)}
            />
          </Field>

          <p className="text-xs text-slate-500">
            This address is printed on the bottom of each pack slip as the return
            or from address.
          </p>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={p.packslipShowReturn}
              onChange={(e) => setField("packslipShowReturn", e.target.checked)}
            />
            <span>Show return address on pack slips</span>
          </label>
        </SectionCard>

        <div className="sticky bottom-3 z-10 md:bottom-4">
          <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Save these settings and sync them to your store.
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
  <button
    disabled={syncing || !isDirty}
    onClick={() => save()}
    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
    title="Save and push these settings to your store"
  >
    <ShieldCheck className="h-4 w-4" />
    {syncing ? "Saving & syncing..." : "Save & Sync to Store"}
  </button>
</div>            </div>
          </div>
        </div>
      </div>
    </>
  );
}