"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  Boxes,
  Eye,
  ImageIcon,
  Layers3,
  Loader2,
  Package2,
  Palette,
  Pencil,
  Ruler,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { productContentText } from "@/lib/productContentText";

type ProductImage = {
  id?: number;
  src?: string;
  url?: string;
  name?: string;
};

type ProductCategory = {
  id?: number;
  name: string;
};

type ProductTag = {
  id?: number;
  name: string;
};

type ProductDimension = {
  length?: string | number | null;
  width?: string | number | null;
  height?: string | number | null;
};

type ProductAttribute = {
  id?: number;
  name?: string;
  option?: string;
  options?: string[];
  visible?: boolean;
  variation?: boolean;
};

type Product = {
  id: number;
  name: string;
  sku?: string;
  color?: string;
  type?: string;
  status?: string;
  permalink?: string;
  price?: string | number;
  regular_price?: string | number;
  sale_price?: string | number;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  catalog_visibility?: string;

  categories?: ProductCategory[];
  tags?: ProductTag[];

  images?: (ProductImage | string)[];
  image_objects?: ProductImage[];

  date_created?: string;
  date_modified?: string;
  description?: string;
  short_description?: string;
  shortDescription?: string;

  weight?: string | number | null;
  dimensions?: ProductDimension;
  shipping_class?: string;
  shipping_class_id?: number;

  grouped_products?: number[];
  attributes?: ProductAttribute[];
};

type Variation = {
  id: number;
  sku?: string;
  price?: string | number;
  regular_price?: string | number;
  sale_price?: string | number;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  attributes?: ProductAttribute[];
  image?: ProductImage | null;
};

type GroupedChild = {
  id: number;
  name: string;
  sku?: string;
  price?: string | number;
  stock_status?: string;
  permalink?: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function parseJsonRecord(raw: string): JsonRecord {
  if (!raw.trim()) return {};

  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function recordError(
  value: JsonRecord,
  fallback: string
): string {
  return typeof value.error === "string"
    ? value.error
    : fallback;
}

function pillClass(color: "green" | "amber" | "slate" | "red" | "violet" = "slate") {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border";
  const map: Record<typeof color, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    red: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-[#EEF1FA] text-[#2E3F7D] border-[#D9DEEC]",
  };
  return `${base} ${map[color]}`;
}

function getImageSrcSafe(img?: ProductImage | null): string | null {
  if (!img) return null;
  const src = img.src || img.url || "";
  return src || null;
}

function fmt(
  value: string | number | null | undefined,
  fallback = "Not set"
): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  return `₹${value}`;
}

function stockBadge(stock?: string) {
  if (stock === "instock") {
    return (
      <span className={pillClass("green")}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        In stock
      </span>
    );
  }
  if (stock === "onbackorder") {
    return (
      <span className={pillClass("amber")}>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Backorder
      </span>
    );
  }
  if (stock === "outofstock") {
    return (
      <span className={pillClass("red")}>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Out of stock
      </span>
    );
  }
  return <span className={pillClass("slate")}>Unknown</span>;
}

function variationLabel(attrs?: ProductAttribute[]) {
  if (!attrs || attrs.length === 0) return "Variation";
  return attrs
    .map((a) => `${a.name || "Option"}: ${a.option || "—"}`)
    .join(" • ");
}

function SectionCard({
  title,
  icon: Icon,
  hint,
  children,
  right,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading md:text-base">
              {title}
            </h2>
            {hint ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-3 md:p-4">{children}</div>
    </section>
  );
}

function StatField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-soft p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-bold text-heading">{value}</div>
    </div>
  );
}

