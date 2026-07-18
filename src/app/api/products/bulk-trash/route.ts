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

    try {
      const response = await woo.post("/products/batch", {
        delete: ids,
        force: false,
      });
      const trashed = isRecord(response.data) && Array.isArray(response.data.delete)
        ? response.data.delete.map(productSummary).filter((item) => item !== null)
        : [];

      return privateJson({
        ok: true,
        mode: "batch",
        requestedCount: ids.length,
        trashedCount: trashed.length,
        trashed,
      });
    } catch {
      const trashed: number[] = [];
      const failed: number[] = [];

      for (const id of ids) {
        try {
          await woo.delete(`/products/${id}`, { params: { force: false } });
          trashed.push(id);
        } catch {
          failed.push(id);
        }
      }

      return privateJson({
        ok: failed.length === 0,
        mode: "individual",
        requestedCount: ids.length,
        trashedCount: trashed.length,
        trashed,
        failed,
      }, failed.length === ids.length ? 502 : 200);
    }
  } catch (error: unknown) {
    return productErrorResponse(error, "Bulk product trash failed");
  }
}
