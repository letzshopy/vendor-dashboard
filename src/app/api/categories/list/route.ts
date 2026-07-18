import type { AxiosInstance } from "axios";

import { getWooClient } from "@/lib/woo";
import {
  categorySummary,
  privateJson,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

async function getCategories(woo: AxiosInstance): Promise<unknown[]> {
  const categories: unknown[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await woo.get("/products/categories", {
      params: {
        per_page: 100,
        page,
        hide_empty: false,
        orderby: "name",
        order: "asc",
        _fields: "id,name,slug,parent,description,count,image",
      },
    });

    if (!Array.isArray(response.data) || response.data.length === 0) break;
    categories.push(...response.data);
    if (response.data.length < 100) break;
  }

  return categories;
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const categories = (await getCategories(woo))
      .map(categorySummary)
      .filter((item) => item !== null);

    return privateJson({ categories });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load categories");
  }
}
