import { woo } from "@/lib/woo";
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
  const { data } = await woo.get<P[]>("/products", {
    params: {
      per_page: 100, // Woo max is 100 – 200 was causing 400 error
      status: "any",
      orderby: "date",
      order: "desc",
      _fields: "id,name,sku,manage_stock,stock_quantity,stock_status",
    },
  });

  return data || [];
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
