// src/app/(dashboard)/categories/page.tsx
import { getWooClient } from "@/lib/woo";
import CategoriesClient from "./ui/CategoriesClient";

type Cat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
};

export const dynamic = "force-dynamic";

async function fetchCategories(): Promise<Cat[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 25; // safety cap (2500 categories)

    const all: Cat[] = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      const { data } = await woo.get<Cat[]>("/products/categories", {
        params: {
          per_page: PER_PAGE,
          page,
          hide_empty: false,
          orderby: "name",
          order: "asc",
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    return all;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories = await fetchCategories();

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-slate-900">
          Product Categories
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create and manage product categories. Use{" "}
          <span className="font-medium">Parent</span> to build nested menus for
          your store.
        </p>
      </header>

      <CategoriesClient initial={categories} />
    </main>
  );
}