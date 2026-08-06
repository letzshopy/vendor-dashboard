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
  regular_price?: string;
  dashboard_price?: string;
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

type VariationPrice = {
  regular_price?: string;
  price?: string;
};

function parseWooPrice(value: unknown): number | null {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return null;
  }

  const amount = Number(normalized);

  return Number.isFinite(amount) && amount >= 0
    ? amount
    : null;
}

function formatWooPrice(amount: number): string {
  return Number.isInteger(amount)
    ? String(amount)
    : amount.toFixed(2).replace(/\.?0+$/, "");
}

function getProductBasePrice(product: Product): string {
  return (
    product.regular_price?.trim() ||
    product.price?.trim() ||
    ""
  );
}

async function getVariableBasePrice(
  woo: Awaited<ReturnType<typeof getWooClient>>,
  product: Product
): Promise<string> {
  try {
    const variations = await getAllWooPages<VariationPrice>(
      woo,
      `/products/${product.id}/variations`,
      {
        per_page: 100,
        status: "any",
      }
    );

    const prices = variations
      .map((variation) =>
        parseWooPrice(
          variation.regular_price ||
            variation.price
        )
      )
      .filter(
        (price): price is number =>
          price !== null
      );

    if (prices.length === 0) {
      return getProductBasePrice(product);
    }

    const minimum = Math.min(...prices);
    const maximum = Math.max(...prices);

    return minimum === maximum
      ? formatWooPrice(minimum)
      : `${formatWooPrice(minimum)}-${formatWooPrice(maximum)}`;
  } catch {
    return getProductBasePrice(product);
  }
}

async function enrichProductBasePrices(
  woo: Awaited<ReturnType<typeof getWooClient>>,
  products: Product[]
): Promise<Product[]> {
  const enriched = products.map((product) => ({
    ...product,
    dashboard_price: getProductBasePrice(product),
  }));

  const variableIndexes = enriched
    .map((product, index) =>
      product.type === "variable"
        ? index
        : -1
    )
    .filter((index) => index >= 0);

  let cursor = 0;

  async function worker() {
    while (cursor < variableIndexes.length) {
      const queueIndex = cursor;
      cursor += 1;

      const productIndex =
        variableIndexes[queueIndex];

      const product = enriched[productIndex];

      enriched[productIndex] = {
        ...product,
        dashboard_price:
          await getVariableBasePrice(
            woo,
            product
          ),
      };
    }
  }

  const workerCount = Math.min(
    4,
    variableIndexes.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );

  return enriched;
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

  const [rawProducts, categories] = await Promise.all([
    getProducts(woo, { category, stock, ptype }),
    getCategories(woo),
  ]);

  const products = await enrichProductBasePrices(
    woo,
    rawProducts
  );

  const showCreatedNotice =
    sp.created === "1";

  const createdName =
    typeof sp.createdName === "string"
      ? sp.createdName.slice(0, 200)
      : "";

  return (
    <main className="dashboard-mobile-page dashboard-products-page mx-auto w-full min-w-0 max-w-[1540px] overflow-x-hidden pb-28 pt-1 md:pb-8 md:pt-1">
      {showCreatedNotice && (
        <ProductCreatedNotice
          productName={createdName}
        />
      )}
      <header className="hidden items-end justify-between gap-6 pb-2 md:flex">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5366B7]">
            Catalog
          </div>

          <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-[#26335F]">
            Products
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">
            Search, update and manage products in your store.
          </p>
        </div>

        <Link
          href="/products/add"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#E85D4A] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(232,93,74,0.2)] transition active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
      </header>
      <section className="mt-1 min-w-0 overflow-hidden border-y border-[#E2E7F1] bg-white md:mt-1 md:rounded-2xl md:border md:shadow-[0_10px_30px_rgba(38,51,95,0.05)]">
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