import { getWooClient } from "@/lib/woo";
import {
  categoryPayload,
  categorySummary,
  privateJson,
  readJsonObject,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const payload = categoryPayload(body);
    const name =
      typeof payload.name === "string"
        ? payload.name.trim()
        : "";

    const woo = await getWooClient();

    const existingResponse = await woo.get(
      "/products/categories",
      {
        params: {
          search: name,
          per_page: 100,
          hide_empty: false,
        },
      }
    );

    const existingItems =
      Array.isArray(existingResponse.data)
        ? existingResponse.data
        : [];

    for (const item of existingItems) {
      const existingCategory =
        categorySummary(item);

      const existingName =
        typeof existingCategory?.name === "string"
          ? existingCategory.name.trim()
          : "";

      if (
        existingCategory &&
        existingName.localeCompare(
          name,
          undefined,
          { sensitivity: "accent" }
        ) === 0
      ) {
        return privateJson({
          category: existingCategory,
          existing: true,
        });
      }
    }

    const response = await woo.post(
      "/products/categories",
      payload
    );

    const category =
      categorySummary(response.data);

    if (!category) {
      throw new Error(
        "WooCommerce returned an invalid category"
      );
    }

    return privateJson({
      category,
      existing: false,
    });
  } catch (error: unknown) {
    return taxonomyErrorResponse(
      error,
      "Category creation failed"
    );
  }
}
