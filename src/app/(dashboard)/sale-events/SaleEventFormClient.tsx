// src/app/(dashboard)/sale-events/SaleEventFormClient.tsx
"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useFormStatus,
} from "react-dom";
import {
  ArrowLeft,
  BadgePercent,
  CalendarRange,
  Check,
  IndianRupee,
  PackageSearch,
  RefreshCw,
  Sparkles,
  Truck,
  Tag,
  X,
} from "lucide-react";
import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Switch,
} from "@/components/ui/switch";
import type {
  SaleEvent,
  SaleEventCategoryOption,
  SaleEventProductOption,
  SalePricingType,
} from "@/lib/saleEventsApi";

type Props = {
  mode: "create" | "edit";
  event?: SaleEvent | null;
  categories: SaleEventCategoryOption[];
  products: SaleEventProductOption[];
  action: (formData: FormData) => void | Promise<void>;
};

function descendantsOf(
  selectedIds: number[],
  categories: SaleEventCategoryOption[]
): Set<number> {
  const out = new Set<number>(selectedIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const cat of categories) {
      if (cat.parent > 0 && out.has(cat.parent) && !out.has(cat.id)) {
        out.add(cat.id);
        changed = true;
      }
    }
  }

  return out;
}

function productBasePrice(product: SaleEventProductOption) {
  const value = Number(product.regular_price || product.price || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value: number) {
  return `₹${Math.ceil(Number(value || 0)).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatPromoDate(value: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function compactCategoryLabel(names: string[]) {
  const clean = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (clean.length === 0) return "selected products";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean[0]}, ${clean[1]} and more`;
}

function promotionalOfferLabel(
  pricingType: SalePricingType,
  discountValue: string
) {
  const value = Number(discountValue || 0);

  if (pricingType === "percentage") {
    return value > 0 ? `${value}% off` : "special savings";
  }

  if (pricingType === "fixed_amount") {
    return value > 0 ? `${formatMoney(value)} off` : "special savings";
  }

  if (pricingType === "free_shipping") return "Free Shipping";

  return "special sale prices";
}


function SaleEventSubmitButton({
  mode,
}: {
  mode: "create" | "edit";
}) {
  const { pending } =
    useFormStatus();

  return (
    <AsyncButton
      type="submit"
      loading={pending}
      loadingLabel={
        mode === "create"
          ? "Creating…"
          : "Saving…"
      }
    >
      {mode === "create"
        ? "Create Sale Event"
        : "Save Changes"}
    </AsyncButton>
  );
}

function buildPromotionalCopy({
  templateIndex,
  title,
  categoryNames,
  pricingType,
  discountValue,
  startDate,
  endDate,
}: {
  templateIndex: number;
  title: string;
  categoryNames: string[];
  pricingType: SalePricingType;
  discountValue: string;
  startDate: string;
  endDate: string;
}) {
  const eventName = title.trim() || "Special Sale";
  const categories = compactCategoryLabel(categoryNames);
  const start = formatPromoDate(startDate);
  const end = formatPromoDate(endDate);
  const period = start && end ? ` from ${start} to ${end}` : "";

  if (pricingType === "free_shipping") {
    const templates = [
      `${eventName} is here! Enjoy Free Shipping on ${categories}${period}. Shop your favourites before the offer ends.`,
      `Celebrate ${eventName} with Free Shipping on ${categories}${period}. Don’t miss this limited-time offer.`,
      `Limited-time ${eventName}: Free Shipping on ${categories}${period}. Grab your picks while the offer is live!`,
    ];

    return templates[Math.abs(templateIndex) % templates.length];
  }

  const offer = promotionalOfferLabel(pricingType, discountValue);
  const templates = [
    `${eventName} is here! Enjoy ${offer} on ${categories}${period}. Shop your favourites before the offer ends.`,
    `Celebrate ${eventName} with ${offer} across ${categories}${period}. Don’t miss this limited-time offer.`,
    `Limited-time ${eventName}: Get ${offer} on ${categories}${period}. Grab your picks while the offer is live!`,
  ];

  return templates[Math.abs(templateIndex) % templates.length];
}

export default function SaleEventFormClient({
  mode,
  event,
  categories,
  products,
  action,
}: Props) {
  const initialPromotionalCopy =
    event?.promotional_copy ||
    buildPromotionalCopy({
      templateIndex: 0,
      title: event?.title || "",
      categoryNames: (event?.category_ids || [])
        .map(
          (id) =>
            categories.find(
              (category) =>
                category.id === id
            )?.name || ""
        )
        .filter(Boolean),
      pricingType:
        event?.pricing_type ||
        "percentage",
      discountValue:
        String(
          event?.discount_value ||
            ""
        ),
      startDate:
        event?.start_date || "",
      endDate:
        event?.end_date || "",
    });

  const [selectedCategories, setSelectedCategories] = useState<number[]>(
    event?.category_ids || []
  );
  const [explicitProducts, setExplicitProducts] = useState<number[]>(
    event?.explicit_product_ids || []
  );
  const [excludedProducts, setExcludedProducts] = useState<number[]>(
    event?.excluded_product_ids || []
  );
  const [pricingType, setPricingType] = useState<SalePricingType>(
    event?.pricing_type || "percentage"
  );
  const [discountValue, setDiscountValue] = useState(
    String(event?.discount_value || "")
  );
  const [manualPrices, setManualPrices] = useState<Record<string, number>>(
    event?.manual_prices || {}
  );
  const [title, setTitle] = useState(event?.title || "");
  const [startDate, setStartDate] = useState(event?.start_date || "");
  const [endDate, setEndDate] = useState(event?.end_date || "");
  const [promoTemplateIndex, setPromoTemplateIndex] = useState(0);
  const [promoEdited, setPromoEdited] = useState(Boolean(event?.promotional_copy));
  const [promotionalCopy, setPromotionalCopy] = useState(
    initialPromotionalCopy
  );
  const [homepageVisible, setHomepageVisible] = useState(
    event ? event.homepage_visible : true
  );
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const initialSnapshotRef = useRef(
    JSON.stringify({
      selectedCategories: event?.category_ids || [],
      explicitProducts: event?.explicit_product_ids || [],
      excludedProducts: event?.excluded_product_ids || [],
      pricingType: event?.pricing_type || "percentage",
      discountValue: String(event?.discount_value || ""),
      manualPrices: event?.manual_prices || {},
      title: event?.title || "",
      startDate: event?.start_date || "",
      endDate: event?.end_date || "",
      promotionalCopy: initialPromotionalCopy,
      homepageVisible: event ? event.homepage_visible : true,
    })
  );

  const selectedCategoryTree = useMemo(
    () => descendantsOf(selectedCategories, categories),
    [selectedCategories, categories]
  );

  const categoryProductIds = useMemo(() => {
    const ids = new Set<number>();
    for (const product of products) {
      if (product.category_ids.some((id) => selectedCategoryTree.has(id))) {
        ids.add(product.id);
      }
    }
    return ids;
  }, [products, selectedCategoryTree]);

  const effectiveProductIds = useMemo(() => {
    const ids = new Set<number>([...categoryProductIds, ...explicitProducts]);
    for (const id of excludedProducts) ids.delete(id);
    return ids;
  }, [categoryProductIds, explicitProducts, excludedProducts]);

  const effectiveProducts = useMemo(
    () => products.filter((product) => effectiveProductIds.has(product.id)),
    [products, effectiveProductIds]
  );


  const selectedCategoryNames = useMemo(
    () =>
      selectedCategories
        .map((id) => categories.find((category) => category.id === id)?.name || "")
        .filter(Boolean),
    [selectedCategories, categories]
  );

  const generatedPromotionalCopy = useMemo(
    () =>
      buildPromotionalCopy({
        templateIndex: promoTemplateIndex,
        title,
        categoryNames: selectedCategoryNames,
        pricingType,
        discountValue,
        startDate,
        endDate,
      }),
    [
      promoTemplateIndex,
      title,
      selectedCategoryNames,
      pricingType,
      discountValue,
      startDate,
      endDate,
    ]
  );

  useEffect(() => {
    if (!promoEdited) {
      setPromotionalCopy(generatedPromotionalCopy);
    }
  }, [generatedPromotionalCopy, promoEdited]);

  function toggleCategory(id: number) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }


  function excludeProduct(id: number) {
    setExcludedProducts((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
    setExplicitProducts((prev) => prev.filter((item) => item !== id));
  }

  function restoreProduct(id: number) {
    setExcludedProducts((prev) => prev.filter((item) => item !== id));
  }

  function previewSale(product: SaleEventProductOption) {
    const regular = productBasePrice(product);
    const value = Number(discountValue || 0);

    if (!regular) return "—";
    if (pricingType === "percentage") {
      return formatMoney(Math.ceil(Math.max(0, regular * (1 - value / 100))));
    }
    if (pricingType === "fixed_amount") {
      return formatMoney(Math.ceil(Math.max(0, regular - value)));
    }
    const manual = Number(manualPrices[String(product.id)] || 0);
    return manual > 0 ? formatMoney(Math.ceil(manual)) : "Enter price";
  }

  const currentSnapshot = JSON.stringify({
    selectedCategories,
    explicitProducts,
    excludedProducts,
    pricingType,
    discountValue,
    manualPrices,
    title,
    startDate,
    endDate,
    promotionalCopy,
    homepageVisible,
  });

  const dirty =
    !submitting &&
    currentSnapshot !==
      initialSnapshotRef.current;

  async function saveFromGuard(): Promise<boolean> {
    if (!formRef.current || submitting) {
      return false;
    }

    setSubmitting(true);

    try {
      const data =
        new FormData(
          formRef.current
        );

      await action(data);
      return true;
    } catch {
      setSubmitting(false);
      return false;
    }
  }

  useUnsavedChanges({
    id:
      `sale-event-${mode}-${event?.id || "new"}`,
    dirty,
    label:
      "sale event changes",
    save: saveFromGuard,
  });

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <Link
        href="/offers-discounts/sale-events"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-heading"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Sale Events
      </Link>

      <div className="mt-4 hidden md:block">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
          Offers & Discounts
        </div>

        <h1 className="mt-1 text-[30px] font-extrabold tracking-tight text-heading">
          {mode === "create"
            ? "Create Sale Event"
            : "Edit Sale Event"}
        </h1>

        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Choose products, set the offer and schedule the event.
        </p>
      </div>

      <form
        ref={formRef}
        action={action}
        onSubmit={() =>
          setSubmitting(true)
        }
        className="mt-4 space-y-4 md:mt-5"
      >
        {event?.id ? <input type="hidden" name="id" value={event.id} /> : null}

        <input
          type="hidden"
          name="category_ids_json"
          value={JSON.stringify(selectedCategories)}
        />
        <input
          type="hidden"
          name="explicit_product_ids_json"
          value={JSON.stringify(explicitProducts)}
        />
        <input
          type="hidden"
          name="excluded_product_ids_json"
          value={JSON.stringify(excludedProducts)}
        />
        <input
          type="hidden"
          name="manual_prices_json"
          value={JSON.stringify(manualPrices)}
        />

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-heading">Event Details</h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-sm font-semibold text-foreground">Event Title</label>
              <input
                name="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Example: New Year Sale"
                className="mt-2 h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus:border-ring"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">Start Date</label>
              <input
                type="date"
                name="start_date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-border bg-surface-soft px-3 text-sm text-heading outline-none focus:border-ring focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-foreground">End Date</label>
              <input
                type="date"
                name="end_date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2 h-11 w-full rounded-2xl border border-border bg-surface-soft px-3 text-sm text-heading outline-none focus:border-ring focus:bg-white"
              />
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Event status is automatic: Scheduled, Live, or Closed based on these dates.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-heading">Choose Products</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Select full categories first. Products are included automatically, and you can remove exceptions below.
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {effectiveProducts.length} selected
            </span>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-foreground">1. Select Categories</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => {
                const active = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-border bg-surface-soft text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40"
                    }`}
                  >
                    <span className="min-w-0 truncate font-semibold">{category.name}</span>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${active ? "bg-indigo-600 text-white" : "bg-white text-slate-300"}`}>
                      {active ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-foreground">2. Review Included Products</p>

            {effectiveProducts.length > 0 ? (
              <div className="mt-2 grid max-h-[430px] gap-2 overflow-y-auto rounded-2xl border border-slate-100 bg-surface-soft p-2 sm:grid-cols-2 lg:grid-cols-3">
                {effectiveProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-sm">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{product.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {productBasePrice(product) ? formatMoney(productBasePrice(product)) : "No regular price"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => excludeProduct(product.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100"
                      aria-label={`Remove ${product.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-8 text-center text-sm text-muted-foreground">
                Choose one or more categories to include products in this event.
              </div>
            )}
          </div>

          {excludedProducts.length > 0 ? (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
              <p className="text-xs font-semibold text-amber-800">Excluded products</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {products
                  .filter((product) => excludedProducts.includes(product.id))
                  .map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => restoreProduct(product.id)}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                    >
                      + Restore {product.name}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}

        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-center gap-2">
            <BadgePercent className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-heading">Sale Pricing</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["percentage", "Percentage Discount", "%", "Example: 20% off"],
              ["fixed_amount", "Fixed Amount Discount", "₹", "Example: ₹200 off"],
              ["manual", "Manual Sale Price", "✎", "Enter sale price per product"],
              ["free_shipping", "Free Shipping", "🚚", "No product price discount"],
            ].map(([value, label, icon, help]) => {
              const active = pricingType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPricingType(value as SalePricingType)}
                  className={`rounded-[22px] border p-4 text-left transition ${
                    active
                      ? "border-indigo-300 bg-indigo-50 shadow-sm"
                      : "border-border bg-surface-soft hover:border-indigo-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-heading">{label}</span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${active ? "bg-indigo-600 text-white" : "bg-white text-muted-foreground"}`}>
                      {icon}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{help}</p>
                </button>
              );
            })}
          </div>

          <input type="hidden" name="pricing_type" value={pricingType} />

          {pricingType === "percentage" || pricingType === "fixed_amount" ? (
            <div className="mt-4 max-w-sm">
              <label className="text-sm font-semibold text-foreground">
                {pricingType === "percentage" ? "Discount Percentage" : "Discount Amount"}
              </label>
              <div className="relative mt-2">
                {pricingType === "fixed_amount" ? (
                  <IndianRupee className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                ) : null}
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={pricingType === "percentage" ? "99.99" : undefined}
                  name="discount_value"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={pricingType === "percentage" ? "20" : "200"}
                  className={`h-11 w-full rounded-2xl border border-border bg-surface-soft pr-3 text-sm text-heading outline-none focus:border-ring focus:bg-white ${pricingType === "fixed_amount" ? "pl-10" : "px-3"}`}
                />
              </div>
            </div>
          ) : (
            <input type="hidden" name="discount_value" value="0" />
          )}

          {pricingType === "free_shipping" ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">
                  Free Shipping Offer
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Selected event products keep their regular prices and receive free shipping while this event is Live.
                </p>
              </div>
            </div>
          ) : null}

          {effectiveProducts.length > 0 && pricingType !== "free_shipping" ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-surface-soft px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Product</span>
                <span>Regular</span>
                <span>Sale</span>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {effectiveProducts.map((product) => {
                  const regular = productBasePrice(product);
                  return (
                    <div key={product.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-slate-100 px-3 py-3 text-xs first:border-t-0">
                      <span className="min-w-0 truncate font-semibold text-foreground">{product.name}</span>
                      <span className="text-muted-foreground">{regular ? formatMoney(regular) : "—"}</span>

                      {pricingType === "manual" ? (
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={manualPrices[String(product.id)] ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setManualPrices((prev) => {
                              const next = { ...prev };
                              if (!raw) delete next[String(product.id)];
                              else next[String(product.id)] = Number(raw);
                              return next;
                            });
                          }}
                          placeholder="Sale price"
                          className="h-9 w-28 rounded-xl border border-border bg-white px-2 text-right text-xs font-semibold text-heading outline-none focus:border-ring"
                        />
                      ) : (
                        <span className="font-semibold text-emerald-700">{previewSale(product)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-heading">
                Homepage visibility
              </div>

              <div className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Show this event in Current Offers while it is live.
              </div>
            </div>

            <Switch
              checked={homepageVisible}
              onCheckedChange={(checked) =>
                setHomepageVisible(
                  Boolean(checked)
                )
              }
            />

            <input
              type="hidden"
              name="homepage_visible"
              value={
                homepageVisible
                  ? "1"
                  : "0"
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-heading">
                  Promotional Copy
                </h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  Editable
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Auto-generated from the event name, selected categories, offer, and dates.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPromoTemplateIndex((current) => (current + 1) % 3);
                setPromoEdited(false);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate
            </button>
          </div>

          <textarea
            name="promotional_copy"
            value={promotionalCopy}
            onChange={(e) => {
              setPromotionalCopy(e.target.value);
              setPromoEdited(true);
            }}
            rows={4}
            className="mt-4 w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm leading-6 text-foreground outline-none focus:border-ring focus:bg-white"
          />
        </section>

        <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 flex items-center justify-end gap-2 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.16)] backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
          <Link
            href="/offers-discounts/sale-events"
            className="ls-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Cancel
          </Link>
          <SaleEventSubmitButton
            mode={mode}
          />
        </div>
      </form>
    </main>
  );
}
