"use client";

import {
  Clapperboard,
  Film,
  Loader2,
  Search,
  ShoppingBag,
  Tag,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ExistingStory = {
  story_id: number;
  title: string;
  thumbnail: string;
  video_url: string;
  media_id: number;
  created_at: string;
  managed: boolean;
};

type Status = {
  ok: boolean;
  status: string;
  message?: string;
  group_id: number;
  group_name?: string;
  existing_count?: number;
  legacy_count?: number;
  publish_enabled?: boolean;
  items?: ExistingStory[];
};

type Product = {
  id: number;
  name: string;
  thumbnail: string;
  in_stock: boolean;
};
type Category = { id: number; name: string };
type SearchResults<T> = { items: T[] };

async function readBridge<T>(
  type: "status" | "products" | "categories",
  query = ""
): Promise<T> {
  const params = new URLSearchParams({ type });
  if (query) params.set("q", query);
  const response = await fetch(
    `/api/shoppable-videos/bridge?${params.toString()}`,
    { cache: "no-store" }
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    throw new Error("The store's shoppable video bridge is not ready.");
  }
  return body as T;
}

export default function ShoppableVideosClient() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [productQuery, setProductQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setStatusError("");
    try {
      setStatus(await readBridge<Status>("status"));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Could not load shoppable videos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProducts([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await readBridge<SearchResults<Product>>(
          "products", productQuery.trim()
        );
        if (active) setProducts(response.items || []);
      } catch {
        if (active) setProducts([]);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [productQuery]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await readBridge<SearchResults<Category>>(
          "categories", categoryQuery.trim()
        );
        if (active) setCategories(response.items || []);
      } catch {
        if (active) setCategories([]);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [categoryQuery]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 md:p-7">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-600 p-3 text-white">
            <Clapperboard className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shoppable Videos</h1>
            <p className="mt-1 text-sm text-slate-600">
              Publish short videos and tag products from your store.
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Desi pilot preparation: reviewing your existing ReelsWP group before
          enabling uploads and automatic seven-day or oldest-video deletion.
        </div>
      </header>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Homepage reel feed</h2>
          <button type="button" onClick={() => void loadStatus()}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            Refresh
          </button>
        </div>
        {loading && (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Inspecting your existing videos...
          </p>
        )}
        {statusError && (
          <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{statusError}</p>
        )}
        {!loading && status && !status.ok && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {status.message || "This store has not yet been configured."}
          </p>
        )}
        {!loading && status?.ok && (
          <>
            <p className="mt-2 text-sm text-slate-600">
              {status.group_name} · ReelsWP group #{status.group_id} ·
              {" "}{status.existing_count ?? 0} existing videos · Latest 10 target
            </p>
            {(status.legacy_count ?? 0) > 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {status.legacy_count} existing ReelsWP video(s) need a safe
                ownership audit before automatic deletion is enabled.
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(status.items || []).map((item) => (
                <div key={item.story_id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  {item.thumbnail ? (
                    // Native store thumbnail URLs are loaded as regular images.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt=""
                      className="h-20 w-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <Film className="h-6 w-6 text-slate-400" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.title || `Video #${item.story_id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.managed ? "Managed" : "Existing ReelsWP video"}
                    </p>
                    {item.media_id > 0 && (
                      <p className="mt-1 text-xs text-slate-400">Media #{item.media_id}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ShoppingBag className="h-5 w-5 text-indigo-600" /> Tag products
          </h2>
          <label htmlFor="sv-product-search" className="mt-4 block text-sm font-medium text-slate-700">
            Search by product name
          </label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input id="sv-product-search" value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder="Search your store's products"
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm" />
          </div>
          <div className="mt-3 space-y-2">
            {products.map((product) => (
              <button key={product.id} type="button"
                disabled={selectedProducts.some((selected) => selected.id === product.id)}
                onClick={() => setSelectedProducts((current) => [...current, product])}
                className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left text-sm hover:bg-indigo-50 disabled:opacity-50">
                <span className="truncate">{product.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {product.in_stock ? "Add +" : "Out of stock"}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedProducts.map((product) => (
              <button key={product.id} type="button"
                onClick={() => setSelectedProducts((current) => current.filter((p) => p.id !== product.id))}
                className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800">
                {product.name} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Tag className="h-5 w-5 text-indigo-600" /> Tag categories (optional)
          </h2>
          <label htmlFor="sv-category-search" className="mt-4 block text-sm font-medium text-slate-700">
            Find product categories
          </label>
          <input id="sv-category-search" value={categoryQuery}
            onChange={(event) => setCategoryQuery(event.target.value)}
            placeholder="Search categories"
            className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <div className="mt-3 max-h-56 space-y-2 overflow-auto">
            {categories.map((category) => (
              <button key={category.id} type="button"
                disabled={selectedCategories.some((selected) => selected.id === category.id)}
                onClick={() => setSelectedCategories((current) => [...current, category])}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 p-3 text-left text-sm hover:bg-indigo-50 disabled:opacity-50">
                {category.name} <span>Add +</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <button key={category.id} type="button"
                onClick={() => setSelectedCategories((current) => current.filter((c) => c.id !== category.id))}
                className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800">
                {category.name} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-dashed border-indigo-200 bg-indigo-50 p-5">
        <h2 className="text-lg font-semibold text-indigo-950">Upload and publish</h2>
        <p className="mt-2 text-sm text-indigo-900">
          Uploads will become available after the existing feed is audited.
          MP4 videos will upload directly to your own WordPress store and be
          added automatically to its configured ReelsWP group.
        </p>
        <button type="button" disabled
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white opacity-55">
          Upload video — pilot setup pending
        </button>
      </section>
    </main>
  );
}
