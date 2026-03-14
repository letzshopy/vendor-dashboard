import { getWooClient } from "@/lib/woo";
import TagsClient from "./ui/TagsClient";

type Tag = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
};

export const dynamic = "force-dynamic";

async function fetchTags(): Promise<Tag[]> {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 20; // safety cap (2000 tags)
    const all: Tag[] = [];

    let page = 1;
    while (page <= MAX_PAGES) {
      const { data } = await woo.get<Tag[]>("/products/tags", {
        params: {
          per_page: PER_PAGE,
          page,
          orderby: "name",
          order: "asc",
          hide_empty: false,
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

export default async function TagsPage() {
  const tags = await fetchTags();

  return (
    <main className="mx-auto max-w-6xl px-6 py-6">
      {/* header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-rose-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Product Tags</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create and manage tags used to group products. Tags help customers
          discover related items across categories.
        </p>
      </div>

      <TagsClient initial={tags} />
    </main>
  );
}