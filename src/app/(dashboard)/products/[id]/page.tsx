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
  Pencil,
  Ruler,
  Tag,
  Truck,
  Wallet,
} from "lucide-react";

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
};

type GroupedChild = {
  id: number;
  name: string;
  sku?: string;
  price?: string | number;
  stock_status?: string;
  permalink?: string;
};

function pillClass(color: "green" | "amber" | "slate" | "red" | "violet" = "slate") {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border";
  const map: Record<typeof color, string> = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    red: "bg-rose-50 text-rose-700 border-rose-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
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
    <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-700 shadow-sm">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                {title}
              </h2>
              {hint ? (
                <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
              ) : null}
            </div>
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
      </div>
      <div className="p-4 md:p-5">{children}</div>
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
    <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-medium text-slate-900">{value}</div>
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
  const [extraLoading, setExtraLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        setLoading(true);
        setLoadErr(null);

        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        const raw = await res.text();

        let j: any = {};
        try {
          j = raw ? JSON.parse(raw) : {};
        } catch {
          j = {};
        }

        if (!res.ok) throw new Error(j?.error || "Failed to load product");
        setProduct(j as Product);
      } catch (e: any) {
        setLoadErr(e?.message || "Failed to load product");
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

          let j: any = {};
          try {
            j = raw ? JSON.parse(raw) : {};
          } catch {
            j = {};
          }

          if (res.ok) {
            setVariations(Array.isArray(j?.variations) ? j.variations : []);
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

                let j: any = {};
                try {
                  j = raw ? JSON.parse(raw) : {};
                } catch {
                  j = {};
                }

                if (!res.ok) return null;

                return {
                  id: j.id,
                  name: j.name,
                  sku: j.sku,
                  price: j.price || j.regular_price,
                  stock_status: j.stock_status,
                  permalink: j.permalink,
                } as GroupedChild;
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
      <div className="p-4 md:p-6">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-[26px] border border-slate-200 bg-white px-6 py-6 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            <div className="text-sm font-medium text-slate-600">
              Loading product...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadErr || !product) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Products
          </button>

          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-800">
            {loadErr || "Product not found"}
          </div>
        </div>
      </div>
    );
  }

  const shortDesc = product.short_description || product.shortDescription || "";
  const isVariable = product.type === "variable";
  const isGrouped = product.type === "grouped";

  return (
    <main className="mx-auto max-w-7xl px-3 pb-28 pt-3 md:px-4 md:pb-8 md:pt-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Products
              </button>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {product.status && (
                  <span className={pillClass("slate")}>
                    {product.status === "publish"
                      ? "Published"
                      : product.status.charAt(0).toUpperCase() +
                        product.status.slice(1)}
                  </span>
                )}

                {product.type && (
                  <span className={pillClass("violet")}>
                    {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
                  </span>
                )}

                {stockBadge(product.stock_status)}
              </div>

              <h1 className="mt-3 break-words text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
                {product.name || "Untitled product"}
              </h1>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                SKU: {fmt(product.sku, "—")}
                {product.color ? ` • Color: ${product.color}` : ""}
              </p>

              {product.permalink && (
                <a
                  href={product.permalink}
                  target="_blank"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View on storefront
                </a>
              )}
            </div>

            <Link
              href={`/products/${product.id}/edit`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
            >
              <Pencil className="h-4 w-4" />
              Edit Product
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <SectionCard
          title="Product gallery"
          icon={ImageIcon}
          hint="Preview uploaded product images. First image is treated as main display image."
          right={
            galleryImages.length > 0 ? (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {galleryImages.length} image{galleryImages.length > 1 ? "s" : ""}
              </div>
            ) : null
          }
        >
          {galleryImages.length > 0 ? (
            <div className="space-y-4">
              <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50 p-3 md:min-h-[420px]">
                {getImageSrcSafe(mainImage) ? (
                  <img
                    src={getImageSrcSafe(mainImage)!}
                    alt={mainImage?.name || product.name}
                    className="max-h-[460px] w-auto rounded-2xl object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Image URL missing from API.
                  </span>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-7">
                  {galleryImages.map((img, idx) => {
                    const thumbSrc = getImageSrcSafe(img);
                    const selectedId = activeImgId ?? galleryImages[0].id ?? 0;
                    const thisId = img.id ?? idx;

                    return (
                      <button
                        key={`${img.id ?? "img"}-${idx}`}
                        type="button"
                        onClick={() => setActiveImgId(thisId)}
                        className={`overflow-hidden rounded-2xl border bg-slate-50 ${
                          selectedId === thisId
                            ? "border-violet-500 ring-2 ring-violet-200"
                            : "border-slate-200 hover:border-violet-300"
                        }`}
                      >
                        <div className="aspect-square">
                          {thumbSrc ? (
                            <img
                              src={thumbSrc}
                              alt={img.name || product.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-slate-400">
                              No URL
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              No images uploaded
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Pricing & stock"
            icon={Wallet}
            hint="Main commercial details and stock visibility."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <StatField label="SKU" value={fmt(product.sku, "—")} />
              <StatField label="Color" value={fmt(product.color, "—")} />

              <StatField
                label="Price"
                value={
                  isVariable ? (
                    "See variations"
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{formatPrice(product.price || product.regular_price)}</span>
                      {!isVariable &&
                        product.sale_price &&
                        String(product.sale_price) !== String(product.price) && (
                          <span className="text-xs font-medium text-emerald-600">
                            Sale: {formatPrice(product.sale_price)}
                          </span>
                        )}
                    </div>
                  )
                }
              />

              <StatField
                label="Stock"
                value={
                  isVariable
                    ? "Managed by variations"
                    : product.manage_stock &&
                      typeof product.stock_quantity === "number"
                    ? `${product.stock_quantity} units`
                    : "Not managed"
                }
              />

              <StatField
                label="Visibility"
                value={fmt(product.catalog_visibility, "Catalog & search")}
              />
              <StatField
                label="Status"
                value={fmt(product.status, "—")}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Categories & tags"
            icon={Tag}
            hint="Classification used for catalog browsing and search."
          >
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Categories
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.categories && product.categories.length > 0 ? (
                    product.categories.map((c, idx) => (
                      <span
                        key={`${c.id ?? "cat"}-${idx}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None</span>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.tags && product.tags.length > 0 ? (
                    product.tags.map((t, idx) => (
                      <span
                        key={`${t.id ?? "tag"}-${idx}`}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                      >
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400">None</span>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Shipping & logistics"
            icon={Truck}
            hint="Physical product shipment details."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <StatField label="Weight" value={fmt(product.weight)} />
              <StatField
                label="Dimensions"
                value={
                  product.dimensions ? (
                    <>
                      {fmt(product.dimensions.length, "–")} ×{" "}
                      {fmt(product.dimensions.width, "–")} ×{" "}
                      {fmt(product.dimensions.height, "–")}
                    </>
                  ) : (
                    "Not set"
                  )
                }
              />
              <StatField
                label="Shipping class"
                value={fmt(product.shipping_class, "None")}
              />
              <StatField
                label="Type"
                value={fmt(product.type, "—")}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {isVariable && (
        <div className="mt-4">
          <SectionCard
            title="Variations"
            icon={Layers3}
            hint="All generated combinations for this variable product."
            right={
              extraLoading ? (
                <span className="text-xs font-medium text-slate-500">
                  Loading variations...
                </span>
              ) : variations.length > 0 ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {variations.length} variation{variations.length > 1 ? "s" : ""}
                </div>
              ) : null
            }
          >
            {variations.length > 0 ? (
              <>
                <div className="space-y-3 md:hidden">
                  {variations.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {variationLabel(v.attributes)}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <StatField label="SKU" value={fmt(v.sku, "—")} />
                        <StatField
                          label="Price"
                          value={
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{formatPrice(v.price || v.regular_price)}</span>
                              {v.sale_price &&
                                String(v.sale_price) !== String(v.price) && (
                                  <span className="text-xs text-emerald-600">
                                    Sale: {formatPrice(v.sale_price)}
                                  </span>
                                )}
                            </div>
                          }
                        />
                        <StatField label="Stock" value={stockBadge(v.stock_status)} />
                        <StatField
                          label="Qty"
                          value={
                            v.manage_stock && typeof v.stock_quantity === "number"
                              ? v.stock_quantity
                              : "—"
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Variation</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variations.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100 bg-white">
                          <td className="px-4 py-3 text-slate-700">
                            {variationLabel(v.attributes)}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {fmt(v.sku, "—")}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatPrice(v.price || v.regular_price)}
                            {v.sale_price &&
                              String(v.sale_price) !== String(v.price) && (
                                <span className="ml-2 text-xs text-emerald-600">
                                  Sale: {formatPrice(v.sale_price)}
                                </span>
                              )}
                          </td>
                          <td className="px-4 py-3">{stockBadge(v.stock_status)}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {v.manage_stock && typeof v.stock_quantity === "number"
                              ? v.stock_quantity
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No variations found for this product.
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {isGrouped && (
        <div className="mt-4">
          <SectionCard
            title="Grouped products"
            icon={Boxes}
            hint="Products included inside this grouped product."
            right={
              extraLoading ? (
                <span className="text-xs font-medium text-slate-500">
                  Loading grouped items...
                </span>
              ) : groupedChildren.length > 0 ? (
                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {groupedChildren.length} item{groupedChildren.length > 1 ? "s" : ""}
                </div>
              ) : null
            }
          >
            {groupedChildren.length > 0 ? (
              <>
                <div className="space-y-3 md:hidden">
                  {groupedChildren.map((child) => (
                    <div
                      key={child.id}
                      className="rounded-[22px] border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="text-sm font-semibold text-slate-900">
                        {child.name}
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <StatField label="SKU" value={fmt(child.sku, "—")} />
                        <StatField label="Price" value={formatPrice(child.price)} />
                        <StatField label="Stock" value={stockBadge(child.stock_status)} />
                        <div className="rounded-[20px] border border-slate-200/80 bg-white p-3">
                          <Link
                            href={`/products/${child.id}`}
                            className="inline-flex items-center gap-2 text-sm font-medium text-violet-700 hover:underline"
                          >
                            Open product
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Stock</th>
                        <th className="px-4 py-3">View</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedChildren.map((child) => (
                        <tr
                          key={child.id}
                          className="border-t border-slate-100 bg-white"
                        >
                          <td className="px-4 py-3 text-slate-700">{child.name}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {fmt(child.sku, "—")}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatPrice(child.price)}
                          </td>
                          <td className="px-4 py-3">
                            {stockBadge(child.stock_status)}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/products/${child.id}`}
                              className="text-violet-700 hover:underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="rounded-[24px] bg-slate-50 px-4 py-6 text-sm text-slate-500">
                No grouped child products found.
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Short description"
          icon={Package2}
          hint="Compact summary shown in key storefront areas."
        >
          <div className="prose prose-sm max-w-none text-slate-700">
            {shortDesc ? (
              <div dangerouslySetInnerHTML={{ __html: shortDesc }} />
            ) : (
              <span className="text-slate-400">No short description added.</span>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Full description"
          icon={Box}
          hint="Detailed product content and long-form information."
        >
          <div className="prose prose-sm max-w-none text-slate-700">
            {product.description ? (
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <span className="text-slate-400">
                No detailed description added.
              </span>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Product details"
          icon={Ruler}
          hint="Internal metadata and timestamps."
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatField label="Product ID" value={product.id} />
            <StatField
              label="Created"
              value={
                product.date_created
                  ? new Date(product.date_created).toLocaleString()
                  : "—"
              }
            />
            <StatField
              label="Last updated"
              value={
                product.date_modified
                  ? new Date(product.date_modified).toLocaleString()
                  : "—"
              }
            />
            <StatField label="Manage stock" value={product.manage_stock ? "Yes" : "No"} />
          </div>
        </SectionCard>
      </div>

      <div className="sticky bottom-3 z-40 -mx-1 mt-4 md:hidden">
        <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Back
            </button>

            <Link
              href={`/products/${product.id}/edit`}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Edit
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}