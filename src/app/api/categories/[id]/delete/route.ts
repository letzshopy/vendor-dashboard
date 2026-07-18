import { getWooClient } from "@/lib/woo";
import {
  parseTermId,
  privateJson,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const categoryId = parseTermId(id, "Category");
    const woo = await getWooClient();
    await woo.delete(`/products/categories/${categoryId}`, {
      params: { force: true },
    });

    return privateJson({ ok: true, deleted: categoryId });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Category deletion failed");
  }
}
