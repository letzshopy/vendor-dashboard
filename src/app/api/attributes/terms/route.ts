import { getWooClient } from "@/lib/woo";
import {
  attributeId,
  attributeSummary,
  attributeTermPayload,
  attributeTermSummary,
  summaries,
} from "@/lib/attributePolicy";
import {
  privateJson,
  readJsonObject,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const woo = await getWooClient();
    const rawId = new URL(request.url).searchParams.get("id");

    if (rawId !== null) {
      const id = attributeId(rawId);
      const response = await woo.get(`/products/attributes/${id}/terms`, {
        params: {
          per_page: 100,
          hide_empty: false,
          orderby: "name",
          order: "asc",
        },
      });
      return privateJson({ terms: summaries(response.data, attributeTermSummary) });
    }

    const response = await woo.get("/products/attributes", {
      params: { per_page: 100, orderby: "name", order: "asc" },
    });
    return privateJson({ attributes: summaries(response.data, attributeSummary) });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load attributes");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const id = attributeId(body.id);
    const woo = await getWooClient();
    const response = await woo.post(
      `/products/attributes/${id}/terms`,
      attributeTermPayload(body),
    );
    const term = attributeTermSummary(response.data);
    if (!term) throw new Error("Invalid attribute term response");

    return privateJson({ ok: true, term });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to save attribute term");
  }
}
