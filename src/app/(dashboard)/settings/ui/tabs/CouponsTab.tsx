// src/app/settings/ui/tabs/CouponsTab.tsx
"use client";

import { useEffect, useState } from "react";

export interface WCCoupon {
  id: number;
  code: string;
  discount_type: string;
  amount: string;
  date_expires?: string | null;
  description?: string;
  usage_limit?: number | null;
  usage_count?: number;
  minimum_amount?: string;
  status?: string;
}

type FormState = {
  id?: number;
  code: string;
  discount_type: "percent" | "fixed_cart" | "fixed_product";
  amount: string;
  description: string;
  date_expires: string;
  minimum_amount: string;
  usage_limit: string;
};

const emptyForm = (): FormState => ({
  code: "",
  discount_type: "percent",
  amount: "",
  description: "",
  date_expires: "",
  minimum_amount: "",
  usage_limit: "",
});

function usageSummary(c: WCCoupon) {
  const used = c.usage_count || 0;
  const lim =
    typeof c.usage_limit === "number" && !Number.isNaN(c.usage_limit)
      ? c.usage_limit
      : null;
  if (!lim) return `${used} used`;
  return `${used} of ${lim} used`;
}

function statusLabel(c: WCCoupon) {
  const today = new Date().toISOString().slice(0, 10);
  if (c.status === "trash") return "Trash";
  if (c.date_expires && c.date_expires.slice(0, 10) < today) return "Expired";
  return "Active";
}

type Banner = { type: "success" | "error"; message: string } | null;

export default function CouponsTab() {
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState<WCCoupon[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const editing = !!form?.id;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/coupons", { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) {
          throw new Error(j?.error || "Failed to load coupons");
        }
        if (!cancelled) {
          setCoupons(Array.isArray(j.data) ? j.data : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load coupons");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(c: WCCoupon) {
    setForm({
      id: c.id,
      code: c.code || "",
      discount_type:
        (c.discount_type as FormState["discount_type"]) || "percent",
      amount: c.amount || "",
      description: c.description || "",
      date_expires: c.date_expires ? c.date_expires.slice(0, 10) : "",
      minimum_amount: c.minimum_amount || "",
      usage_limit:
        typeof c.usage_limit === "number" ? String(c.usage_limit) : "",
    });
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setForm(null);
    setBanner(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;

    if (!form.code.trim()) {
      alert("Coupon code is required.");
      return;
    }
    if (!form.amount.trim()) {
      alert("Discount amount is required.");
      return;
    }

    setSaving(true);
    setBanner(null);
    try {
      const payload = {
        code: form.code.trim(),
        discount_type: form.discount_type,
        amount: form.amount.trim(),
        description: form.description.trim(),
        date_expires: form.date_expires || null,
        minimum_amount: form.minimum_amount.trim() || "",
        usage_limit: form.usage_limit
          ? Number.parseInt(form.usage_limit, 10)
          : null,
      };

      let res: Response;
      if (editing && form.id) {
        res = await fetch(`/api/coupons/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/coupons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const j = await res.json();
      if (!res.ok) {
        setBanner({
          type: "error",
          message: j?.error || "Save failed",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const saved: WCCoupon = j.data;

      setCoupons((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });

      setBanner({
        type: "success",
        message: editing ? "Coupon updated." : "Coupon created.",
      });
      closeForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setBanner({ type: "error", message: "Save failed" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setBanner(null);
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBanner({
          type: "error",
          message: j?.error || "Delete failed",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      setBanner({ type: "success", message: "Coupon deleted." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error(err);
      setBanner({ type: "error", message: "Delete failed" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">Coupons</h2>
          <p className="text-[11px] text-slate-500">
            Create simple discount codes for your store. These are standard
            WooCommerce coupons and apply directly at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          + Add coupon
        </button>
      </div>

      {/* Banner */}
      {banner && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* Create / Edit form */}
      {form && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                {editing ? "Edit coupon" : "New coupon"}
              </h3>
              <p className="text-[11px] text-slate-500">
                Set a code, discount type and optional minimum order amount.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="text-[11px] text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* top row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Coupon code
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs uppercase tracking-wide focus:bg-white"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, code: e.target.value })
                  }
                  placeholder="WELCOME10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Discount type
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm(
                      (f) =>
                        f && {
                          ...f,
                          discount_type:
                            e.target.value as FormState["discount_type"],
                        }
                    )
                  }
                >
                  <option value="percent">Percentage discount (%)</option>
                  <option value="fixed_cart">Fixed cart discount (₹)</option>
                  <option value="fixed_product">Fixed product discount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Discount amount
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, amount: e.target.value })
                  }
                  placeholder="10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Expiry date (optional)
                </label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={form.date_expires}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, date_expires: e.target.value })
                  }
                />
              </div>
            </div>

            {/* second row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Minimum order amount (₹)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={form.minimum_amount}
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, minimum_amount: e.target.value }
                    )
                  }
                  placeholder="0"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Leave blank for no minimum.
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Usage limit (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, usage_limit: e.target.value })
                  }
                  placeholder="e.g. 50"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  Total number of times this coupon can be used.
                </p>
              </div>
            </div>

            {/* description */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Internal note / description
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs min-h-[70px] focus:bg-white"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => f && { ...f, description: e.target.value })
                }
                placeholder="E.g. Diwali 10% sitewide, not for resellers"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-60"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Update coupon"
                  : "Create coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons list */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-800">
            Existing coupon codes
          </div>
          <div className="text-[11px] text-slate-500">
            {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr className="border-b border-slate-100">
                <th className="px-3 py-2 text-left font-medium">Code</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-left font-medium">Amount</th>
                <th className="px-3 py-2 text-left font-medium">Usage</th>
                <th className="px-3 py-2 text-left font-medium">Expires</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    Loading coupons…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-5 text-center text-rose-600"
                  >
                    {error}
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                coupons.map((c, idx) => {
                  const status = statusLabel(c);
                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-slate-100 ${
                        idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                      }`}
                    >
                      <td className="px-3 py-2 font-mono text-[11px] uppercase">
                        {c.code}
                      </td>
                      <td className="px-3 py-2">
                        {c.discount_type === "percent"
                          ? "Percent"
                          : c.discount_type === "fixed_cart"
                          ? "Fixed cart"
                          : c.discount_type === "fixed_product"
                          ? "Fixed product"
                          : c.discount_type}
                      </td>
                      <td className="px-3 py-2">{c.amount}</td>
                      <td className="px-3 py-2">{usageSummary(c)}</td>
                      <td className="px-3 py-2">
                        {c.date_expires ? c.date_expires.slice(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-medium ${
                            status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : status === "Expired"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-[11px] text-indigo-600 hover:underline"
                            onClick={() => openEdit(c)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-[11px] text-rose-600 hover:underline"
                            onClick={() => handleDelete(c.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && !error && coupons.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-5 text-center text-slate-500"
                  >
                    No coupons yet. Click{" "}
                    <span className="font-medium">“Add coupon”</span> to create
                    your first code.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
