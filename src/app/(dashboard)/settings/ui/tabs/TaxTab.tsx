"use client";

import { useEffect, useState } from "react";

type TaxSettings = {
  enable: boolean;
  prices_include_tax: "yes" | "no"; // woo expects yes/no
  display_shop: "incl" | "excl";
  display_cart: "incl" | "excl";
  round_subtotal: "yes" | "no";
  based_on: "shipping" | "billing" | "base";

  store_state: string; // e.g., "KA"
  gst_number: string;
  legal_name: string;
  trade_name: string;
  gst_slab: 0 | 5 | 12 | 18;
};

const IN_STATES = [
  { code: "AN", name: "Andaman and Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CT", name: "Chhattisgarh" },
  { code: "DN", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu and Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OR", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TG", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UT", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

const DEFAULT_TAX: TaxSettings = {
  enable: false,
  prices_include_tax: "yes",
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

export default function TaxTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const [st, setSt] = useState<TaxSettings>(DEFAULT_TAX);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/tax/settings", { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error || "Failed to load tax settings");

        // Defensive: merge with defaults so nothing is undefined/null
        const safe: TaxSettings = {
          ...DEFAULT_TAX,
          ...(j || {}),
          enable: !!j?.enable,
          prices_include_tax: j?.prices_include_tax === "no" ? "no" : "yes",
          display_shop: j?.display_shop === "excl" ? "excl" : "incl",
          display_cart: j?.display_cart === "excl" ? "excl" : "incl",
          round_subtotal: j?.round_subtotal === "no" ? "no" : "yes",
          based_on:
            j?.based_on === "billing"
              ? "billing"
              : j?.based_on === "base"
              ? "base"
              : "shipping",
          store_state: j?.store_state || "KA",
          gst_number: j?.gst_number || "",
          legal_name: j?.legal_name || "",
          trade_name: j?.trade_name || "",
          gst_slab:
            j?.gst_slab === 0 ||
            j?.gst_slab === 5 ||
            j?.gst_slab === 12 ||
            j?.gst_slab === 18
              ? j.gst_slab
              : 18,
        };

        setSt(safe);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || "Failed to load tax settings");
        setSt(DEFAULT_TAX);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleEnable = () =>
    setSt((prev) => ({ ...prev, enable: !prev.enable }));

  async function save() {
    try {
      setSaving(true);
      setErr("");
      setSaveBanner(null);

      // 1) Save Woo tax settings
      const res = await fetch("/api/tax/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(st),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Save failed");

      // merge back what server returns (if any)
      if (j && typeof j === "object") {
        setSt((prev) => ({
          ...prev,
          ...(j as Partial<TaxSettings>),
        }));
      }

      const ratePercent = Number(j?.gst_slab ?? st.gst_slab);
      const want = st.enable ? ratePercent : 0;

      // 2) Auto-sync Standard rate (uniform GST slab) – non-blocking
      try {
        const r2 = await fetch("/api/tax/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ratePercent: want, // 0 | 5 | 12 | 18
            scope: "all",
          }),
        });
        await r2.json().catch(() => null);
        if (!r2.ok) {
          console.warn("GST rate sync failed");
        }
      } catch (syncErr) {
        console.warn("GST rate sync error", syncErr);
      }

      // ✅ success banner
      setSaveBanner("Tax settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaveBanner(null), 4000);
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-slate-500">Loading tax settings…</div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Success banner */}
      {saveBanner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 shadow-sm">
          {saveBanner}
        </div>
      )}

      {/* Heading */}
      <header className="space-y-1">
        <h2 className="text-xl font-semibold text-slate-900">Tax & GST</h2>
        <p className="text-xs text-slate-500">
          Control how prices include tax, how GST is calculated, and store
          location for GST place-of-supply rules.
        </p>
      </header>

      {/* Error banner */}
      {err && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {err}
        </div>
      )}

      {/* Tax engine card */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Tax engine
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-[2px] text-[10px] font-medium uppercase tracking-wide text-slate-500">
                GST
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Turn this on if you want GST to be calculated on orders. If off,
              no tax lines are added.
            </p>
          </div>

          {/* Toggle */}
          <button
            type="button"
            onClick={toggleEnable}
            className={`relative flex h-6 w-11 items-center rounded-full border transition-colors ${
              st.enable
                ? "border-emerald-500 bg-emerald-500/90"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                st.enable ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>

        {!st.enable && (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
            Tax is currently <span className="font-semibold">disabled</span>. We
            will still remember your GST settings below, but they won&apos;t be
            applied until you enable tax.
          </div>
        )}

        {st.enable && (
          <div className="grid gap-4 pt-1 md:grid-cols-2">
            {/* Prices entered */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Product prices are entered
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={st.prices_include_tax}
                onChange={(e) => {
                  const value = e.target.value as "yes" | "no";
                  setSt((prev) => ({
                    ...prev,
                    prices_include_tax: value,
                  }));
                }}
              >
                <option value="yes">Inclusive of tax (MRP style)</option>
                <option value="no">Exclusive of tax (tax added on top)</option>
              </select>
            </div>

            {/* Based on */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Calculate tax based on
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={st.based_on}
                onChange={(e) => {
                  const value = e.target.value as "shipping" | "billing" | "base";
                  setSt((prev) => ({
                    ...prev,
                    based_on: value,
                  }));
                }}
              >
                <option value="shipping">Customer shipping address</option>
                <option value="billing">Customer billing address</option>
                <option value="base">Store base address</option>
              </select>
            </div>

            {/* Display shop */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Display prices in shop
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={st.display_shop}
                onChange={(e) => {
                  const value = e.target.value as "incl" | "excl";
                  setSt((prev) => ({
                    ...prev,
                    display_shop: value,
                  }));
                }}
              >
                <option value="incl">Including tax</option>
                <option value="excl">Excluding tax</option>
              </select>
            </div>

            {/* Display cart */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Display prices in cart/checkout
              </label>
              <select
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                value={st.display_cart}
                onChange={(e) => {
                  const value = e.target.value as "incl" | "excl";
                  setSt((prev) => ({
                    ...prev,
                    display_cart: value,
                  }));
                }}
              >
                <option value="incl">Including tax</option>
                <option value="excl">Excluding tax</option>
              </select>
            </div>

            {/* Rounding */}
            <div className="md:col-span-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={st.round_subtotal === "yes"}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setSt((prev) => ({
                    ...prev,
                    round_subtotal: checked ? "yes" : "no",
                  }));
                }}
              />
              <span className="text-xs text-slate-700">
                Round tax at order subtotal instead of per line item.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Store location */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Store base state
            </h3>
            <p className="text-[11px] text-slate-500">
              Used as the place of supply for IGST vs CGST+SGST calculations.
            </p>
          </div>
        </div>

        <div className="grid gap-3 pt-1 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Store state (place of supply)
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={st.store_state}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, store_state: value }));
              }}
            >
              {IN_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              This also updates WooCommerce base location to{" "}
              <span className="font-mono text-[10px]">IN:{st.store_state}</span>.
            </p>
          </div>
        </div>
      </section>

      {/* GST information */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              GST information (India)
            </h3>
            <p className="text-[11px] text-slate-500">
              We use this to create a single standard GST rate for all
              products. You can fine-tune later if required.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-[2px] text-[10px] font-medium text-emerald-700">
            Uniform GST slab
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              GSTIN
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={st.gst_number}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, gst_number: value }));
              }}
              placeholder="22AAAAA0000A1Z5"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Legal name (as per GST)
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={st.legal_name}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, legal_name: value }));
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Trade name / Brand
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={st.trade_name}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, trade_name: value }));
              }}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              GST slab for products
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              value={st.gst_slab}
              onChange={(e) => {
                const value = Number(e.target.value) as 0 | 5 | 12 | 18;
                setSt((prev) => ({
                  ...prev,
                  gst_slab: value,
                }));
              }}
            >
              <option value={0}>0% (exempt / nil)</option>
              <option value={5}>5%</option>
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              We push this to the WooCommerce “Standard rate” table automatically.
            </p>
          </div>
        </div>
      </section>

      {/* CTA bar */}
      <div className="flex justify-end pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save tax settings"}
        </button>
      </div>
    </div>
  );
}
