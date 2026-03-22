import Link from "next/link";
import { getWooClient } from "@/lib/woo";
import ProductsClientTable from "@/components/ProductsClientTable";
import ProductsFilters from "@/components/ProductsFilters";
import ProductsImportExportBar from "./ui/ProductsImportExportBar";
import {
  Boxes,
  PackagePlus,
  ShoppingBag,
  Sparkles,
  Tags,
} from "lucide-react";

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

function countByType(products: Product[]) {
  let simple = 0;
  let variable = 0;
  let grouped = 0;

  for (const p of products) {
    if (p.type === "simple") simple += 1;
    else if (p.type === "variable") variable += 1;
    else if (p.type === "grouped") grouped += 1;
  }

  return { simple, variable, grouped };
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

  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stock_status === "instock").length;
  const outOfStockCount = products.filter(
    (p) => p.stock_status === "outofstock"
  ).length;
  const typeCounts = countByType(products);

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
      <section className="rounded-[28px] border border-white/70 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-sm shadow-slate-200/60 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#efe8ff] px-3 py-1 text-[11px] font-medium text-[#7a4cf0]">
              <Sparkles className="h-3.5 w-3.5" />
              Catalog manager
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Products
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-[15px]">
              Manage your catalog, stock, pricing and product actions in one clean
              workspace built for fast mobile use.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <Link
              href="/products/new"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff79c7] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              <PackagePlus className="h-4 w-4" />
              Add product
            </Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <TopMetricCard
            icon={Boxes}
            label="Total products"
            value={String(totalProducts)}
            tone="violet"
          />
          <TopMetricCard
            icon={ShoppingBag}
            label="In stock"
            value={String(inStockCount)}
            tone="emerald"
          />
          <TopMetricCard
            icon={ShoppingBag}
            label="Out of stock"
            value={String(outOfStockCount)}
            tone="rose"
          />
          <TopMetricCard
            icon={Tags}
            label="Variable products"
            value={String(typeCounts.variable)}
            tone="sky"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <QuickPill label="Simple" value={typeCounts.simple} />
          <QuickPill label="Variable" value={typeCounts.variable} />
          <QuickPill label="Grouped" value={typeCounts.grouped} />
          {category ? <ActivePill label={`Category filter active`} /> : null}
          {stock ? <ActivePill label={`Stock filter active`} /> : null}
          {ptype ? <ActivePill label={`Type filter active`} /> : null}
        </div>
      </section>

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

function TopMetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "violet" | "emerald" | "rose" | "sky";
}) {
  const toneMap = {
    violet: {
      wrap: "bg-[#f3eeff] text-[#7a4cf0]",
      card: "bg-white",
    },
    emerald: {
      wrap: "bg-emerald-50 text-emerald-600",
      card: "bg-white",
    },
    rose: {
      wrap: "bg-rose-50 text-rose-600",
      card: "bg-white",
    },
    sky: {
      wrap: "bg-sky-50 text-sky-600",
      card: "bg-white",
    },
  } as const;

  const t = toneMap[tone];

  return (
    <div className={`rounded-2xl border border-slate-200/70 ${t.card} p-3 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium text-slate-500">{label}</div>
          <div className="mt-2 text-xl font-semibold tracking-tight text-slate-900">
            {value}
          </div>
        </div>

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-2xl ${t.wrap}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}

function QuickPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
      <span>{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
        {value}
      </span>
    </span>
  );
}

function ActivePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
      {label}
    </span>
  );
}