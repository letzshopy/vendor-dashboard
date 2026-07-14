import { FolderTree, Plus } from "lucide-react";
import { getWooClient } from "@/lib/woo";
import CategoriesClient from "./ui/CategoriesClient";
import SeoCategoriesSelector from "./ui/SeoCategoriesSelector";

type Cat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
  image?: { id: number; src: string } | null;
};

export const dynamic = "force-dynamic";

async function fetchCategories(): Promise<Cat[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 25;

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
          _fields: "id,name,slug,parent,description,count,image",
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
    <main className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      <div className="rounded-[30px] border border-white/80 bg-gradient-to-br from-white via-[#faf6ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-700">
          <FolderTree className="h-3.5 w-3.5" />
          Catalog
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
            Categories
          </h1>

          <div className="inline-flex items-center gap-2 rounded-2xl bg-white/85 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
            <Plus className="h-4 w-4 text-violet-600" />
            Manage
          </div>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create and organise product categories. Build nested category structure
          using parent categories.
        </p>
      </div>

      <section className="mt-4">
        <SeoCategoriesSelector categories={categories} />
      </section>

      <section className="mt-4">
        <CategoriesClient initial={categories} />
      </section>
    </main>
  );
}
