import Link from "next/link";
import { Package2, Plus } from "lucide-react";
import { getWooClient } from "@/lib/woo";
import ProductsClientTable from "@/components/ProductsClientTable";
import ProductsFilters from "@/components/ProductsFilters";
import ProductsImportExportBar from "./ui/ProductsImportExportBar";
import ProductCreatedNotice from "@/components/ProductCreatedNotice";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

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
    <main className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8">
      {showCreatedNotice ? (
        <ProductCreatedNotice
          productName={createdName}
        />
      ) : null}

      <PageHeader
        className="hidden md:flex"
        eyebrow="Catalog"
        icon={Package2}
        title="Products"
        description="Search, filter and manage your store catalogue."
        actions={
          <Link
            href="/products/add"
            className={buttonClassName({
              variant: "primary",
            })}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        }
      />

      <section className="mt-0 min-w-0 overflow-hidden rounded-xl border border-border bg-card md:mt-5 md:rounded-2xl">
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

        <ProductsClientTable
          products={products}
          categories={categories}
        />
      </section>
    </main>
  );
}