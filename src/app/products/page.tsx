import Link from "next/link";
import { woo } from "@/lib/woo";
import ProductsClientTable from "@/components/ProductsClientTable";
import ProductsFilters from "@/components/ProductsFilters";

type Product = {
  id: number;
  name: string;
  sku?: string;
  status: string;
  type: "simple" | "variable" | "grouped" | string;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  price?: string;
  stock_status?: "instock" | "outofstock" | "onbackorder";
  manage_stock?: boolean;
  stock_quantity?: number | null;
  date_created?: string;
  permalink?: string;
  images?: { id: number; src: string; name: string }[];
  categories?: { id: number; name: string }[];
};

type Category = { id: number; name: string; parent: number };

export const dynamic = "force-dynamic";

async function getProducts(params: {
  category?: string;
  stock?: "instock" | "outofstock" | "onbackorder";
  ptype?: "simple" | "variable" | "grouped" | "";
}): Promise<Product[]> {
  const query: Record<string, any> = {
    per_page: 50,
    orderby: "date",
    order: "desc",
    status: "any",
  };
  if (params.category) query.category = params.category;
  if (params.stock) query.stock_status = params.stock;
  if (params.ptype) query.type = params.ptype;

  const res = await woo.get<Product[]>("/products", { params: query });
  return res.data || [];
}

async function getCategories(): Promise<Category[]> {
  const res = await woo.get<Category[]>("/products/categories", {
    params: { per_page: 100, hide_empty: false, orderby: "name", order: "asc" },
  });
  return res.data || [];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: {
    category?: string;
    stock?: "instock" | "outofstock" | "onbackorder";
    ptype?: "simple" | "variable" | "grouped";
  };
}) {
  const category = searchParams.category || "";
  const stock = searchParams.stock || undefined;
  const ptype = (searchParams.ptype as any) || "";

  const [products, categories] = await Promise.all([
    getProducts({ category, stock, ptype }),
    getCategories(),
  ]);

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/products/add"
            className="rounded bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700"
          >
            + Add New
          </Link>
        </div>
      </div>

      <ProductsFilters
        categories={categories}
        initialCategory={category}
        initialStock={(stock as any) || ""}
        initialType={(ptype as any) || ""}
      />

      {/* 👉 pass categories into the table for bulk “set categories” */}
      <ProductsClientTable products={products} categories={categories} />
    </main>
  );
}
