import Link from "next/link";
import { Boxes, Plus } from "lucide-react";
import { getWooClient } from "@/lib/woo";
import ProductsClientTable from "@/components/ProductsClientTable";
import ProductsFilters from "@/components/ProductsFilters";
import ProductsImportExportBar from "./ui/ProductsImportExportBar";

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

async function getProducts(
  woo: Awaited<ReturnType<typeof getWooClient>>,
  params: {
    category?: string;
    stock?: "instock" | "outofstock" | "onbackorder";
    ptype?: "simple" | "variable" | "grouped" | "";
  }
): Promise<Product[]> {
  const query: Record<string, any> = {
    per_page: 100,
    orderby: "date",
    order: "desc",
    status: "any",
  };

  if (params.category) query.category = params.category;
  if (params.stock) query.stock_status = params.stock;
  if (params.ptype) query.type = params.ptype;

  const res = await woo.get<Product[]>("/products", { params: query });
  return Array.isArray(res.data) ? res.data : [];
}

async function getCategories(
  woo: Awaited<ReturnType<typeof getWooClient>>
): Promise<Category[]> {
  const res = await woo.get<Category[]>("/products/categories", {
    params: { per_page: 100, hide_empty: false, orderby: "name", order: "asc" },
  });
  return Array.isArray(res.data) ? res.data : [];
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    stock?: "instock" | "outofstock" | "onbackorder";
    ptype?: "simple" | "variable" | "grouped";
  }>;
}) {
  const sp = await searchParams;

  const category = sp.category || "";
  const stock = sp.stock || undefined;
  const ptype = (sp.ptype as any) || "";

  const woo = await getWooClient();

  const [products, categories] = await Promise.all([
    getProducts(woo, { category, stock, ptype }),
    getCategories(woo),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      <div className="rounded-[26px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <Boxes className="h-3.5 w-3.5" />
          Catalog
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            Products
          </h1>

          <Link
            href="/products/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 md:px-5"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </Link>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage product listings, stock, pricing and categories.
        </p>
      </div>

      <section className="mt-4 space-y-4 md:space-y-5">
        <ProductsFilters
          categories={categories}
          initialCategory={category}
          initialStock={(stock as any) || ""}
          initialType={(ptype as any) || ""}
          rightSlot={
            <ProductsImportExportBar
              key="products-import-export"
              categories={categories}
            />
          }
        />

        <ProductsClientTable products={products} categories={categories} />
      </section>
    </main>
  );
}