export type Cat = { id: number; name: string; slug: string; parent: number };

export async function fetchCategories(): Promise<Cat[]> {
  const r = await fetch("/api/woo/categories", { cache: "no-store" });
  if (!r.ok) return [];
  const data = await r.json();
  if (!data?.ok) return [];
  return (data.items || []) as Cat[];
}
