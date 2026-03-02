"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  // NEW: pack slip options
  packslipReturnAddress: string;
  packslipShowReturn: boolean;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 placeholder:text-slate-500 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 shadow-sm focus:outline-none focus:ring-2 " +
  "focus:ring-indigo-500 focus:border-indigo-600";

const textareaClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm " +
  "text-slate-900 placeholder:text-slate-500 shadow-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-600";

const primaryBtnClass =
  "inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 " +
  "text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60";

const secondaryBtnClass =
  "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 " +
  "text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-60";

export default function GeneralTab() {
  const [p, setP] = useState<ProductsGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const [banner, setBanner] = useState<null | { type: "success" | "error"; message: string }>(null);
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

  // Warn on refresh / close
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

  // Warn on browser back
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

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (loadErr) {
    return (
      <div className="text-sm text-red-600">
        Failed to load: {loadErr}
        <div className="mt-1 text-xs text-slate-500">
          Make sure <code>src/app/api/settings/general/route.ts</code> exists and imports from{" "}
          <code>@/lib/settingsStore</code>, and that <code>getSettings().general.products</code> has defaults.
        </div>
      </div>
    );
  }
  if (!p) return null;

  const setField = <K extends keyof ProductsGeneral>(k: K, v: ProductsGeneral[K]) =>
    setP({ ...p, [k]: v });

  async function save(sync: boolean) {
    if (!p) return;
    setErr({});
    setBanner(null);
    (sync ? setSyncing : setSaving)(true);

    try {
      const res = await fetch("/api/settings/general", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: p, sync }),
      });

      const text = await res.text().catch(() => "");
      const j = text ? JSON.parse(text) : {};

      if (!res.ok) {
        if (j.error && typeof j.error === "object") {
          setErr(j.error);
        }
        setBanner({
          type: "error",
          message: "Could not save general settings. Please check the fields highlighted in red.",
        });
        return;
      }

      const updated: ProductsGeneral = j?.products || p;
      setP(updated);
      snapshotRef.current = JSON.stringify(updated);

      const msg = sync
        ? j.synced
          ? "Saved & synced to WooCommerce store."
          : "Saved, but sync to store failed."
        : "General settings saved successfully.";

      setBanner({ type: "success", message: msg });
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setBanner(null), 2600);
    } catch {
      setBanner({
        type: "error",
        message: "Something went wrong while saving. Please try again.",
      });
    } finally {
      (sync ? setSyncing : setSaving)(false);
    }
  }

  return (
    <>
      {/* Top banner */}
      {banner && (
        <div className="fixed top-[72px] left-0 right-0 z-40 flex justify-center pointer-events-none">
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

      <div className="space-y-6 max-w-4xl">
        {/* Intro */}
        <header className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-900">
            Store-wide product settings
          </h3>
          <p className="text-xs text-slate-500">
            Control default currency, measurement units, reviews, stock behaviour and pack slip
            return address for your store.
          </p>
        </header>

        {/* Currency & Pricing */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Currency &amp; pricing
              </h4>
              <p className="text-[11px] text-slate-500">
                These settings control how prices are displayed in your store.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Currency
              </label>
              <select
                className={selectClass}
                value={p.currency}
                onChange={(e) => setField("currency", e.target.value)}
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Price decimals
              </label>
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
              {err.priceDecimals && (
                <p className="mt-1 text-xs text-rose-600">
                  {err.priceDecimals}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Measurements */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Measurements</h4>
            <p className="text-[11px] text-slate-500">
              Used for shipping weights and product dimensions in WooCommerce.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Weight unit
              </label>
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
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Dimensions unit
              </label>
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
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Reviews</h4>
              <p className="text-[11px] text-slate-500">
                Control whether customers can leave product reviews.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.reviewsEnabled}
                onChange={(e) => setField("reviewsEnabled", e.target.checked)}
              />
              Enable product reviews
            </label>
          </div>
        </section>

        {/* Inventory */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Inventory</h4>
            <p className="text-[11px] text-slate-500">
              Automatic stock tracking and notification settings.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={p.manageStock}
              onChange={(e) => setField("manageStock", e.target.checked)}
            />
            Enable stock management
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.notifyLowStock}
                onChange={(e) => setField("notifyLowStock", e.target.checked)}
              />
              Low-stock notification
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.notifyNoStock}
                onChange={(e) => setField("notifyNoStock", e.target.checked)}
              />
              Out-of-stock notification
            </label>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Notification recipient (email)
              </label>
              <input
                className={inputClass}
                value={p.stockEmailRecipient}
                onChange={(e) =>
                  setField("stockEmailRecipient", e.target.value)
                }
                placeholder="alerts@yourstore.com"
              />
              {err.stockEmailRecipient && (
                <p className="mt-1 text-xs text-rose-600">
                  {err.stockEmailRecipient}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Low-stock threshold
              </label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={p.lowStockThreshold}
                onChange={(e) =>
                  setField(
                    "lowStockThreshold",
                    Math.max(0, Number(e.target.value))
                  )
                }
              />
              {err.lowStockThreshold && (
                <p className="mt-1 text-xs text-rose-600">
                  {err.lowStockThreshold}
                </p>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-dashed border-slate-200 space-y-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={p.hideOutOfStock}
                onChange={(e) => setField("hideOutOfStock", e.target.checked)}
              />
              Hide out-of-stock products from catalog
            </label>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Stock display format
              </label>
              <select
                className={selectClass}
                value={p.stockDisplayFormat}
                onChange={(e) =>
                  setField("stockDisplayFormat", e.target.value as any)
                }
              >
                <option value="no_amount">Never show quantity remaining</option>
                <option value="always">
                  Always show quantity (“2 in stock”)
                </option>
                <option value="low_amount">
                  Only when low (“Only 2 left in stock”)
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* Pack slips */}
        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 md:p-5 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Pack slips</h4>
            <p className="text-[11px] text-slate-500">
              Control the From / Return address printed on your pack slips.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              From / Return address
            </label>
            <textarea
              className={textareaClass + " whitespace-pre-wrap"}
              rows={3}
              placeholder={`e.g.\nMosin Boutique\nNo. 12, ABC Street,\nBangalore - 5600xx\nMobile: 9xxxxxxxxx`}
              value={p.packslipReturnAddress}
              onChange={(e) =>
                setField("packslipReturnAddress", e.target.value)
              }
            />
            <p className="mt-1 text-[11px] text-slate-500">
              This address is printed on the bottom of each pack slip as the
              return / from address.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              checked={p.packslipShowReturn}
              onChange={(e) => setField("packslipShowReturn", e.target.checked)}
            />
            Show return address on pack slips
          </label>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          
          <button
            disabled={syncing}
            onClick={() => save(true)}
            className={secondaryBtnClass}
            title="Save and push these settings to your WooCommerce store"
          >
            {syncing ? "Saving & syncing…" : "Save & Sync to Store"}
          </button>

          {!isDirty && (
            <span className="text-xs text-emerald-600">
              All changes saved.
            </span>
          )}
          {isDirty && (
            <span className="text-xs text-amber-600">
              You have unsaved changes.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
