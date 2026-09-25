"use client";

import { useEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  Switch,
} from "@/components/ui/switch";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import {
  Bell,
  Check,
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
    showRecentOrderNotifications: boolean;
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

type SetupSiteInput = {
  branding?: Partial<SetupSiteForm["branding"]>;
  about?: Partial<SetupSiteForm["about"]>;
  store?: Partial<SetupSiteForm["store"]>;
  policies?: Partial<SetupSiteForm["policies"]>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function setupSiteInput(value: unknown): SetupSiteInput {
  return isRecord(value) ? (value as SetupSiteInput) : {};
}

const EMPTY_FORM: SetupSiteForm = {
  branding: {
    topbarMessage: "",
    showNewArrivals: true,
    showCollections: true,
    showBestSellers: true,
    showOfferSale: true,
    showCustomerFeedback: true,
    showRecentOrderNotifications: false,
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

const selectClass =
  "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground";

const textareaClass =
  "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";

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
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-3 py-3 md:px-5 md:py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
          {icon}
        </span>

        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-heading">
            {title}
          </h2>

          {hint ? (
            <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
              {hint}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4 p-3 md:p-5">
        {children}
      </div>
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
      <label className="mb-1.5 block text-xs font-bold text-heading">
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
    <div className="flex min-h-[72px] items-center justify-between gap-4 rounded-2xl bg-surface-soft px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-bold text-heading">
          {title}
        </div>

        {description ? (
          <div className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
            {description}
          </div>
        ) : null}
      </div>

      <Switch
        checked={checked}
        onCheckedChange={(value) =>
          onChange(Boolean(value))
        }
      />
    </div>
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
  function toggle(
    option: string
  ) {
    onChange(
      value.includes(option)
        ? value.filter(
            (item) =>
              item !== option
          )
        : [
            ...value,
            option,
          ]
    );
  }

  return (
    <div className="grid gap-2 md:grid-cols-2">
      {options.map(
        (option) => {
          const active =
            value.includes(
              option
            );

          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                toggle(option)
              }
              className={[
                "ls-focus-ring flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
                active
                  ? "border-primary bg-secondary text-secondary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <span>
                {option}
              </span>

              <span
                className={[
                  "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-transparent",
                ].join(" ")}
              >
                <Check className="h-3 w-3" />
              </span>
            </button>
          );
        }
      )}
    </div>
  );
}

function normalizeForm(raw: unknown): SetupSiteForm {
  const source = setupSiteInput(raw);
  const rawBranding = source.branding || {};
  const rawPolicies = source.policies || {};

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
    showRecentOrderNotifications:
      rawBranding.showRecentOrderNotifications ??
      EMPTY_FORM.branding.showRecentOrderNotifications,
  };

  const oldReturnWindow = rawPolicies.returnWindowDays || "";
  const oldRefundDays = rawPolicies.refundProcessingDays || "";
  const oldConditionNotes = rawPolicies.returnConditionNotes || "";

  return {
    branding,
    about: { ...EMPTY_FORM.about, ...(source.about || {}) },
    store: { ...EMPTY_FORM.store, ...(source.store || {}) },
    policies: {
      ...EMPTY_FORM.policies,
      ...rawPolicies,
      returnExchangeWindow: rawPolicies.returnExchangeWindow || oldReturnWindow,
      refundProcessingTime: rawPolicies.refundProcessingTime || oldRefundDays,
      specialPolicyRules: rawPolicies.specialPolicyRules || oldConditionNotes,
      eligibleReturnExchangeProducts: Array.isArray(rawPolicies.eligibleReturnExchangeProducts)
        ? rawPolicies.eligibleReturnExchangeProducts
        : [],
      productConditionRequired: Array.isArray(rawPolicies.productConditionRequired)
        ? rawPolicies.productConditionRequired
        : [],
      refundMethod: Array.isArray(rawPolicies.refundMethod)
        ? rawPolicies.refundMethod
        : [],
    },
  };
}

export default function SetupSiteTab() {
  const [form, setForm] = useState<SetupSiteForm>(EMPTY_FORM);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
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

  function patch(path: string, value: unknown) {
    setForm((prev) => {
      const clone = structuredClone(prev);
      const segs = path.split(".");
      let ptr = clone as unknown as JsonRecord;

      for (let i = 0; i < segs.length - 1; i++) {
        const next = ptr[segs[i]];

        if (!isRecord(next)) {
          return prev;
        }

        ptr = next;
      }

      const last = segs.at(-1);

      if (!last) {
        return prev;
      }

      ptr[last] = value;
      return clone;
    });
  }

  async function save(): Promise<boolean> {
    if (saving) {
      return false;
    }

    const feedbackId =
      "website-setup-save";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving website setup…",
    });

    try {
      const response =
        await fetch(
          "/api/settings/site-setup",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                form
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => null
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Save failed"
        );
      }

      const next =
        normalizeForm(
          payload || form
        );

      setForm(next);
      setSavedSnap(
        JSON.stringify(next)
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Website setup saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save website setup",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  useUnsavedChanges({
    id:
      "settings-website-setup",
    dirty: isDirty,
    label:
      "website setup changes",
    save,
  });

  if (!loaded) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-3 xl:grid-cols-2">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <SectionCard
  icon={<Sparkles className="h-5 w-5" />}
  title="Homepage setup"
  hint="Control the topbar message and visible homepage sections."
>
  <div className="space-y-4">
    <div className="rounded-2xl bg-surface-soft p-4">
      <Field label="Topbar message">
        <div className="relative">
          <Bell className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 placeholder:text-muted-foreground shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            placeholder="Example: Free shipping on orders above ₹999"
            value={form.branding.topbarMessage}
            onChange={(e) => patch("branding.topbarMessage", e.target.value)}
          />
        </div>
      </Field>
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3">
        <div className="text-sm font-bold text-heading">
          Homepage sections
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which sections should appear on the storefront homepage.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ToggleField
          title='New Arrivals'
          checked={form.branding.showNewArrivals}
          onChange={(v) => patch("branding.showNewArrivals", v)}
        />
        <ToggleField
          title='Our Collections'
          checked={form.branding.showCollections}
          onChange={(v) => patch("branding.showCollections", v)}
        />
        <ToggleField
          title='Best Sellers'
          checked={form.branding.showBestSellers}
          onChange={(v) => patch("branding.showBestSellers", v)}
        />
        <ToggleField
          title='Offer Sale'
          checked={form.branding.showOfferSale}
          onChange={(v) => patch("branding.showOfferSale", v)}
        />
        <ToggleField
          title="Customer Feedback"
          checked={form.branding.showCustomerFeedback}
          onChange={(v) => patch("branding.showCustomerFeedback", v)}
        />
      </div>
    </div>

    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3">
        <div className="text-sm font-bold text-heading">
          Recent order notifications
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Display small, privacy-safe notifications generated from genuine
          WooCommerce orders.
        </p>
      </div>

      <ToggleField
        title="Enable recent order notifications"
        description="LetzShopy manages the notification design, position and timing."
        checked={form.branding.showRecentOrderNotifications}
        onChange={(value) =>
          patch("branding.showRecentOrderNotifications", value)
        }
      />
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

            <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-4">
              <div className="text-sm font-bold text-heading">
                Founder Photo / Store Owner Photo
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Upload founder photo, store owner photo, or a featured brand/product image.
              </p>

              <div className="mt-4">
                {form.about.founderPhotoUrl ? (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-2xl border border-border bg-card p-1">
                      <img
                        src={form.about.founderPhotoUrl}
                        alt="Founder / store owner"
                        className="h-52 w-full rounded-xl object-cover"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        patch(
                          "about.founderPhotoUrl",
                          ""
                        )
                      }
                    >
                      Change photo
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-card p-4">
                    <ImageUploader
                      purpose="founder_photo"
                      onUploaded={(url) =>
                        patch("about.founderPhotoUrl", url ?? "")
                      }
                    />
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
              <div className="mb-1.5 text-xs font-bold text-heading">
                Return address
              </div>

              <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-surface-soft px-3">
                <span className="text-sm font-semibold text-foreground">
                  Same as store address
                </span>

                <Switch
                  checked={
                    form.policies
                      .returnAddressSame
                  }
                  onCheckedChange={(
                    checked
                  ) =>
                    patch(
                      "policies.returnAddressSame",
                      Boolean(
                        checked
                      )
                    )
                  }
                />
              </div>
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

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-[0_12px_28px_rgba(38,51,95,0.12)] backdrop-blur md:gap-3 md:rounded-2xl md:p-2.5">
            <div className="hidden min-w-0 px-1 sm:block">
              <div className="text-xs font-bold text-heading">
                {isDirty
                  ? "Unsaved website changes"
                  : "All changes saved"}
              </div>
            </div>

            <AsyncButton
              type="button"
              loading={saving}
              loadingLabel="Saving…"
              className="w-full sm:w-auto"
              disabled={!isDirty}
              onClick={() =>
                void save()
              }
            >
              Save Website Setup
            </AsyncButton>
          </div>
        </div>
      </div>
  );
}