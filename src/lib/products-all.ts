// src/lib/products-all.ts
import { getWooClient } from "@/lib/woo";

export type DashboardProduct = {
  id: number;
  name: string;
  status: string;
  stock_status?: string;
  [key: string]: any;
};

function getHeaderInt(headers: any, key: string, fallback = 1) {
  const v =
    headers?.[key] ??
    headers?.[key.toLowerCase()] ??
    headers?.[key.toUpperCase()];
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Fetch **all unique published products** for this store.
 *
 * - Uses status="publish" (matches "Published" view in admin)
 * - Loops pages based on x-wp-totalpages
 * - De-duplicates by product ID
 */
export async function fetchAllPublishedProducts(): Promise<DashboardProduct[]> {
  const woo = await getWooClient();

  const perPage = 100; // Woo max
  const MAX_PAGES = 50; // safety cap (5000 products)

  let page = 1;

  // Map ensures each product ID appears only once.
  const byId = new Map<number, DashboardProduct>();

  while (page <= MAX_PAGES) {
    const res = await woo.get("/products", {
      params: {
        status: "publish",
        per_page: perPage,
        page,
        // Reduce payload (keep what dashboard typically needs; add more if required)
        _fields: "id,name,status,stock_status,sku,price,regular_price,images",
      },
    });

    const batch = Array.isArray(res.data)
      ? (res.data as DashboardProduct[])
      : [];

    for (const p of batch) {
      if ((p?.status || "") !== "publish") continue;

      const idNum = Number((p as any)?.id);
      if (!Number.isFinite(idNum) || idNum <= 0) continue;

      if (!byId.has(idNum)) byId.set(idNum, p);
    }

    const totalPages = getHeaderInt(res.headers, "x-wp-totalpages", 1);

    if (!batch.length || page >= totalPages) break;
    page++;
  }

  const allProducts = Array.from(byId.values());

  console.log("fetchAllPublishedProducts: unique published products =", {
    count: allProducts.length,
  });

  return allProducts;
}