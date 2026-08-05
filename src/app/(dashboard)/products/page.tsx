import Link from "next/link";
import { Plus } from "lucide-react";
import { getWooClient } from "@/lib/woo";
import ProductsClientTable from "@/components/ProductsClientTable";
import ProductsFilters from "@/components/ProductsFilters";
import ProductsImportExportBar from "./ui/ProductsImportExportBar";
import ProductCreatedNotice from "@/components/ProductCreatedNotice";

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

async function getAllWooPages<T>(
  woo: Awaited<ReturnType<typeof getWooClient>>,
  endpoint: string,
  params: Record<string, string | number | boolean>
): Promise<T[]> {
  const firstPage = await woo.get<T[]>(endpoint, {
    params: {
      ...params,
      page: 1,
    },
  });

  const items = Array.isArray(firstPage.data)
    ? [...firstPage.data]
    : [];

  const headerTotalPages = Number(
    firstPage.headers["x-wp-totalpages"] ?? 1
  );

  const totalPages =
    Number.isFinite(headerTotalPages) &&
    headerTotalPages > 1
      ? Math.floor(headerTotalPages)
      : 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await woo.get<T[]>(endpoint, {
      params: {
        ...params,
        page,
      },
    });

    if (Array.isArray(response.data)) {
      items.push(...response.data);
    }
  }

  return items;
}

async function getProducts(
  woo: Awaited<ReturnType<typeof getWooClient>>,
  params: {
    category?: string;
    stock?: "instock" | "outofstock" | "onbackorder";
    ptype?: "simple" | "variable" | "grouped" | "";
  }
): Promise<Product[]> {
  const query: Record<string, string | number | boolean> = {
    per_page: 100,
    orderby: "date",
    order: "desc",
    status: "any",
  };

  if (params.category) query.category = params.category;
  if (params.stock) query.stock_status = params.stock;
  if (params.ptype) query.type = params.ptype;

  return getAllWooPages<Product>(
    woo,
    "/products",
    query
  );
}

async function getCategories(
  woo: Awaited<ReturnType<typeof getWooClient>>
): Promise<Category[]> {
  return getAllWooPages<Category>(
    woo,
    "/products/categories",
    {
      per_page: 100,
      hide_empty: false,
      orderby: "name",
      order: "asc",
    }
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    stock?: "instock" | "outofstock" | "onbackorder";
    ptype?: "simple" | "variable" | "grouped";
    created?: string;
    createdName?: string;
  }>;
}) {
  const sp = await searchParams;

  const category = sp.category || "";
  const stock = sp.stock || undefined;
  const ptype = sp.ptype || "";

  const woo = await getWooClient();

  const [products, categories] = await Promise.all([
    getProducts(woo, { category, stock, ptype }),
    getCategories(woo),
  ]);

  const showCreatedNotice =
    sp.created === "1";

  const createdName =
    typeof sp.createdName === "string"
      ? sp.createdName.slice(0, 200)
      : "";

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-3 py-3 md:px-4 md:py-5">
      {showCreatedNotice && (
        <ProductCreatedNotice
          productName={createdName}
        />
      )}
      <div className="rounded-[26px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            Products
          </h1>

          <Link
            href="/products/new"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff7ac3] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 sm:w-auto md:px-5"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </Link>
        </div>
      </div>

      <section className="mt-4 min-w-0 space-y-4 md:space-y-5">
        <ProductsFilters
          categories={categories}
          initialCategory={category}
          initialStock={stock || ""}
          initialType={ptype || ""}
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