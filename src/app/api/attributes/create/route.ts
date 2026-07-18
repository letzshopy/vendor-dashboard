import { getWooClient } from "@/lib/woo";
import {
  attributePayload,
  attributeSummary,
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

async function listAttributes(woo: Awaited<ReturnType<typeof getWooClient>>) {
  const response = await woo.get("/products/attributes", {
    params: {
      per_page: 100,
      orderby: "name",
      order: "asc",
    },
  });
  return summaries(response.data, attributeSummary);
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const woo = await getWooClient();

    if (body.preset === "color-size") {
      const existing = await listAttributes(woo);
      const existingNames = new Set(existing.map((item) => item.name.toLowerCase()));
      const created = [];

      for (const name of ["Color", "Size"]) {
        if (existingNames.has(name.toLowerCase())) continue;
        const response = await woo.post(
          "/products/attributes",
          attributePayload({ name, slug: name.toLowerCase(), type: "select" }),
        );
        const summary = attributeSummary(response.data);
        if (summary) created.push(summary);
      }

      return privateJson({ ok: true, created });
    }

    const response = await woo.post(
      "/products/attributes",
      attributePayload(body),
    );
    const attribute = attributeSummary(response.data);
    if (!attribute) throw new Error("Invalid attribute response");

    return privateJson({ ok: true, attribute });
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to create attribute");
  }
}
