import { woo } from "@/lib/woo";
import TagsClient from "./ui/TagsClient";

type Tag = { id: number; name: string; slug: string; description?: string; count?: number };

export const dynamic = "force-dynamic";

async function fetchTags(): Promise<Tag[]> {
  const { data } = await woo.get<Tag[]>("/products/tags", {
    params: { per_page: 100, orderby: "name", order: "asc", hide_empty: false },
  });
  return data || [];
}

export default async function TagsPage() {
  const tags = await fetchTags();
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Product Tags</h1>
        <p className="text-sm text-slate-600">Create and manage tags used to group products.</p>
      </div>
      <TagsClient initial={tags} />
    </main>
  );
}
