"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Package, X } from "lucide-react";

export type CategoryDetail = {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  image?: { id: number; src: string } | null;
};

export type CategoryProduct = {
  id: number;
  name: string;
  sku: string;
  status: string;
  stockStatus: string;
  image: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export default function CategoryDetailClient({
  category,
  initialProducts,
}: {
  category: CategoryDetail;
  initialProducts: CategoryProduct[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function removeProduct(product: CategoryProduct) {
    if (!confirm(`Remove “${product.name}” from this category?`)) return;

    setRemovingId(product.id);

    try {
      const response = await fetch(
        `/api/categories/${category.id}/products/${product.id}`,
        { method: "DELETE" },
      );
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message = isRecord(payload) && typeof payload.error === "string"
          ? payload.error
          : "Could not remove product from category.";
        throw new Error(message);
      }

      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : "Could not remove product.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 md:px-5 md:py-6">
      <Link
        href="/categories"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Categories
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {category.image?.src ? (
            // Remote WordPress category media URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.image.src}
              alt=""
              className="h-24 w-24 rounded-2xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-violet-50 text-violet-700">
              <Package className="h-8 w-8" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-slate-900">{category.name}</h1>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="block text-xs text-slate-500">Slug</span>
                <span className="font-medium text-slate-800">{category.slug}</span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="block text-xs text-slate-500">Product count</span>
                <span className="font-medium text-slate-800">{products.length}</span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2 sm:col-span-2 lg:col-span-1">
                <span className="block text-xs text-slate-500">Category ID</span>
                <span className="font-medium text-slate-800">{category.id}</span>
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {category.description || "No description added."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 md:px-6">
          <h2 className="font-semibold text-slate-900">Products in this category</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {products.length}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 px-4 py-3 md:px-6">
              {product.image ? (
                // Remote WooCommerce product image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt="" className="h-14 w-14 rounded-xl border object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-slate-100 text-xs text-slate-400">No image</div>
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/products/${product.id}/edit`} className="block truncate font-semibold text-slate-900 hover:text-violet-700">
                  {product.name}
                </Link>
                <p className="truncate text-xs text-slate-500">
                  {product.sku || "No SKU"} · {product.status} · {product.stockStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeProduct(product)}
                disabled={removingId === product.id}
                aria-label={`Remove ${product.name} from category`}
                title="Remove from category"
                className="grid h-10 w-10 place-items-center rounded-xl border border-rose-200 text-rose-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          {products.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              No products are assigned to this category.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
