// src/app/products/trash/page.tsx
import Link from "next/link";
import { getWooClient } from "@/lib/woo";
import TrashClient from "./TrashClient";

// ---- Types ----
type P = {
  id: number;
  name: string;
  sku?: string;
  date_created?: string;
  images?: { id: number; src: string; name?: string }[];
  categories?: { id: number; name: string }[];
  type?: "simple" | "variable" | "grouped";
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
};

// Always fetch fresh list
export const dynamic = "force-dynamic";

// Fetch trashed products from WooCommerce
async function getTrashed(): Promise<P[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 10; // safety cap (1000 trashed products)
    const all: P[] = [];

    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await woo.get<P[]>("/products", {
        params: {
          status: "trash",
          per_page: PER_PAGE,
          page,
          orderby: "date",
          order: "desc",
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    return all;
  } catch {
    return [];
  }
}

export default async function TrashPage() {
  const items = await getTrashed();

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Header card */}
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-sky-50 px-5 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Trash Bin</h1>
          <p className="mt-1 text-sm text-slate-600">
            View products moved to trash. Restore items or permanently delete
            them to keep your catalog clean.
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Back to Products
        </Link>
      </div>

      <TrashClient initial={items} />
    </main>
  );
}