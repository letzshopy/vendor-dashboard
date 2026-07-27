"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  PencilLine,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  TicketPercent,
  Trash2,
  X,
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
  homepage_visible?: boolean;
  promotional_copy?: string;
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
  homepage_visible: boolean;
  promotional_copy: string;
};

type Banner = {
  type: "success" | "error";
  message: string;
} | null;

const emptyForm = (): FormState => ({
  code: "",
  discount_type: "percent",
  amount: "",
  description: "",
  date_expires: "",
  minimum_amount: "",
  usage_limit: "",
  homepage_visible: false,
  promotional_copy: "",
});

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

function formatMoney(value: string | number) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatExpiry(value: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function discountLabel(
  type: FormState["discount_type"],
  amount: string
) {
  if (type === "percent") return `${Number(amount || 0)}%`;
  return formatMoney(amount);
}

function promotionalTitle(description: string) {
  const title = description.replace(/\s+/g, " ").trim();
  return (title || "SPECIAL OFFER")
    .slice(0, 120)
    .replace(/[\s:;,.\-–—]+$/, "");
}

function buildCouponPromotionalCopy(
  form: FormState,
  templateIndex: number
) {
  const title = promotionalTitle(form.description);
  const offer = discountLabel(form.discount_type, form.amount);
  const minimum = Number(form.minimum_amount || 0);
  const expiry = formatExpiry(form.date_expires);
  const expiryText = expiry ? ` Offer valid until ${expiry}.` : "";

  let messages: string[];

  if (form.discount_type === "fixed_product") {
    messages = [
      `Get ${offer} off selected products at checkout.`,
      `Enjoy ${offer} off selected products when you shop.`,
      `Shop selected products and get ${offer} off at checkout.`,
    ];
  } else if (minimum > 0) {
    messages = [
      `Shop for ${formatMoney(minimum)} or more and get ${offer} off at checkout.`,
      `Spend ${formatMoney(minimum)} or more and enjoy ${offer} off your order.`,
      `Get ${offer} off when your order reaches ${formatMoney(minimum)}.`,
    ];
  } else {
    messages = [
      `Get ${offer} off your order at checkout.`,
      `Enjoy ${offer} off your order when you shop.`,
      `Shop now and get ${offer} off at checkout.`,
    ];
  }

  const message = messages[Math.abs(templateIndex) % messages.length];
  return `${title} - ${message}${expiryText}`;
}

function statusLabel(coupon: WCCoupon) {
  const today = new Date().toISOString().slice(0, 10);
  if (coupon.status === "trash") return "Trash";
  if (
    coupon.date_expires &&
    coupon.date_expires.slice(0, 10) < today
  ) {
    return "Expired";
  }
  return "Active";
}

function usageSummary(coupon: WCCoupon) {
  const used = coupon.usage_count || 0;
  const limit =
    typeof coupon.usage_limit === "number" &&
    !Number.isNaN(coupon.usage_limit)
      ? coupon.usage_limit
      : null;

  return limit ? `${used} of ${limit} used` : `${used} used`;
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
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
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
  const [promoTemplateIndex, setPromoTemplateIndex] = useState(0);
  const [promoEdited, setPromoEdited] = useState(false);

  const editing = Boolean(form?.id);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/coupons", {
          cache: "no-store",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error || "Failed to load coupons"
          );
        }

        if (!cancelled) {
          setCoupons(
            Array.isArray(payload.data) ? payload.data : []
          );
        }
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load coupons"
          );
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

  const generatedPromotionalCopy = useMemo(() => {
    if (!form) return "";
    return buildCouponPromotionalCopy(form, promoTemplateIndex);
  }, [
    form?.description,
    form?.discount_type,
    form?.amount,
    form?.minimum_amount,
    form?.date_expires,
    promoTemplateIndex,
  ]);

  useEffect(() => {
    if (!form || promoEdited) return;

    setForm((current) => {
      if (
        !current ||
        current.promotional_copy === generatedPromotionalCopy
      ) {
        return current;
      }

      return {
        ...current,
        promotional_copy: generatedPromotionalCopy,
      };
    });
  }, [generatedPromotionalCopy, promoEdited, form]);

  const stats = useMemo(() => {
    const active = coupons.filter(
      (coupon) => statusLabel(coupon) === "Active"
    ).length;
    const publicOffers = coupons.filter(
      (coupon) =>
        statusLabel(coupon) === "Active" &&
        coupon.homepage_visible
    ).length;

    return {
      total: coupons.length,
      active,
      publicOffers,
    };
  }, [coupons]);

  function openCreate() {
    setForm(emptyForm());
    setPromoTemplateIndex(0);
    setPromoEdited(false);
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEdit(coupon: WCCoupon) {
    const promotionalCopy = coupon.promotional_copy || "";

    setForm({
      id: coupon.id,
      code: coupon.code || "",
      discount_type:
        (coupon.discount_type as FormState["discount_type"]) ||
        "percent",
      amount: coupon.amount || "",
      description: coupon.description || "",
      date_expires: coupon.date_expires
        ? coupon.date_expires.slice(0, 10)
        : "",
      minimum_amount: coupon.minimum_amount || "",
      usage_limit:
        typeof coupon.usage_limit === "number"
          ? String(coupon.usage_limit)
          : "",
      homepage_visible: Boolean(coupon.homepage_visible),
      promotional_copy: promotionalCopy,
    });
    setPromoTemplateIndex(0);
    setPromoEdited(Boolean(promotionalCopy.trim()));
    setBanner(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setForm(null);
    setPromoEdited(false);
  }

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!form) return;

    if (!form.code.trim()) {
      setBanner({
        type: "error",
        message: "Internal coupon code is required.",
      });
      return;
    }

    if (!form.amount.trim() || Number(form.amount) <= 0) {
      setBanner({
        type: "error",
        message: "Discount amount must be greater than zero.",
      });
      return;
    }

    if (
      form.homepage_visible &&
      !form.promotional_copy.trim()
    ) {
      setBanner({
        type: "error",
        message:
          "Promotional copy is required when homepage visibility is enabled.",
      });
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
        minimum_amount: form.minimum_amount.trim(),
        usage_limit: form.usage_limit
          ? Number.parseInt(form.usage_limit, 10)
          : null,
        homepage_visible: form.homepage_visible,
        promotional_copy: form.promotional_copy.trim(),
      };

      const response =
        editing && form.id
          ? await fetch(`/api/coupons/${form.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/coupons", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Save failed");
      }

      const saved = result.data as WCCoupon;

      setCoupons((current) => {
        const index = current.findIndex(
          (coupon) => coupon.id === saved.id
        );

        if (index < 0) return [saved, ...current];

        const next = [...current];
        next[index] = saved;
        return next;
      });

      setForm(null);
      setBanner({
        type: "success",
        message: editing
          ? "Automatic coupon offer updated."
          : "Automatic coupon offer created.",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (saveError: unknown) {
      setBanner({
        type: "error",
        message:
          saveError instanceof Error
            ? saveError.message
            : "Save failed",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (
      !confirm(
        "Delete this automatic coupon offer? This cannot be undone."
      )
    ) {
      return;
    }

    setBanner(null);

    try {
      const response = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.error || "Delete failed");
      }

      setCoupons((current) =>
        current.filter((coupon) => coupon.id !== id)
      );
      setBanner({
        type: "success",
        message: "Automatic coupon offer deleted.",
      });
    } catch (deleteError: unknown) {
      setBanner({
        type: "error",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "Delete failed",
      });
    }
  }

  return (
    <div className="space-y-4 p-3 md:space-y-5 md:p-5">
      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <TicketPercent className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
                Automatic Coupon Offers
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                Create cart offers that are claimed automatically when
                the customer meets the eligibility rules. Customers do
                not enter coupon codes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add offer</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </section>

      {banner ? (
        <div
          className={`flex items-start gap-2 rounded-[20px] border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {banner.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{banner.message}</span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Total offers"
          value={stats.total}
          icon={<TicketPercent className="h-4 w-4" />}
        />
        <SummaryCard
          label="Active"
          value={stats.active}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <SummaryCard
          label="On homepage"
          value={stats.publicOffers}
          icon={<Eye className="h-4 w-4" />}
        />
      </div>

      {form ? (
        <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/40 px-4 py-4 md:px-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editing
                    ? "Edit automatic coupon offer"
                    : "New automatic coupon offer"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                  The internal code is retained for WooCommerce tracking,
                  but customers never type or paste it.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSave}
            className="space-y-5 p-4 md:p-5"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Internal coupon code"
                hint="Used in WooCommerce, checkout messages and reports only."
              >
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11 uppercase tracking-wide`}
                    value={form.code}
                    onChange={(event) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              code: event.target.value,
                            }
                          : current
                      )
                    }
                    placeholder="AASHADA500"
                  />
                </div>
              </Field>

              <Field label="Discount type">
                <select
                  className={inputClass}
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            discount_type: event.target
                              .value as FormState["discount_type"],
                          }
                        : current
                    )
                  }
                >
                  <option value="percent">
                    Percentage discount (%)
                  </option>
                  <option value="fixed_cart">
                    Fixed cart discount (₹)
                  </option>
                  <option value="fixed_product">
                    Fixed product discount (₹)
                  </option>
                </select>
              </Field>

              <Field label="Discount amount">
                <div className="relative">
                  <BadgePercent className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11`}
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) =>
                        current
                          ? {
                              ...current,
                              amount: event.target.value,
                            }
                          : current
                      )
                    }
                    placeholder="500"
                  />
                </div>
              </Field>

              <Field label="Expiry date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.date_expires}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            date_expires: event.target.value,
                          }
                        : current
                    )
                  }
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Minimum order amount"
                hint="Example: enter 5000 to apply this offer automatically only when the eligible cart reaches ₹5,000."
              >
                <input
                  className={inputClass}
                  value={form.minimum_amount}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            minimum_amount: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="5000"
                />
              </Field>

              <Field
                label="Usage limit"
                hint="Maximum total redemptions across the store."
              >
                <input
                  className={inputClass}
                  value={form.usage_limit}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            usage_limit: event.target.value,
                          }
                        : current
                    )
                  }
                  placeholder="50"
                />
              </Field>
            </div>

            <Field
              label="Offer name / internal note"
              hint="The offer name is used as the heading in the generated promotional copy."
            >
              <textarea
                className={textareaClass}
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          description: event.target.value,
                        }
                      : current
                  )
                }
                placeholder="Example: AASHADA SALE OFFER"
              />
            </Field>

            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <span className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
                  <Eye className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    Homepage Visibility
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    Show this eligible automatic offer inside the
                    storefront Current Offers section.
                  </span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={form.homepage_visible}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          homepage_visible: event.target.checked,
                        }
                      : current
                  )
                }
                className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
            </label>

            <section className="rounded-[22px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-sky-50 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                    <Sparkles className="h-4 w-4" />
                    Promotional Copy
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                      Editable
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Generated from the offer name, discount, minimum order and expiry.
                    You can edit the final customer-facing wording.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPromoTemplateIndex(
                      (current) => (current + 1) % 3
                    );
                    setPromoEdited(false);
                  }}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
              </div>

              <textarea
                value={form.promotional_copy}
                onChange={(event) => {
                  setForm((current) =>
                    current
                      ? {
                          ...current,
                          promotional_copy: event.target.value,
                        }
                      : current
                  );
                  setPromoEdited(true);
                }}
                rows={5}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />

              <div className="mt-3 text-xs font-medium text-slate-500">
                Checkout will separately confirm the offer name and exact
                discount after it is applied.
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-sm hover:bg-black disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editing
                  ? "Update offer"
                  : "Create offer"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-indigo-50/30 px-4 py-4 md:px-5">
          <h3 className="text-base font-semibold text-slate-900">
            Existing automatic coupon offers
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
            The customer-facing storefront never asks shoppers to enter
            these codes.
          </p>
        </div>

        <div className="space-y-3 p-3 md:p-5">
          {loading ? (
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-7 text-center text-sm text-slate-500">
              Loading coupon offers…
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-7 text-center text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {!loading && !error && coupons.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <TicketPercent className="mx-auto h-6 w-6 text-slate-400" />
              <div className="mt-3 text-sm font-semibold text-slate-900">
                No automatic coupon offers yet
              </div>
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white"
              >
                Add first offer
              </button>
            </div>
          ) : null}

          {!loading &&
            !error &&
            coupons.map((coupon) => {
              const status = statusLabel(coupon);

              return (
                <article
                  key={coupon.id}
                  className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-xl bg-slate-900 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-wide text-white">
                          {coupon.code}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {status}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            coupon.homepage_visible
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 bg-white text-slate-500"
                          }`}
                        >
                          {coupon.homepage_visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                          {coupon.homepage_visible
                            ? "Homepage"
                            : "Private"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Discount
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {coupon.discount_type === "percent"
                              ? `${coupon.amount}%`
                              : formatMoney(coupon.amount)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Minimum
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {coupon.minimum_amount
                              ? formatMoney(coupon.minimum_amount)
                              : "No minimum"}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Usage
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {usageSummary(coupon)}
                          </div>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <div className="text-[11px] uppercase tracking-wide text-slate-500">
                            Expires
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {coupon.date_expires
                              ? coupon.date_expires.slice(0, 10)
                              : "No expiry"}
                          </div>
                        </div>
                      </div>

                      {coupon.promotional_copy ? (
                        <p className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-3 text-sm leading-6 text-slate-700">
                          {coupon.promotional_copy}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(coupon)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon.id)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      </section>
    </div>
  );
}
