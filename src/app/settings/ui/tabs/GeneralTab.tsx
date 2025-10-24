"use client";

import { useEffect, useState } from "react";

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
};

export default function GeneralTab() {
  const [p, setP] = useState<ProductsGeneral | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/general", { cache: "no-store" });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }
        // guard: handle empty body safely
        const text = await res.text();
        if (!text) throw new Error("Empty response from /api/settings/general");
        const j = JSON.parse(text);
        if (!j?.products) throw new Error("Missing products in response");
        setP(j.products as ProductsGeneral);
      } catch (e: any) {
        setLoadErr(e?.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (loadErr) {
    return (
      <div className="text-sm text-red-600">
        Failed to load: {loadErr}
        <div className="text-xs text-slate-500 mt-1">
          Make sure <code>src/app/api/settings/general/route.ts</code> exists and imports from{" "}
          <code>@/lib/settingsStore</code> (not <code>@/src/...</code>), and that
          <code>getSettings().general.products</code> has defaults.
        </div>
      </div>
    );
  }
  if (!p) return null;

  const set = <K extends keyof ProductsGeneral>(k: K, v: ProductsGeneral[K]) =>
    setP({ ...p, [k]: v });

  async function save(sync: boolean) {
    setErr({});
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
        setErr(j.error || {});
        throw new Error("Validation failed");
      }
      if (j?.products) setP(j.products);
      alert(sync ? (j.synced ? "Saved & synced to store." : "Saved (sync failed).") : "Saved.");
    } catch {
      /* already surfaced validation in UI */
    } finally {
      (sync ? setSyncing : setSaving)(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Currency & Pricing */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Currency & Pricing</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Currency</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.currency}
              onChange={e => set("currency", e.target.value)}
            >
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Price decimals</label>
            <input
              type="number"
              min={0}
              max={4}
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.priceDecimals}
              onChange={e => set("priceDecimals", Math.max(0, Math.min(4, Number(e.target.value))))}
            />
            {err.priceDecimals && <p className="text-xs text-red-600 mt-1">{err.priceDecimals}</p>}
          </div>
        </div>
      </section>

      {/* Measurements */}
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Measurements</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Weight unit</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.weightUnit}
              onChange={e => set("weightUnit", e.target.value as any)}
            >
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="lb">lb</option>
              <option value="oz">oz</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Dimensions unit</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.dimensionUnit}
              onChange={e => set("dimensionUnit", e.target.value as any)}
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
      <section className="border rounded-lg p-4">
        <div className="font-medium mb-3">Reviews</div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={p.reviewsEnabled}
            onChange={e => set("reviewsEnabled", e.target.checked)}
          />
          Enable product reviews
        </label>
      </section>

      {/* Inventory */}
      <section className="border rounded-lg p-4 space-y-4">
        <div className="font-medium">Inventory</div>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={p.manageStock}
            onChange={e => set("manageStock", e.target.checked)}
          />
          Enable stock management
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.notifyLowStock}
              onChange={e => set("notifyLowStock", e.target.checked)}
            />
            Low-stock notification
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.notifyNoStock}
              onChange={e => set("notifyNoStock", e.target.checked)}
            />
            Out-of-stock notification
          </label>

          <div>
            <label className="block text-sm mb-1">Notification recipient (email)</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.stockEmailRecipient}
              onChange={e => set("stockEmailRecipient", e.target.value)}
              placeholder="alerts@vendor.com"
            />
            {err.stockEmailRecipient && <p className="text-xs text-red-600 mt-1">{err.stockEmailRecipient}</p>}
          </div>

          <div>
            <label className="block text-sm mb-1">Low-stock threshold</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.lowStockThreshold}
              onChange={e => set("lowStockThreshold", Math.max(0, Number(e.target.value)))}
            />
            {err.lowStockThreshold && <p className="text-xs text-red-600 mt-1">{err.lowStockThreshold}</p>}
          </div>
        </div>

        <div className="pt-2 border-t">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={p.hideOutOfStock}
              onChange={e => set("hideOutOfStock", e.target.checked)}
            />
            Hide out-of-stock items from catalog
          </label>

          <div className="mt-3">
            <label className="block text-sm mb-1">Stock display format</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={p.stockDisplayFormat}
              onChange={e => set("stockDisplayFormat", e.target.value as any)}
            >
              <option value="no_amount">Never show quantity remaining</option>
              <option value="always">Always show quantity remaining (“2 in stock”)</option>
              <option value="low_amount">Only show when low (“Only 2 left in stock”)</option>
            </select>
          </div>
        </div>
      </section>

      {/* CTAs */}
      <div className="flex gap-2">
        <button
          disabled={saving}
          onClick={() => save(false)}
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          disabled={syncing}
          onClick={() => save(true)}
          className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          title="Save and push to your Woo store"
        >
          {syncing ? "Saving & syncing…" : "Save & Sync to Store"}
        </button>
      </div>
    </div>
  );
}
