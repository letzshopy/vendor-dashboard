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
      per_page: 50,
      status: "any",
      orderby: "date",
      order: "desc",
      _fields:
        "id,name,sku,manage_stock,stock_quantity,stock_status",
    },
  });
  return data || [];
}

export default async function InventoryPage() {
  const items = await getProducts();

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inventory</h1>
      <InventoryClient initial={items} />
    </main>
  );
}
