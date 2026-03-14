import { getWooClient } from "@/lib/woo";
import InventoryClient from "@/components/InventoryClient";

type P = {
  id: number;
  name: string;
  sku?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: "instock" | "outofstock" | "onbackorder";
};

export const dynamic = "force-dynamic";

async function getProducts(): Promise<P[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100; // Woo max is 100
    const MAX_PAGES = 10; // safety cap (1000 products)
    const all: P[] = [];

    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await woo.get<P[]>("/products", {
        params: {
          per_page: PER_PAGE,
          page,
          status: "any",
          orderby: "date",
          order: "desc",
          _fields: "id,name,sku,manage_stock,stock_quantity,stock_status",
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    return all
      .map((p: any) => ({
        id: Number(p?.id || 0),
        name: String(p?.name || ""),
        sku: p?.sku ? String(p.sku) : undefined,
        manage_stock: !!p?.manage_stock,
        stock_quantity:
          p?.stock_quantity === null || p?.stock_quantity === undefined
            ? null
            : Number(p.stock_quantity),
        stock_status: (p?.stock_status as any) || "instock",
      }))
      .filter((p) => p.id > 0 && p.name);
  } catch {
    return [];
  }
}

export default async function InventoryPage() {
  const items = await getProducts();

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-rose-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
        <p className="mt-1 text-sm text-slate-600">
          Quick overview of stock status across your catalog. Filter by stock
          level, search by SKU, and spot low-stock products at a glance.
        </p>
      </div>

      <InventoryClient initial={items} />
    </main>
  );
}