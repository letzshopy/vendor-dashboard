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
      delete: ids,
      force: true,
    });
    const deleted = isRecord(response.data) && Array.isArray(response.data.delete)
      ? response.data.delete.map(productSummary).filter((item) => item !== null)
      : [];

    return privateJson({
      ok: true,
      requestedCount: ids.length,
      deletedCount: deleted.length,
      deleted,
    });
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk permanent product deletion failed");
  }
}
