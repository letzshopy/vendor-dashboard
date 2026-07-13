"use client";

import { useEffect, useState } from "react";
import {
  BadgePercent,
  MapPinned,
  ReceiptText,
  Save,
  Settings2,
} from "lucide-react";

type TaxSettings = {
  enable: boolean;
  prices_include_tax: "yes" | "no";
  display_shop: "incl" | "excl";
  display_cart: "incl" | "excl";
  round_subtotal: "yes" | "no";
  based_on: "shipping" | "billing" | "base";
  store_state: string;
  gst_number: string;
  legal_name: string;
  trade_name: string;
  gst_slab: 0 | 5 | 12 | 18;
};

type JsonRecord = Record<string, unknown>;

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

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function errorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error &&
    error.message
    ? error.message
    : fallback;
}

function normalizeTaxSettings(
  value: unknown
): TaxSettings {
  const data = isRecord(value)
    ? value
    : {};
  const slab = data.gst_slab;

  return {
    enable: data.enable === true,
    prices_include_tax:
      data.prices_include_tax === "no"
        ? "no"
        : "yes",
    display_shop:
      data.display_shop === "excl"
        ? "excl"
        : "incl",
    display_cart:
      data.display_cart === "excl"
        ? "excl"
        : "incl",
    round_subtotal:
      data.round_subtotal === "no"
        ? "no"
        : "yes",
    based_on:
      data.based_on === "billing"
        ? "billing"
        : data.based_on === "base"
          ? "base"
          : "shipping",
    store_state:
      typeof data.store_state === "string"
        ? data.store_state
        : DEFAULT_TAX.store_state,
    gst_number:
      typeof data.gst_number === "string"
        ? data.gst_number
        : "",
    legal_name:
      typeof data.legal_name === "string"
        ? data.legal_name
        : "",
    trade_name:
      typeof data.trade_name === "string"
        ? data.trade_name
        : "",
    gst_slab:
      slab === 0 ||
      slab === 5 ||
      slab === 12 ||
      slab === 18
        ? slab
        : DEFAULT_TAX.gst_slab,
  };
}

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const selectClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

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
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function TaxTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [st, setSt] = useState<TaxSettings>(DEFAULT_TAX);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch("/api/tax/settings", { cache: "no-store" });
        const parsed: unknown =
          await res.json().catch(() => null);
        const response = isRecord(parsed)
          ? parsed
          : {};

        if (!res.ok) {
          throw new Error(
            typeof response.error === "string"
              ? response.error
              : "Failed to load tax settings"
          );
        }

        setSt(
          normalizeTaxSettings(response)
        );
      } catch (error: unknown) {
        console.error(error);
        setErr(
          errorMessage(
            error,
            "Failed to load tax settings"
          )
        );
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

      const res = await fetch("/api/tax/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(st),
      });
      const parsed: unknown =
        await res.json().catch(() => null);
      const response = isRecord(parsed)
        ? parsed
        : {};

      if (!res.ok) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Save failed"
        );
      }

      setSt(
        normalizeTaxSettings(response)
      );

      setSaveBanner("Tax settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaveBanner(null), 4000);
    } catch (error: unknown) {
      console.error(error);
      setErr(
        errorMessage(
          error,
          "Save failed"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading tax settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 md:space-y-5 md:p-5">
      {saveBanner && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            {saveBanner}
          </div>
        </div>
      )}

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <BadgePercent className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-900">
              Tax & GST
            </div>
            <div className="mt-1 text-xs text-slate-500 md:text-sm">
              Control how tax is calculated, displayed, and synced for your
              store.
            </div>
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
          {err}
        </div>
      )}

      <SectionCard
        icon={<Settings2 className="h-5 w-5" />}
        title="Tax engine"
        description="Enable GST calculation and control how prices are entered and displayed."
      >
        <div className="flex items-start justify-between gap-4 rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Enable tax calculation
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                GST
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Turn this on if you want GST to be added to customer orders.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleEnable}
            className={`relative mt-0.5 flex h-7 w-12 items-center rounded-full border transition-colors ${
              st.enable
                ? "border-emerald-500 bg-emerald-500"
                : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                st.enable ? "translate-x-[25px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>

        {!st.enable && (
          <div className="rounded-[20px] border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tax is currently disabled. Your GST information will still be saved,
            but tax will not be added to orders until enabled.
          </div>
        )}

        {st.enable && (
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Product prices are entered">
              <select
                className={selectClass}
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
            </Field>

            <Field label="Calculate tax based on">
              <select
                className={selectClass}
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
            </Field>

            <Field label="Display prices in shop">
              <select
                className={selectClass}
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
            </Field>

            <Field label="Display prices in cart / checkout">
              <select
                className={selectClass}
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
            </Field>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-800">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  checked={st.round_subtotal === "yes"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setSt((prev) => ({
                      ...prev,
                      round_subtotal: checked ? "yes" : "no",
                    }));
                  }}
                />
                <span>Round tax at order subtotal instead of per line item</span>
              </label>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon={<MapPinned className="h-5 w-5" />}
        title="Store base state"
        description="Used for place-of-supply rules and IGST vs CGST/SGST logic."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Store state"
            hint={`This updates base location to IN:${st.store_state}.`}
          >
            <select
              className={selectClass}
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
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        icon={<ReceiptText className="h-5 w-5" />}
        title="GST information"
        description="This is used to create one uniform standard GST rate for your products."
      >
        <div className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Uniform GST slab
            </div>
            <p className="mt-1 text-xs text-slate-500">
              We push this slab to the Standard rate table automatically.
            </p>
          </div>

          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Auto sync
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="GSTIN">
            <input
              className={inputClass}
              value={st.gst_number}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, gst_number: value }));
              }}
              placeholder="22AAAAA0000A1Z5"
            />
          </Field>

          <Field label="Legal name (as per GST)">
            <input
              className={inputClass}
              value={st.legal_name}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, legal_name: value }));
              }}
              placeholder="Legal business name"
            />
          </Field>

          <Field label="Trade name / Brand">
            <input
              className={inputClass}
              value={st.trade_name}
              onChange={(e) => {
                const value = e.target.value;
                setSt((prev) => ({ ...prev, trade_name: value }));
              }}
              placeholder="Store or brand name"
            />
          </Field>

          <Field
            label="GST slab for products"
            hint="Use a single slab if all products fall under one GST rate."
          >
            <select
              className={selectClass}
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
          </Field>
        </div>
      </SectionCard>

      <div className="sticky bottom-3 z-10 md:bottom-4">
        <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">
                Ready to apply tax settings
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Save these settings and sync the standard GST rate to your store.
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save tax settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
