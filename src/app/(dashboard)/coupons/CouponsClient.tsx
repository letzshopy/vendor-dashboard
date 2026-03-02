// src/app/coupons/CouponsClient.tsx
"use client";

import { useState } from "react";
import type { WCCoupon } from "./page";

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

function emptyForm(): FormState {
  return {
    code: "",
    discount_type: "percent",
    amount: "",
    description: "",
    date_expires: "",
    minimum_amount: "",
    usage_limit: "",
  };
}

export default function CouponsClient({ initial }: { initial: WCCoupon[] }) {
  const [coupons, setCoupons] = useState<WCCoupon[]>(initial);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = !!form?.id;

  function openCreate() {
    setForm(emptyForm());
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
  }

  function closeForm() {
    setForm(null);
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
        alert(j?.error || "Save failed");
        return;
      }

      const saved: WCCoupon = j.data;

      setCoupons((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === saved.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });

      closeForm();
    } catch (err: any) {
      console.error(err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Delete failed");
        return;
      }
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      console.error(err);
      alert("Delete failed");
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-3">
        <div className="text-sm text-slate-600">
          Manage basic discount codes for your store.
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-3 py-1 rounded bg-black text-white text-sm"
        >
          + Add Coupon
        </button>
      </div>

      {/* Form panel */}
      {form && (
        <div className="bg-white rounded-lg shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">
              {editing ? "Edit coupon" : "Add coupon"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              className="text-sm text-slate-500 hover:underline"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Code
                </label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, code: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Discount type
                </label>
                <select
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm(
                      (f) =>
                        f && {
                          ...f,
                          discount_type:
                            e.target
                              .value as FormState["discount_type"],
                        }
                    )
                  }
                >
                  <option value="percent">Percentage discount (%)</option>
                  <option value="fixed_cart">Fixed cart discount</option>
                  <option value="fixed_product">Fixed product discount</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Amount
                </label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, amount: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Expiry date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.date_expires}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, date_expires: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Minimum order amount (₹)
                </label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.minimum_amount}
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, minimum_amount: e.target.value }
                    )
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  Usage limit (optional)
                </label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, usage_limit: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">
                Description (for your reference)
              </label>
              <textarea
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => f && { ...f, description: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="border rounded px-3 py-1 text-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded bg-black text-white text-sm"
                disabled={saving}
              >
                {saving ? "Saving…" : editing ? "Update coupon" : "Create coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Usage</th>
              <th className="p-2 text-left">Expires</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 font-mono">{c.code}</td>
                <td className="p-2">
                  {c.discount_type === "percent"
                    ? "Percent"
                    : c.discount_type === "fixed_cart"
                    ? "Fixed cart"
                    : c.discount_type === "fixed_product"
                    ? "Fixed product"
                    : c.discount_type}
                </td>
                <td className="p-2">{c.amount}</td>
                <td className="p-2">{usageSummary(c)}</td>
                <td className="p-2">
                  {c.date_expires ? c.date_expires.slice(0, 10) : "—"}
                </td>
                <td className="p-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                      statusLabel(c) === "Active"
                        ? "bg-green-100 text-green-700"
                        : statusLabel(c) === "Expired"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {statusLabel(c)}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => handleDelete(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td className="p-4 text-center text-slate-500" colSpan={7}>
                  No coupons yet. Click “Add Coupon” to create your first code.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
