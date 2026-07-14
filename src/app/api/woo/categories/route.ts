import { getWooClient } from "@/lib/woo";
import {
  categorySummary,
  privateJson,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function perPageValue(value: string | null): number {
  if (value === null || value === "") return 100;
  if (!/^\d{1,3}$/.test(value)) throw new TypeError("Invalid category page size");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError("Invalid category page size");
  }
  return Math.min(parsed, 100);
}

function searchValue(value: string | null): string {
  const search = String(value || "").trim();
  if (search.length > 100) throw new RangeError("Category search is too long");
  if (/[\x00-\x1F\x7F]/.test(search)) throw new TypeError("Invalid category search");
  return search;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const perPage = perPageValue(url.searchParams.get("per_page"));
    const search = searchValue(url.searchParams.get("search"));
    const simple = url.searchParams.get("simple") === "1";
    const woo = await getWooClient();
    const all: unknown[] = [];

    for (let page = 1; page <= 25; page += 1) {
      const response = await woo.get("/products/categories", {
        params: {
          per_page: perPage,
          page,
          ...(search ? { search } : {}),
          hide_empty: false,
          orderby: "name",
          order: "asc",
          _fields: "id,name,slug,parent",
        },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      if (!rows.length) break;
      all.push(...rows);
      if (rows.length < perPage) break;
    }

    const items = all.flatMap((item) => {
      const summary = categorySummary(item);
      return summary ? [{
        id: Number(summary.id),
        name: String(summary.name || ""),
        slug: String(summary.slug || ""),
        parent: Number(summary.parent || 0),
      }] : [];
    });

    if (simple) {
      return privateJson(items.map(({ id, name }) => ({ id, name })));
    }
    return privateJson({ ok: true, items });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load categories");
  }
}