export default function ProductViewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [product, setProduct] = useState<Product | null>(null);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [groupedChildren, setGroupedChildren] = useState<GroupedChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [activeImgId, setActiveImgId] = useState<number | null>(null);
  const [selectedVariationId, setSelectedVariationId] =
    useState<number | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);

        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        const raw = await res.text();
        const result = parseJsonRecord(raw);

        if (!res.ok) {
          throw new Error(
            recordError(result, "Failed to load product")
          );
        }

        setProduct(result as unknown as Product);
      } catch (error: unknown) {
        setLoadErr(
          error instanceof Error
            ? error.message
            : "Failed to load product"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!product?.id) return;

    (async () => {
      try {
        setExtraLoading(true);

        if (product.type === "variable") {
          const res = await fetch(`/api/products/${product.id}/variations`, {
            cache: "no-store",
          });
          const raw = await res.text();
          const result = parseJsonRecord(raw);

          if (res.ok) {
            setVariations(
              Array.isArray(result.variations)
                ? (result.variations as Variation[])
                : []
            );
          } else {
            setVariations([]);
          }
        } else {
          setVariations([]);
        }

        if (
          product.type === "grouped" &&
          Array.isArray(product.grouped_products) &&
          product.grouped_products.length > 0
        ) {
          const children = await Promise.all(
            product.grouped_products.map(async (childId) => {
              try {
                const res = await fetch(`/api/products/${childId}`, {
                  cache: "no-store",
                });
                const raw = await res.text();
                const result = parseJsonRecord(raw);

                if (!res.ok) return null;

                const loadedChildId = Number(result.id);
                const childName =
                  typeof result.name === "string"
                    ? result.name
                    : "";

                if (
                  !Number.isSafeInteger(loadedChildId) ||
                  loadedChildId <= 0 ||
                  !childName
                ) {
                  return null;
                }

                return {
                  id: loadedChildId,
                  name: childName,
                  sku:
                    typeof result.sku === "string"
                      ? result.sku
                      : undefined,
                  price:
                    typeof result.price === "string" ||
                    typeof result.price === "number"
                      ? result.price
                      : typeof result.regular_price === "string" ||
                          typeof result.regular_price === "number"
                        ? result.regular_price
                        : undefined,
                  stock_status:
                    typeof result.stock_status === "string"
                      ? result.stock_status
                      : undefined,
                  permalink:
                    typeof result.permalink === "string"
                      ? result.permalink
                      : undefined,
                } satisfies GroupedChild;
              } catch {
                return null;
              }
            })
          );

          setGroupedChildren(children.filter(Boolean) as GroupedChild[]);
        } else {
          setGroupedChildren([]);
        }
      } finally {
        setExtraLoading(false);
      }
    })();
  }, [product]);

  const galleryImages: ProductImage[] = useMemo(() => {
    if (!product) return [];

    if (product.image_objects && product.image_objects.length > 0) {
      return product.image_objects;
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0 &&
      typeof product.images[0] === "string"
    ) {
      return (product.images as string[]).map((src, idx) => ({
        id: idx,
        src,
      }));
    }

    if (
      Array.isArray(product.images) &&
      product.images.length > 0 &&
      typeof product.images[0] === "object"
    ) {
      return product.images as ProductImage[];
    }

    return [];
  }, [product]);

  useEffect(() => {
    if (galleryImages.length > 0 && activeImgId === null) {
      setActiveImgId(galleryImages[0].id ?? 0);
    }
  }, [galleryImages, activeImgId]);

  const mainImage: ProductImage | undefined =
    galleryImages.find((img) => img.id === activeImgId) ?? galleryImages[0];

  if (loading) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8" role="status">
        <div className="rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-56" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:mt-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Skeleton className="h-[360px] w-full" />
          <div className="space-y-3">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        </div>

        <span className="sr-only">Loading product…</span>
      </main>
    );
  }

  if (loadErr || !product) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-3xl pb-28 md:pb-8">
        <div className="space-y-4">
          <button
            onClick={() => router.push("/products")}
            className="ls-focus-ring hidden min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted md:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Products
          </button>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-4 text-sm font-semibold text-destructive">
            {loadErr || "Product not found"}
          </div>
        </div>
      </main>
    );
  }

  const shortDesc = productContentText(
    product.short_description || product.shortDescription || ""
  );
  const fullDesc = productContentText(product.description || "");
  const isVariable = product.type === "variable";
  const isGrouped = product.type === "grouped";

  const variationAttributeNames =
    (product.attributes || [])
      .filter(
        (attribute) =>
          attribute.variation === true
      )
      .map((attribute) =>
        (attribute.name || "")
          .trim()
          .toLowerCase()
      );

  const variationKind:
    | "size"
    | "colour"
    | "variation" =
    variationAttributeNames.some(
      (name) =>
        name.includes("colour") ||
        name.includes("color")
    )
      ? "colour"
      : variationAttributeNames.some(
            (name) =>
              name.includes("size")
          )
        ? "size"
        : "variation";

  const selectedVariation =
    selectedVariationId === null
      ? undefined
      : variations.find(
          (variation) =>
            variation.id ===
            selectedVariationId
        );

  const selectedVariationImage =
    variationKind === "colour"
      ? getImageSrcSafe(
          selectedVariation?.image
        )
      : null;

  const heroImage =
    selectedVariationImage ||
    getImageSrcSafe(mainImage);

  const variationOption = (
    variation: Variation
  ) =>
    (variation.attributes || [])
      .map(
        (attribute) =>
          attribute.option?.trim() ||
          ""
      )
      .filter(Boolean)
      .join(" / ") ||
    "Variation";

  const variationPrices =
    variations
      .map((variation) =>
        Number(
          variation.price ||
            variation.regular_price ||
            0
        )
      )
      .filter(
        (value) =>
          Number.isFinite(value) &&
          value > 0
      );

  const variablePriceLabel =
    variationPrices.length > 0
      ? (() => {
          const minimum = Math.min(
            ...variationPrices
          );
          const maximum = Math.max(
            ...variationPrices
          );

          return minimum === maximum
            ? `₹${minimum.toLocaleString("en-IN")}`
            : `₹${minimum.toLocaleString("en-IN")} – ₹${maximum.toLocaleString("en-IN")}`;
        })()
      : "Price not set";

  const variableQuantity =
    variations.reduce(
      (total, variation) =>
        total +
        (
          typeof variation.stock_quantity ===
          "number"
            ? variation.stock_quantity
            : 0
        ),
      0
    );

  const productPriceLabel =
    isVariable
      ? variablePriceLabel
      : formatPrice(
          product.price ||
            product.regular_price
        );

  const productQuantityLabel =
    isVariable
      ? `${variableQuantity} total`
      : typeof product.stock_quantity ===
          "number"
        ? `${product.stock_quantity} available`
        : product.stock_status ===
            "outofstock"
          ? "Out of stock"
          : "In stock";

  const statusLabel =
    product.status === "publish"
      ? "Published"
      : product.status
        ? product.status
            .charAt(0)
            .toUpperCase() +
          product.status.slice(1)
        : "Draft";

  const dimensionLabel =
    product.dimensions &&
    (
      product.dimensions.length ||
      product.dimensions.width ||
      product.dimensions.height
    )
      ? [
          fmt(
            product.dimensions.length,
            "–"
          ),
          fmt(
            product.dimensions.width,
            "–"
          ),
          fmt(
            product.dimensions.height,
            "–"
          ),
        ].join(" × ")
      : "Not set";

  return (
    <main className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden pb-28 md:pb-10">
      <div className="mb-4 hidden items-center justify-between gap-3 md:flex">
        <button
          type="button"
          onClick={() =>
            router.push("/products")
          }
          className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-4 text-sm font-bold text-[#475569]"
        >
          <ArrowLeft className="h-4 w-4" />
          Products
        </button>

        <div className="flex items-center gap-2">
          {product.permalink ? (
            <a
              href={product.permalink}
              target="_blank"
              rel="noreferrer"
              className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#D7E0EA] bg-white px-4 text-sm font-bold text-[#475569]"
            >
              <Eye className="h-4 w-4" />
              View Storefront
            </a>
          ) : null}

          <Link
            href={`/products/${product.id}/edit`}
            className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1F63D8] px-4 text-sm font-extrabold text-white shadow-sm"
          >
            <Pencil className="h-4 w-4" />
            Edit Product
          </Link>
        </div>
      </div>

      <article className="overflow-hidden rounded-3xl border border-[#D7E0EA] bg-white shadow-[0_10px_34px_rgba(23,35,60,0.07)]">
        <div className="grid md:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="border-b border-[#E5EAF1] bg-[#F5F7FA] md:border-b-0 md:border-r">
            <div className="flex min-h-[330px] items-center justify-center p-3 sm:min-h-[420px] md:min-h-[520px] md:p-5">
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt={product.name}
                  className="max-h-[520px] w-auto max-w-full rounded-2xl object-contain"
                />
              ) : (
                <div className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#D7E0EA] bg-white text-[#94A3B8]">
                  <ImageIcon className="h-8 w-8" />
                  <span className="mt-2 text-xs font-semibold">
                    No product image
                  </span>
                </div>
              )}
            </div>

            {galleryImages.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-[#E5EAF1] bg-white px-3 py-3 md:px-5">
                {galleryImages.map(
                  (image, index) => {
                    const src =
                      getImageSrcSafe(image);
                    const imageId =
                      image.id ?? index;
                    const selected =
                      !selectedVariationImage &&
                      (
                        activeImgId ??
                        galleryImages[0].id ??
                        0
                      ) === imageId;

                    return (
                      <button
                        key={`${imageId}-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedVariationId(
                            null
                          );
                          setActiveImgId(
                            imageId
                          );
                        }}
                        className={[
                          "h-16 w-16 shrink-0 overflow-hidden rounded-xl border bg-[#F8FAFC] transition md:h-20 md:w-20",
                          selected
                            ? "border-[#1F63D8] ring-2 ring-[#DCE9FF]"
                            : "border-[#D7E0EA]",
                        ].join(" ")}
                      >
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col p-4 sm:p-5 md:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={[
                  "inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold",
                  product.status ===
                  "publish"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700",
                ].join(" ")}
              >
                {statusLabel}
              </span>

              <span className="inline-flex rounded-full bg-[#EEF5FF] px-2.5 py-1 text-[10px] font-extrabold text-[#1F63D8]">
                {isVariable
                  ? variationKind ===
                    "colour"
                    ? "Colour Variation"
                    : variationKind ===
                        "size"
                      ? "Size Variation"
                      : "Variable Product"
                  : product.type ===
                      "simple"
                    ? "Simple Product"
                    : fmt(
                        product.type,
                        "Product"
                      )}
              </span>
            </div>

            <h1 className="mt-3 break-words text-[25px] font-extrabold tracking-tight text-[#17233C] md:text-[31px]">
              {product.name ||
                "Untitled product"}
            </h1>

            <div className="mt-1 text-xs font-semibold text-[#7A8497]">
              SKU: {fmt(product.sku, "—")}
            </div>

            <div className="mt-5 flex items-end justify-between gap-3 border-y border-[#E8EDF3] py-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A8497]">
                  Price
                </div>
                <div className="mt-1 text-2xl font-extrabold text-[#17233C]">
                  {productPriceLabel}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A8497]">
                  Stock
                </div>
                <div
                  className={[
                    "mt-1 text-sm font-extrabold",
                    (
                      isVariable
                        ? variableQuantity > 0
                        : product.stock_status !==
                          "outofstock"
                    )
                      ? "text-emerald-700"
                      : "text-rose-600",
                  ].join(" ")}
                >
                  {productQuantityLabel}
                </div>
              </div>
            </div>

            {product.categories &&
            product.categories.length >
              0 ? (
              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A8497]">
                  Category
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.categories.map(
                    (category, index) => (
                      <span
                        key={`${category.id ?? "category"}-${index}`}
                        className="rounded-full bg-[#F1F4F8] px-3 py-1.5 text-xs font-bold text-[#475569]"
                      >
                        {category.name}
                      </span>
                    )
                  )}
                </div>
              </div>
            ) : null}

            {shortDesc ? (
              <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-[#5F6B7D]">
                {shortDesc}
              </p>
            ) : null}

            <div className="mt-auto grid grid-cols-2 gap-2 pt-5 md:hidden">
              {product.permalink ? (
                <a
                  href={product.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#C8D4E2] bg-white px-3 text-xs font-extrabold text-[#475569]"
                >
                  <Eye className="h-4 w-4" />
                  Storefront
                </a>
              ) : (
                <span />
              )}

              <Link
                href={`/products/${product.id}/edit`}
                className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F63D8] px-3 text-xs font-extrabold text-white"
              >
                <Pencil className="h-4 w-4" />
                Edit Product
              </Link>
            </div>
          </div>
        </div>
      </article>

      {isVariable ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-[#D7E0EA] bg-white md:mt-5">
          <div className="flex items-center justify-between gap-3 border-b border-[#E8EDF3] px-4 py-3.5 md:px-5">
            <div>
              <h2 className="text-base font-extrabold text-[#17233C]">
                {variationKind ===
                "colour"
                  ? "Available Colours"
                  : variationKind ===
                      "size"
                    ? "Available Sizes"
                    : "Product Variations"}
              </h2>
              <p className="mt-0.5 text-xs text-[#7A8497]">
                Price and available quantity for each option.
              </p>
            </div>

            {extraLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#1F63D8]" />
            ) : (
              <span className="rounded-full bg-[#EEF5FF] px-2.5 py-1 text-[10px] font-extrabold text-[#1F63D8]">
                {variations.length}
              </span>
            )}
          </div>

          {variations.length > 0 ? (
            <>
              <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-5">
                {variations.map(
                  (variation) => {
                    const selected =
                      selectedVariationId ===
                      variation.id;
                    const option =
                      variationOption(
                        variation
                      );

                    return (
                      <button
                        key={variation.id}
                        type="button"
                        onClick={() =>
                          setSelectedVariationId(
                            variation.id
                          )
                        }
                        className={[
                          "min-h-10 shrink-0 rounded-xl border px-3 text-xs font-extrabold transition",
                          selected
                            ? "border-[#1F63D8] bg-[#EEF5FF] text-[#1F63D8]"
                            : "border-[#D7E0EA] bg-white text-[#475569]",
                        ].join(" ")}
                      >
                        {option}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="divide-y divide-[#EEF2F6]">
                {variations.map(
                  (variation) => {
                    const option =
                      variationOption(
                        variation
                      );
                    const image =
                      getImageSrcSafe(
                        variation.image
                      );

                    return (
                      <button
                        key={variation.id}
                        type="button"
                        onClick={() =>
                          setSelectedVariationId(
                            variation.id
                          )
                        }
                        className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#F8FAFC] md:px-5"
                      >
                        {variationKind ===
                        "colour" ? (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D7E0EA] bg-[#F8FAFC]">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Palette className="h-5 w-5 text-[#94A3B8]" />
                            )}
                          </span>
                        ) : (
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-sm font-extrabold text-[#1F63D8]">
                            {option}
                          </span>
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-[#17233C]">
                            {option}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#7A8497]">
                            SKU:{" "}
                            {fmt(
                              variation.sku,
                              "—"
                            )}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-extrabold text-[#17233C]">
                            {formatPrice(
                              variation.price ||
                                variation.regular_price
                            )}
                          </span>
                          <span
                            className={[
                              "mt-1 block text-[11px] font-bold",
                              (
                                typeof variation.stock_quantity ===
                                  "number"
                                  ? variation.stock_quantity >
                                    0
                                  : variation.stock_status !==
                                    "outofstock"
                              )
                                ? "text-emerald-700"
                                : "text-rose-600",
                            ].join(" ")}
                          >
                            Qty{" "}
                            {typeof variation.stock_quantity ===
                            "number"
                              ? variation.stock_quantity
                              : "—"}
                          </span>
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-center text-sm font-semibold text-[#7A8497]">
              No variations found.
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-3 overflow-hidden rounded-2xl border border-[#D7E0EA] bg-white md:mt-5">
        <div className="border-b border-[#E8EDF3] px-4 py-3.5 md:px-5">
          <h2 className="text-base font-extrabold text-[#17233C]">
            Product Description
          </h2>
        </div>

        <div className="space-y-5 px-4 py-4 md:px-5 md:py-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A8497]">
              Summary
            </div>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#475569]">
              {shortDesc ||
                "No short description added."}
            </p>
          </div>

          {fullDesc ? (
            <div className="border-t border-[#EEF2F6] pt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7A8497]">
                More Details
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#475569]">
                {fullDesc}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {isGrouped ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-[#D7E0EA] bg-white md:mt-5">
          <div className="border-b border-[#E8EDF3] px-4 py-3.5 md:px-5">
            <h2 className="text-base font-extrabold text-[#17233C]">
              Grouped Products
            </h2>
          </div>
          <div className="divide-y divide-[#EEF2F6]">
            {groupedChildren.map(
              (child) => (
                <Link
                  key={child.id}
                  href={`/products/${child.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 text-sm md:px-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-[#17233C]">
                      {child.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[#7A8497]">
                      {fmt(
                        child.sku,
                        "No SKU"
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 font-extrabold text-[#17233C]">
                    {formatPrice(
                      child.price
                    )}
                  </span>
                </Link>
              )
            )}
          </div>
        </section>
      ) : null}

      <details className="group mt-3 overflow-hidden rounded-2xl border border-[#D7E0EA] bg-white md:mt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 md:px-5">
          <div>
            <div className="text-base font-extrabold text-[#17233C]">
              Additional Details
            </div>
            <div className="mt-0.5 text-xs text-[#7A8497]">
              Product metadata and optional information
            </div>
          </div>
          <span className="text-xs font-extrabold text-[#1F63D8] group-open:hidden">
            Show
          </span>
          <span className="hidden text-xs font-extrabold text-[#1F63D8] group-open:inline">
            Hide
          </span>
        </summary>

        <div className="grid gap-3 border-t border-[#E8EDF3] px-4 py-4 sm:grid-cols-2 md:px-5 lg:grid-cols-3">
          <StatField
            label="Weight"
            value={
              product.weight
                ? `${product.weight} kg`
                : "Not set"
            }
          />
          <StatField
            label="Dimensions"
            value={dimensionLabel}
          />
          <StatField
            label="Product ID"
            value={product.id}
          />
          <StatField
            label="Created"
            value={
              product.date_created
                ? new Date(
                    product.date_created
                  ).toLocaleString()
                : "—"
            }
          />
          <StatField
            label="Last Updated"
            value={
              product.date_modified
                ? new Date(
                    product.date_modified
                  ).toLocaleString()
                : "—"
            }
          />
          <StatField
            label="Visibility"
            value={fmt(
              product.catalog_visibility,
              "visible"
            )}
          />

          {product.tags &&
          product.tags.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#7A8497]">
                Tags
              </div>
              <div className="flex flex-wrap gap-2">
                {product.tags.map(
                  (tag, index) => (
                    <span
                      key={`${tag.id ?? "tag"}-${index}`}
                      className="rounded-full bg-[#EEF5FF] px-3 py-1.5 text-xs font-bold text-[#1F63D8]"
                    >
                      {tag.name}
                    </span>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>
      </details>
    </main>
  );
}