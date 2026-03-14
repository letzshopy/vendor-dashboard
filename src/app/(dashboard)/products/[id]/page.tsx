"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

function pillClass(color: "green" | "amber" | "slate" | "red" = "slate") {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium";
  const map: Record<typeof color, string> = {
    green: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border border-amber-100",
    slate: "bg-slate-100 text-slate-700 border border-slate-200",
    red: "bg-rose-50 text-rose-700 border border-rose-100",
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
        console.error(e);
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

          setGroupedChildren(
            children.filter(Boolean) as GroupedChild[]
          );
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
    return <div className="p-6 text-sm text-slate-500">Loading product…</div>;
  }

  if (loadErr || !product) {
    return (
      <div className="space-y-4 p-6">
        <button
          onClick={() => router.back()}
          className="text-xs text-indigo-600 hover:underline"
        >
          ← Products
        </button>
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {loadErr || "Product not found"}
        </div>
      </div>
    );
  }

  const shortDesc = product.short_description || product.shortDescription || "";
  const isVariable = product.type === "variable";
  const isGrouped = product.type === "grouped";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <button
            onClick={() => router.back()}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            ← Products
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {product.name || "Untitled product"}
            </h1>

            {product.status && (
              <span className={pillClass("slate")}>
                {product.status === "publish"
                  ? "Published"
                  : product.status.charAt(0).toUpperCase() +
                    product.status.slice(1)}
              </span>
            )}

            {product.type && (
              <span className={pillClass("amber")}>
                {product.type.charAt(0).toUpperCase() + product.type.slice(1)}{" "}
                product
              </span>
            )}

            {stockBadge(product.stock_status)}
          </div>

          {product.permalink && (
            <a
              href={product.permalink}
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
            >
              View on storefront
              <span className="text-xs">↗</span>
            </a>
          )}
        </div>

        <Link
          href={`/products/${product.id}/edit`}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Edit
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          {galleryImages.length > 0 ? (
            <div className="space-y-4">
              <div className="flex min-h-[320px] items-center justify-center rounded-xl bg-slate-50">
                {getImageSrcSafe(mainImage) ? (
                  <img
                    src={getImageSrcSafe(mainImage)!}
                    alt={mainImage?.name || product.name}
                    className="max-h-[420px] w-auto rounded-xl object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">
                    Image URL missing from API.
                  </span>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="flex flex-wrap gap-3">
                  {galleryImages.map((img, idx) => {
                    const thumbSrc = getImageSrcSafe(img);
                    const activeId = activeImgId ?? galleryImages[0].id ?? 0;
                    const thisId = img.id ?? idx;

                    return (
                      <button
                        key={`${img.id ?? "img"}-${idx}`}
                        type="button"
                        onClick={() => setActiveImgId(thisId)}
                        className={`relative h-20 w-20 overflow-hidden rounded-lg border bg-slate-50 ${
                          activeId === thisId
                            ? "border-indigo-500 ring-2 ring-indigo-200"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={img.name || product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="px-1 text-center text-[10px] text-slate-400">
                            No URL
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
              No images uploaded
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Pricing &amp; stock
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  SKU
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {fmt(product.sku, "—")}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Price
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {isVariable
                    ? "See variations"
                    : formatPrice(product.price || product.regular_price)}
                  {!isVariable &&
                    product.sale_price &&
                    String(product.sale_price) !== String(product.price) && (
                      <span className="ml-2 text-xs text-emerald-600">
                        On sale: {formatPrice(product.sale_price)}
                      </span>
                    )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Stock
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {isVariable
                    ? "Managed by variations"
                    : product.manage_stock &&
                      typeof product.stock_quantity === "number"
                    ? `${product.stock_quantity} units`
                    : "Not managed"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Visibility
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {fmt(product.catalog_visibility, "Catalog & search")}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Categories &amp; tags
            </h2>

            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Categories
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {product.categories && product.categories.length > 0 ? (
                    product.categories.map((c, idx) => (
                      <span
                        key={`${c.id ?? "cat"}-${idx}`}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
                      >
                        {c.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Tags
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {product.tags && product.tags.length > 0 ? (
                    product.tags.map((t, idx) => (
                      <span
                        key={`${t.id ?? "tag"}-${idx}`}
                        className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700"
                      >
                        {t.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Shipping &amp; logistics
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Weight
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {fmt(product.weight)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Dimensions (L × W × H)
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {product.dimensions ? (
                    <>
                      {fmt(product.dimensions.length, "–")} ×{" "}
                      {fmt(product.dimensions.width, "–")} ×{" "}
                      {fmt(product.dimensions.height, "–")}
                    </>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Shipping class
                </div>
                <div className="mt-1 text-sm text-slate-900">
                  {fmt(product.shipping_class, "None")}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isVariable && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Variations
            </h2>
            {extraLoading && (
              <span className="text-xs text-slate-500">Loading variations…</span>
            )}
          </div>

          {variations.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Variation</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {variations.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100 bg-white">
                      <td className="px-3 py-2 text-slate-700">
                        {variationLabel(v.attributes)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {fmt(v.sku, "—")}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatPrice(v.price || v.regular_price)}
                        {v.sale_price &&
                          String(v.sale_price) !== String(v.price) && (
                            <span className="ml-2 text-[11px] text-emerald-600">
                              Sale: {formatPrice(v.sale_price)}
                            </span>
                          )}
                      </td>
                      <td className="px-3 py-2">{stockBadge(v.stock_status)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {v.manage_stock && typeof v.stock_quantity === "number"
                          ? v.stock_quantity
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No variations found for this product.
            </div>
          )}
        </section>
      )}

      {isGrouped && (
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Grouped products
            </h2>
            {extraLoading && (
              <span className="text-xs text-slate-500">Loading grouped items…</span>
            )}
          </div>

          {groupedChildren.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Stock</th>
                    <th className="px-3 py-2">View</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedChildren.map((child) => (
                    <tr
                      key={child.id}
                      className="border-t border-slate-100 bg-white"
                    >
                      <td className="px-3 py-2 text-slate-700">{child.name}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {fmt(child.sku, "—")}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatPrice(child.price)}
                      </td>
                      <td className="px-3 py-2">
                        {stockBadge(child.stock_status)}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/products/${child.id}`}
                          className="text-indigo-600 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No grouped child products found.
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Short description
          </h2>
          <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {shortDesc ? (
              <div dangerouslySetInnerHTML={{ __html: shortDesc }} />
            ) : (
              <span className="text-slate-400">No short description added.</span>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Full description
          </h2>
          <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
            {product.description ? (
              <div dangerouslySetInnerHTML={{ __html: product.description }} />
            ) : (
              <span className="text-slate-400">
                No detailed description added.
              </span>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-500 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <span className="font-medium text-slate-700">Product ID:</span>{" "}
            {product.id}
          </div>
          {product.date_created && (
            <div>
              <span className="font-medium text-slate-700">Created:</span>{" "}
              {new Date(product.date_created).toLocaleString()}
            </div>
          )}
          {product.date_modified && (
            <div>
              <span className="font-medium text-slate-700">Last updated:</span>{" "}
              {new Date(product.date_modified).toLocaleString()}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}