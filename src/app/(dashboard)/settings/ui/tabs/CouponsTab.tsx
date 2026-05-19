"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  CircleAlert,
  PencilLine,
  Plus,
  Tag,
  TicketPercent,
  Trash2,
  X,
  CheckCircle2,
  ReceiptText,
  BadgeInfo,
} from "lucide-react";

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

function discountTypeLabel(type: string) {
  if (type === "percent") return "Percentage";
  if (type === "fixed_cart") return "Fixed cart";
  if (type === "fixed_product") return "Fixed product";
  return type;
}

function statusClasses(status: string) {
  if (status === "Active") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (status === "Expired") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

type Banner = { type: "success" | "error"; message: string } | null;

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

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

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
    </div>
  );
}

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

  const stats = useMemo(() => {
    const active = coupons.filter((c) => statusLabel(c) === "Active").length;
    const expired = coupons.filter((c) => statusLabel(c) === "Expired").length;
    return {
      total: coupons.length,
      active,
      expired,
    };
  }, [coupons]);

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

      setForm(null);
      setBanner({
        type: "success",
        message: editing ? "Coupon updated." : "Coupon created.",
      });
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
    <div className="space-y-4 p-3 md:space-y-5 md:p-5">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <TicketPercent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                Coupons
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Create and manage discount codes for your store checkout.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add coupon</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-[20px] border px-4 py-3 text-sm shadow-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-start gap-2">
            {banner.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<ReceiptText className="h-4 w-4" />}
          label="Total coupons"
          value={stats.total}
        />
        <SummaryCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Active"
          value={stats.active}
        />
        <SummaryCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Expired"
          value={stats.expired}
        />
      </div>

      {form && (
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editing ? "Edit coupon" : "New coupon"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Set coupon code, discount type and usage rules.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Coupon code">
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11 uppercase tracking-wide`}
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, code: e.target.value })
                    }
                    placeholder="WELCOME10"
                  />
                </div>
              </Field>

              <Field label="Discount type">
                <select
                  className={inputClass}
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
              </Field>

              <Field label="Discount amount">
                <div className="relative">
                  <BadgePercent className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11`}
                    value={form.amount}
                    onChange={(e) =>
                      setForm((f) => f && { ...f, amount: e.target.value })
                    }
                    placeholder="10"
                  />
                </div>
              </Field>

              <Field label="Expiry date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.date_expires}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, date_expires: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Minimum order amount"
                hint="Leave blank if there is no minimum cart value."
              >
                <input
                  className={inputClass}
                  value={form.minimum_amount}
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, minimum_amount: e.target.value }
                    )
                  }
                  placeholder="0"
                />
              </Field>

              <Field
                label="Usage limit"
                hint="Total number of times this coupon can be used."
              >
                <input
                  className={inputClass}
                  value={form.usage_limit}
                  onChange={(e) =>
                    setForm((f) => f && { ...f, usage_limit: e.target.value })
                  }
                  placeholder="e.g. 50"
                />
              </Field>
            </div>

            <Field label="Internal note / description">
              <textarea
                className={textareaClass}
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => f && { ...f, description: e.target.value })
                }
                placeholder="Example: Festival offer, reseller orders excluded"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editing
                  ? "Update coupon"
                  : "Create coupon"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/30 px-4 py-4 md:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Existing coupon codes
              </h3>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                View and manage all store discount codes.
              </p>
            </div>

            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {coupons.length} coupon{coupons.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="p-3 md:p-5">
          {loading && (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Loading coupons...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && coupons.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <TicketPercent className="h-5 w-5" />
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-900">
                No coupons yet
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Create your first discount code to start offering checkout
                promotions.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Add coupon
              </button>
            </div>
          )}

          {!loading && !error && coupons.length > 0 && (
            <div className="space-y-3">
              {coupons.map((c) => {
                const status = statusLabel(c);

                return (
                  <div
                    key={c.id}
                    className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-xl bg-slate-900 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-wide text-white">
                            {c.code}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Type
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {discountTypeLabel(c.discount_type)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Amount
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {c.amount || "—"}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Usage
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {usageSummary(c)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 px-3 py-2">
                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                              Expires
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-900">
                              {c.date_expires ? c.date_expires.slice(0, 10) : "—"}
                            </div>
                          </div>
                        </div>

                        {(c.minimum_amount || c.description) && (
                          <div className="mt-3 space-y-2">
                            {c.minimum_amount ? (
                              <div className="text-xs text-slate-600">
                                <span className="font-medium text-slate-800">
                                  Minimum order:
                                </span>{" "}
                                ₹{c.minimum_amount}
                              </div>
                            ) : null}

                            {c.description ? (
                              <p className="text-sm leading-6 text-slate-500">
                                {c.description}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <div className="hidden shrink-0 items-center gap-2 sm:flex">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <PencilLine className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 sm:hidden">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="rounded-[22px] border border-indigo-100 bg-indigo-50/70 px-4 py-3">
        <div className="flex items-start gap-2">
          <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
          <p className="text-xs leading-5 text-indigo-800">
            These are standard WooCommerce coupons. Customers can apply them at
            checkout using the coupon code.
          </p>
        </div>
      </div>
    </div>
  );
}