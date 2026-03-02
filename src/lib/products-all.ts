// src/lib/products-all.ts
import { woo } from "@/lib/woo";

export type DashboardProduct = {
  id: number;
  name: string;
  status: string;
  stock_status?: string;
  [key: string]: any;
};

/**
 * Fetch **all unique published products** for this store.
 *
 * - Uses status="publish" (matches "Published" view in admin)
 * - Loops all pages based on x-wp-totalpages
 * - De-duplicates by product ID so weird pagination / plugins
 *   don't inflate counts
 */
export async function fetchAllPublishedProducts(): Promise<DashboardProduct[]> {
  const perPage = 100; // Woo or plugins may clamp this lower; that's fine.
  let page = 1;

  // Map ensures each product ID appears only once.
  const byId = new Map<number, DashboardProduct>();

  while (true) {
    const res = await woo.get("products", {
      params: {
        status: "publish",
        per_page: perPage,
        page,
      },
    });

    const batch = Array.isArray(res.data)
      ? (res.data as DashboardProduct[])
      : [];

    for (const p of batch) {
      if (p.status !== "publish") continue;

      const idNum = Number(p.id);
      if (!Number.isFinite(idNum)) continue;

      if (!byId.has(idNum)) {
        byId.set(idNum, p);
      }
    }

    const totalPagesHeader =
      (res.headers["x-wp-totalpages"] as string | undefined) ??
      (res.headers["X-WP-TotalPages"] as string | undefined);

    const totalPages = totalPagesHeader ? Number(totalPagesHeader) : 1;

    if (!batch.length || !Number.isFinite(totalPages) || page >= totalPages) {
      break;
    }

    page++;
  }

  const allProducts = Array.from(byId.values());

  console.log("fetchAllPublishedProducts: unique published products =", {
    count: allProducts.length,
  });

  return allProducts;
}
