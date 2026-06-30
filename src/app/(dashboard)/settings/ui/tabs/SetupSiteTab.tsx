"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";
import {
  Bell,
  LayoutTemplate,
  Save,
  Sparkles,
  UserRound,
  PackageCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";

type SetupSiteForm = {
  branding: {
    topbarMessage: string;
    showNewArrivals: boolean;
    showCollections: boolean;
    showBestSellers: boolean;
    showOfferSale: boolean;
    showCustomerFeedback: boolean;
  };
  about: {
    founderPhotoUrl: string;
    brandStory: string;
  };
  store: {
    approximateProductCount: string;
    expectedDispatchTime: string;
  };
  policies: {
    returnsAccepted: string;
    exchangeAllowed: string;
    returnExchangeWindow: string;
    eligibleReturnExchangeProducts: string[];
    productConditionRequired: string[];
    unboxingVideoMandatory: string;
    returnShippingPaidBy: string;
    returnPickup: string;
    refundMethod: string[];
    refundProcessingTime: string;
    cancellationBeforeShipping: string;
    cancellationTimeLimit: string;
    cancellationAfterDispatch: string;
    specialPolicyRules: string;
    returnAddressSame: boolean;
    returnAddress: string;
    returnWindowDays?: string;
    returnConditionNotes?: string;
    refundProcessingDays?: string;
  };
};

const EMPTY_FORM: SetupSiteForm = {
  branding: {
    topbarMessage: "",
    showNewArrivals: true,
    showCollections: true,
    showBestSellers: true,
    showOfferSale: true,
    showCustomerFeedback: true,
  },
  about: {
    founderPhotoUrl: "",
    brandStory: "",
  },
  store: {
    approximateProductCount: "",
    expectedDispatchTime: "",
  },
  policies: {
    returnsAccepted: "",
    exchangeAllowed: "",
    returnExchangeWindow: "",
    eligibleReturnExchangeProducts: [],
    productConditionRequired: [],
    unboxingVideoMandatory: "",
    returnShippingPaidBy: "",
    returnPickup: "",
    refundMethod: [],
    refundProcessingTime: "",
    cancellationBeforeShipping: "",
    cancellationTimeLimit: "",
    cancellationAfterDispatch: "",
    specialPolicyRules: "",
    returnAddressSame: true,
    returnAddress: "",
  },
};

const PRODUCT_COUNT_OPTIONS = [
  "1–10",
  "11–25",
  "26–50",
  "51–100",
  "101–250",
  "251–500",
  "More than 500",
  "Not sure yet",
];

const DISPATCH_OPTIONS = [
  "Same day",
  "1 working day",
  "1–2 working days",
  "2–3 working days",
  "More than 3 days",
  "Made-to-order / depends on product",
];

const RETURNS_ACCEPTED_OPTIONS = [
  "Yes",
  "No",
  "Only for damaged / wrong product received",
  "Depends on product category",
];

const EXCHANGE_OPTIONS = [
  "Yes",
  "No",
  "Only size exchange",
  "Only damaged / wrong product exchange",
  "Depends on product category",
];

const RETURN_WINDOW_OPTIONS = [
  "Same day only",
  "Within 24 hours",
  "Within 2 days",
  "Within 3 days",
  "Within 5 days",
  "Within 7 days",
  "No return / exchange allowed",
  "Other",
];

const ELIGIBLE_RETURN_OPTIONS = [
  "Damaged product",
  "Wrong product delivered",
  "Size issue",
  "Colour issue",
  "Product not matching description",
  "Missing item / incomplete order",
  "All products are eligible",
  "No products are eligible",
  "Other",
];

const CONDITION_OPTIONS = [
  "Product must be unused",
  "Product must be unwashed",
  "Product must have original tags",
  "Product must have original packaging",
  "Bill / invoice should be available",
  "Clear product photos required",
  "Unboxing video required",
  "Other",
];

const UNBOXING_OPTIONS = [
  "Yes, mandatory",
  "No, not mandatory",
  "Preferred but not mandatory",
  "Required only for high-value products",
];

const RETURN_SHIPPING_OPTIONS = [
  "Vendor will pay",
  "Customer will pay",
  "Depends on reason for return",
  "No return shipping required",
  "Not sure yet",
];

const RETURN_PICKUP_OPTIONS = [
  "Yes",
  "No",
  "Only selected pincodes",
  "Customer has to self-ship the product",
  "Not sure yet",
];

const REFUND_METHOD_OPTIONS = [
  "Original payment method",
  "Bank transfer",
  "UPI refund",
  "Store credit / coupon",
  "Replacement only, no refund",
  "No refund allowed",
  "Other",
];

const REFUND_PROCESSING_OPTIONS = [
  "Same day",
  "1–2 working days",
  "3–5 working days",
  "5–7 working days",
  "7–10 working days",
  "No refund allowed",
  "Other",
];

const CANCELLATION_BEFORE_OPTIONS = [
  "Yes",
  "No",
  "Only within a few hours of placing order",
  "Depends on product category",
];

const CANCELLATION_TIME_OPTIONS = [
  "Within 1 hour",
  "Within 3 hours",
  "Within 6 hours",
  "Within 12 hours",
  "Before dispatch only",
  "Cancellation not allowed",
  "Other",
];

const CANCELLATION_AFTER_OPTIONS = [
  "Yes",
  "No",
  "Customer can refuse delivery",
  "Depends on courier status",
  "Not sure yet",
];

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const selectClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 " +
  "shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

const textareaClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 " +
  "placeholder:text-slate-400 shadow-sm transition resize-none focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100";

function SectionCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
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
            {hint ? (
              <p className="mt-1 text-xs leading-5 text-slate-500 md:text-sm">
                {hint}
              </p>
            ) : null}
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
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleField({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>
        <span className="block text-sm font-semibold text-slate-900">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
        >
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={() => toggle(option)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function normalizeForm(raw: any): SetupSiteForm {
  const rawBranding = raw?.branding || {};

  const branding: SetupSiteForm["branding"] = {
    topbarMessage: rawBranding.topbarMessage || "",
    showNewArrivals:
      rawBranding.showNewArrivals ?? EMPTY_FORM.branding.showNewArrivals,
    showCollections:
      rawBranding.showCollections ?? EMPTY_FORM.branding.showCollections,
    showBestSellers:
      rawBranding.showBestSellers ?? EMPTY_FORM.branding.showBestSellers,
    showOfferSale:
      rawBranding.showOfferSale ?? EMPTY_FORM.branding.showOfferSale,
    showCustomerFeedback:
      rawBranding.showCustomerFeedback ?? EMPTY_FORM.branding.showCustomerFeedback,
  };

  const oldReturnWindow = raw?.policies?.returnWindowDays || "";
  const oldRefundDays = raw?.policies?.refundProcessingDays || "";
  const oldConditionNotes = raw?.policies?.returnConditionNotes || "";

  return {
    branding,
    about: { ...EMPTY_FORM.about, ...(raw?.about || {}) },
    store: { ...EMPTY_FORM.store, ...(raw?.store || {}) },
    policies: {
      ...EMPTY_FORM.policies,
      ...(raw?.policies || {}),
      returnExchangeWindow: raw?.policies?.returnExchangeWindow || oldReturnWindow,
      refundProcessingTime: raw?.policies?.refundProcessingTime || oldRefundDays,
      specialPolicyRules: raw?.policies?.specialPolicyRules || oldConditionNotes,
      eligibleReturnExchangeProducts: Array.isArray(raw?.policies?.eligibleReturnExchangeProducts)
        ? raw.policies.eligibleReturnExchangeProducts
        : [],
      productConditionRequired: Array.isArray(raw?.policies?.productConditionRequired)
        ? raw.policies.productConditionRequired
        : [],
      refundMethod: Array.isArray(raw?.policies?.refundMethod)
        ? raw.policies.refundMethod
        : [],
    },
  };
}

export default function SetupSiteTab() {
  const [form, setForm] = useState<SetupSiteForm>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<null | "saved" | "error">(null);

  const [savedSnap, setSavedSnap] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/settings/site-setup", {
          cache: "no-store",
        });

        const data = res.ok ? await res.json() : {};
        const next = normalizeForm(data);

        setForm(next);
        setSavedSnap(JSON.stringify(next));
      } catch {
        setForm(EMPTY_FORM);
        setSavedSnap(JSON.stringify(EMPTY_FORM));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const currentSnap = useMemo(() => JSON.stringify(form), [form]);

  const isDirty = useMemo(() => {
    if (!savedSnap) return false;
    return savedSnap !== currentSnap;
  }, [savedSnap, currentSnap]);

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

  function patch(path: string, value: any) {
    setForm((prev) => {
      const clone: any = structuredClone(prev);
      const segs = path.split(".");
      let ptr = clone;
      for (let i = 0; i < segs.length - 1; i++) ptr = ptr[segs[i]];
      ptr[segs[segs.length - 1]] = value;
      return clone;
    });
  }

  async function save() {
  setSaving(true);

  try {
    const res = await fetch("/api/settings/site-setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(data?.error || "Save failed");
    }

    const next = normalizeForm(data || form);
    const nextSnap = JSON.stringify(next);

    setForm(next);
    setSavedSnap(nextSnap);
    setBanner("saved");

    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setBanner(null), 2600);
  } catch {
    setBanner("error");
    setTimeout(() => setBanner(null), 3200);
  } finally {
    setSaving(false);
  }
}

  if (!loaded) {
    return (
      <div className="p-4 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      {banner === "saved" && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Setup Site saved successfully
          </div>
        </div>
      )}

      {banner === "error" && (
        <div className="pointer-events-none fixed left-0 right-0 top-[72px] z-40 flex justify-center">
          <div className="pointer-events-auto rounded-full bg-rose-500 px-4 py-1.5 text-sm font-medium text-white shadow-lg">
            Failed to save Setup Site
          </div>
        </div>
      )}

      <div className="space-y-4 p-3 md:space-y-5 md:p-5">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-900">
                Setup Site
              </div>
              <div className="mt-1 text-xs text-slate-500 md:text-sm">
                Control homepage sections, About page inputs and policy generation details.
              </div>
            </div>
          </div>
        </div>

<SectionCard
  icon={<Sparkles className="h-5 w-5" />}
  title="Homepage setup"
  hint="Control the topbar message and visible homepage sections."
>
  <div className="space-y-4">
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
      <Field label="Topbar message">
        <div className="relative">
          <Bell className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Example: Free shipping on orders above ₹999"
            value={form.branding.topbarMessage}
            onChange={(e) => patch("branding.topbarMessage", e.target.value)}
          />
        </div>
      </Field>
    </div>

    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">
          Homepage sections
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Choose which sections should appear on the storefront homepage.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ToggleField
          title='Show "New Arrivals" section on homepage?'
          checked={form.branding.showNewArrivals}
          onChange={(v) => patch("branding.showNewArrivals", v)}
        />
        <ToggleField
          title='Show "Our Collections" section on homepage?'
          checked={form.branding.showCollections}
          onChange={(v) => patch("branding.showCollections", v)}
        />
        <ToggleField
          title='Show "Best Sellers" section on homepage?'
          checked={form.branding.showBestSellers}
          onChange={(v) => patch("branding.showBestSellers", v)}
        />
        <ToggleField
          title='Show "Offer Sale" section on homepage?'
          checked={form.branding.showOfferSale}
          onChange={(v) => patch("branding.showOfferSale", v)}
        />
        <ToggleField
          title="Show Customer Feedback section on homepage?"
          checked={form.branding.showCustomerFeedback}
          onChange={(v) => patch("branding.showCustomerFeedback", v)}
        />
      </div>
    </div>
  </div>
</SectionCard>        
        <SectionCard
          icon={<UserRound className="h-5 w-5" />}
          title="About page setup"
          hint="These fields are used for the About page brand story section."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Field label="Brand Story">
              <textarea
                rows={8}
                className={textareaClass}
                placeholder="Tell us about your brand, what you sell, why you started, and what makes your store special."
                value={form.about.brandStory}
                onChange={(e) => patch("about.brandStory", e.target.value)}
              />
            </Field>

            <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/70 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Founder Photo / Store Owner Photo
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Upload founder photo, store owner photo, or a featured brand/product image.
              </p>

              <div className="mt-4">
                {form.about.founderPhotoUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white p-1">
                      <img
                        src={form.about.founderPhotoUrl}
                        alt="Founder / store owner"
                        className="h-52 w-full rounded-[18px] object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => patch("about.founderPhotoUrl", "")}
                    >
                      Change photo
                    </button>
                  </div>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-slate-300 bg-white p-4">
                    <ImageUploader onUploaded={(url) => patch("about.founderPhotoUrl", url ?? "")} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={<PackageCheck className="h-5 w-5" />}
          title="Store setup inputs"
          hint="These details help us plan the first website setup and policy wording."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Approximate number of products">
              <select
                className={selectClass}
                value={form.store.approximateProductCount}
                onChange={(e) => patch("store.approximateProductCount", e.target.value)}
              >
                <option value="">Select product count</option>
                {PRODUCT_COUNT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Expected dispatch time">
              <select
                className={selectClass}
                value={form.store.expectedDispatchTime}
                onChange={(e) => patch("store.expectedDispatchTime", e.target.value)}
              >
                <option value="">Select dispatch time</option>
                {DISPATCH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<RotateCcw className="h-5 w-5" />}
          title="Return, exchange & refund policy inputs"
          hint="Collect structured answers first. These can be used to generate policy content later."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Do you allow product returns?">
              <select
                className={selectClass}
                value={form.policies.returnsAccepted}
                onChange={(e) => patch("policies.returnsAccepted", e.target.value)}
              >
                <option value="">Select option</option>
                {RETURNS_ACCEPTED_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Do you allow product exchange?">
              <select
                className={selectClass}
                value={form.policies.exchangeAllowed}
                onChange={(e) => patch("policies.exchangeAllowed", e.target.value)}
              >
                <option value="">Select option</option>
                {EXCHANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Return / exchange request window">
              <select
                className={selectClass}
                value={form.policies.returnExchangeWindow}
                onChange={(e) => patch("policies.returnExchangeWindow", e.target.value)}
              >
                <option value="">Select return window</option>
                {RETURN_WINDOW_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Unboxing video mandatory?">
              <select
                className={selectClass}
                value={form.policies.unboxingVideoMandatory}
                onChange={(e) => patch("policies.unboxingVideoMandatory", e.target.value)}
              >
                <option value="">Select option</option>
                {UNBOXING_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Who will pay return shipping charges?">
              <select
                className={selectClass}
                value={form.policies.returnShippingPaidBy}
                onChange={(e) => patch("policies.returnShippingPaidBy", e.target.value)}
              >
                <option value="">Select option</option>
                {RETURN_SHIPPING_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Do you provide return pickup?">
              <select
                className={selectClass}
                value={form.policies.returnPickup}
                onChange={(e) => patch("policies.returnPickup", e.target.value)}
              >
                <option value="">Select option</option>
                {RETURN_PICKUP_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Refund processing time after approval">
              <select
                className={selectClass}
                value={form.policies.refundProcessingTime}
                onChange={(e) => patch("policies.refundProcessingTime", e.target.value)}
              >
                <option value="">Select refund processing time</option>
                {REFUND_PROCESSING_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Return address setting
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.policies.returnAddressSame}
                  onChange={(e) => patch("policies.returnAddressSame", e.target.checked)}
                />
                <span>Return address same as store address</span>
              </label>
            </div>
          </div>

          <Field label="Which products are eligible for return or exchange?">
            <CheckboxGroup
              options={ELIGIBLE_RETURN_OPTIONS}
              value={form.policies.eligibleReturnExchangeProducts}
              onChange={(v) => patch("policies.eligibleReturnExchangeProducts", v)}
            />
          </Field>

          <Field label="Product condition required for return / exchange">
            <CheckboxGroup
              options={CONDITION_OPTIONS}
              value={form.policies.productConditionRequired}
              onChange={(v) => patch("policies.productConditionRequired", v)}
            />
          </Field>

          <Field label="Refund method">
            <CheckboxGroup
              options={REFUND_METHOD_OPTIONS}
              value={form.policies.refundMethod}
              onChange={(v) => patch("policies.refundMethod", v)}
            />
          </Field>

          {!form.policies.returnAddressSame && (
            <Field label="Return address">
              <textarea
                rows={4}
                className={textareaClass}
                placeholder="Enter return address"
                value={form.policies.returnAddress}
                onChange={(e) => patch("policies.returnAddress", e.target.value)}
              />
            </Field>
          )}
        </SectionCard>

        <SectionCard
          icon={<XCircle className="h-5 w-5" />}
          title="Cancellation policy inputs"
          hint="These fields are used to prepare cancellation policy wording."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Do you allow order cancellation before shipping?">
              <select
                className={selectClass}
                value={form.policies.cancellationBeforeShipping}
                onChange={(e) => patch("policies.cancellationBeforeShipping", e.target.value)}
              >
                <option value="">Select option</option>
                {CANCELLATION_BEFORE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Cancellation request should be raised within how much time?">
              <select
                className={selectClass}
                value={form.policies.cancellationTimeLimit}
                onChange={(e) => patch("policies.cancellationTimeLimit", e.target.value)}
              >
                <option value="">Select time limit</option>
                {CANCELLATION_TIME_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>

            <Field label="Do you allow cancellation after shipping / dispatch?">
              <select
                className={selectClass}
                value={form.policies.cancellationAfterDispatch}
                onChange={(e) => patch("policies.cancellationAfterDispatch", e.target.value)}
              >
                <option value="">Select option</option>
                {CANCELLATION_AFTER_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Any special refund, return, exchange, or cancellation rules?">
            <textarea
              rows={4}
              className={textareaClass}
              placeholder="Mention any special rules for your business."
              value={form.policies.specialPolicyRules}
              onChange={(e) => patch("policies.specialPolicyRules", e.target.value)}
            />
          </Field>
        </SectionCard>

        <div className="sticky bottom-3 z-10 md:bottom-4">
          <div className="rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isDirty ? "Unsaved changes" : "All changes saved"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Save your latest setup and policy details.
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isDirty && (
                  <span className="hidden text-xs text-emerald-600 sm:inline">
                    All changes saved
                  </span>
                )}

                {isDirty && (
                  <span className="hidden text-xs text-amber-600 sm:inline">
                    You have unsaved changes
                  </span>
                )}

                <button
                  onClick={save}
                  disabled={saving || !isDirty}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
