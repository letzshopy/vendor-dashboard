import { getWooClient } from "@/lib/woo";
import {
  categorySummary,
  privateJson,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const woo = await getWooClient();
    const all: unknown[] = [];

    for (let page = 1; page <= 20; page += 1) {
      const response = await woo.get("/products/categories", {
        params: {
          per_page: 100,
          page,
          hide_empty: false,
          orderby: "name",
          order: "asc",
          _fields: "id,name,parent",
        },
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      if (!rows.length) break;
      all.push(...rows);
      if (rows.length < 100) break;
    }

    const items = all.flatMap((item) => {
      const summary = categorySummary(item);
      return summary ? [{
        id: Number(summary.id),
        name: String(summary.name || ""),
        parent: Number(summary.parent || 0),
      }] : [];
    });

    return privateJson({ items });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load categories");
  }
}
