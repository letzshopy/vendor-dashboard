import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  parseProductIds,
  privateJson,
  productErrorResponse,
  productSummary,
  readJsonObject,
} from "@/lib/productPolicy";

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseProductIds(body.ids);
    const woo = await getWooClient();
    const response = await woo.post("/products/batch", {
      update: ids.map((id) => ({ id, status: "draft" })),
    });
    const restored = isRecord(response.data) && Array.isArray(response.data.update)
      ? response.data.update.map(productSummary).filter((item) => item !== null)
      : [];

    return privateJson({
      ok: true,
      requestedCount: ids.length,
      updatedCount: restored.length,
      restored,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk product restore failed");
  }
}
