import Image from "next/image";
import Link from "next/link";
import { woo } from "@/lib/woo";

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

// Force dynamic so the list always reflects latest trash state
export const dynamic = "force-dynamic";

// Fetch trashed products from WooCommerce
async function getTrashed(): Promise<P[]> {
  const { data } = await woo.get<P[]>("/products", {
    params: {
      status: "trash",
      per_page: 100,
      orderby: "date",
      order: "desc",
    },
  });
  return data || [];
}

export default async function TrashPage() {
  const items = await getTrashed();

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Trash Bin</h1>
        <Link href="/products" className="text-sm text-blue-600 underline">
          Back to Products
        </Link>
      </div>

      <TrashClient initial={items} />
    </main>
  );
}

// -------------------------------
// Client Island (imported inline)
// -------------------------------
import TrashClient from "./TrashClient";
