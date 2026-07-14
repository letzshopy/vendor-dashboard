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
    const woo = await getWooClient();
    const response = await woo.post("/products/categories", payload);
    const category = categorySummary(response.data);

    if (!category) throw new Error("WooCommerce returned an invalid category");

    return privateJson({ category });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Category creation failed");
  }
}
