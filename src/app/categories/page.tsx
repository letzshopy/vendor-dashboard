import { woo } from "@/lib/woo";
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
  const { data } = await woo.get<Cat[]>("/products/categories", {
    params: { per_page: 100, hide_empty: false, orderby: "name", order: "asc" },
  });
  return data || [];
}

export default async function CategoriesPage() {
  const categories = await fetchCategories();
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Product Categories</h1>
        <p className="text-sm text-slate-600">
          Create and manage product categories. Use “Parent” to make nested categories.
        </p>
      </div>
      <CategoriesClient initial={categories} />
    </main>
  );
}
