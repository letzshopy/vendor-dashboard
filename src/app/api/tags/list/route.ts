import type { AxiosInstance } from "axios";

import { getWooClient } from "@/lib/woo";
import {
  privateJson,
  tagSummary,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

async function getTags(woo: AxiosInstance): Promise<unknown[]> {
  const tags: unknown[] = [];

  for (let page = 1; page <= 20; page += 1) {
    const response = await woo.get("/products/tags", {
      params: {
        per_page: 100,
        page,
        orderby: "name",
        order: "asc",
        hide_empty: false,
        _fields: "id,name,slug,description,count",
      },
    });

    if (!Array.isArray(response.data) || response.data.length === 0) break;
    tags.push(...response.data);
    if (response.data.length < 100) break;
  }

  return tags;
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const tags = (await getTags(woo))
      .map(tagSummary)
      .filter((item) => item !== null);

    return privateJson({ tags });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load tags");
  }
}
