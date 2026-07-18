import { getWooClient } from "@/lib/woo";
import { privateJson } from "@/lib/productPolicy";
import {
  orderSearchResult,
  productSearchResult,
  records,
  searchErrorResponse,
  searchQuery,
  searchScope,
  type SearchResult,
} from "@/lib/searchPolicy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function summarized(
  value: unknown,
  summarize: (item: unknown) => SearchResult | null,
): SearchResult[] {
  return records(value).flatMap((item) => {
    const result = summarize(item);
    return result ? [result] : [];
  }).slice(0, 5);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = searchQuery(url.searchParams.get("q"));
    const scope = searchScope(url.searchParams.get("scope"));

    if (query.length < 2) return privateJson({ items: [] });
    const woo = await getWooClient();

    if (scope === "products") {
      const response = await woo.get("/products", {
        params: {
          search: query,
          per_page: 5,
          status: "any",
          orderby: "date",
          order: "desc",
          _fields: "id,name,sku",
        },
      });
      return privateJson({ items: summarized(response.data, productSearchResult) });
    }

    if (scope === "orders") {
      let response;
      try {
        response = await woo.get("/orders", {
          params: {
            search: query,
            per_page: 5,
            orderby: "date",
            order: "desc",
            _fields: "id,number,billing,total",
          },
        });
      } catch (error: unknown) {
        if (!/^\d{1,10}$/.test(query)) throw error;
        response = await woo.get("/orders", {
          params: {
            include: [Number(query)],
            per_page: 5,
            _fields: "id,number,billing,total",
          },
        });
      }

      let items = summarized(response.data, orderSearchResult);
      if (!items.length && /^\d{1,10}$/.test(query)) {
        const fallback = await woo.get("/orders", {
          params: {
            include: [Number(query)],
            per_page: 5,
            _fields: "id,number,billing,total",
          },
        });
        items = summarized(fallback.data, orderSearchResult);
      }
      return privateJson({ items });
    }

    return privateJson({ items: [] });
  } catch (error: unknown) {
    return searchErrorResponse(error);
  }
}
