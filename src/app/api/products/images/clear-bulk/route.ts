import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  parseProductIds,
  privateJson,
  productErrorResponse,
  readJsonObject,
} from "@/lib/productPolicy";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseProductIds(body.ids);
    const woo = await getWooClient();
    const response = await woo.post("/products/batch", {
      update: ids.map((id) => ({ id, images: [] })),
    });
    const updates = isRecord(response.data) && Array.isArray(response.data.update)
      ? response.data.update
      : [];

    return privateJson({
      ok: true,
      requestedCount: ids.length,
      updatedCount: updates.length,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Failed to clear product images");
  }
}
