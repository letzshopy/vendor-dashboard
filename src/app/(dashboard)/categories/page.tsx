import {
  FolderTree,
} from "lucide-react";

import {
  PageHeader,
} from "@/components/ui/page-header";
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
  image?: {
    id: number;
    src: string;
  } | null;
};

export const dynamic =
  "force-dynamic";

async function fetchCategories(): Promise<
  Cat[]
> {
  try {
    const woo =
      await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 25;

    const all: Cat[] = [];
    let page = 1;

    while (
      page <= MAX_PAGES
    ) {
      const { data } =
        await woo.get<Cat[]>(
          "/products/categories",
          {
            params: {
              per_page:
                PER_PAGE,
              page,
              hide_empty:
                false,
              orderby: "name",
              order: "asc",
              _fields:
                "id,name,slug,parent,description,count,image",
            },
          }
        );

      const rows =
        Array.isArray(data)
          ? data
          : [];

      if (
        rows.length === 0
      ) {
        break;
      }

      all.push(...rows);

      if (
        rows.length <
        PER_PAGE
      ) {
        break;
      }

      page += 1;
    }

    return all;
  } catch {
    return [];
  }
}

export default async function CategoriesPage() {
  const categories =
    await fetchCategories();

  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Catalog"
          icon={FolderTree}
          title="Categories"
          description="Organise products into simple parent and child categories."
          actions={
            <div className="text-right">
              <div className="text-2xl font-extrabold tracking-tight text-heading">
                {
                  categories.length
                }
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Categories
              </div>
            </div>
          }
        />
      </div>

      <div className="md:mt-5">
        <CategoriesClient
          initial={categories}
        />
      </div>

      <div className="mt-5">
        <SeoCategoriesSelector
          categories={
            categories
          }
        />
      </div>
    </main>
  );
}
