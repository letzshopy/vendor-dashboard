import { getWooClient } from "@/lib/woo";
import {
  parseSeoIds,
  privateJson,
  readJsonObject,
  seoResponse,
  taxonomyErrorResponse,
} from "@/lib/taxonomyPolicy";

export async function GET() {
  try {
    const woo = await getWooClient();
    const response = await woo.get("/letzshopy/seo-categories");
    return privateJson(seoResponse(response.data));
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to load SEO categories");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request);
    const ids = parseSeoIds(body.ids);
    const woo = await getWooClient();
    const response = await woo.post("/letzshopy/seo-categories", { ids });
    return privateJson(seoResponse(response.data, ids));
  } catch (error: unknown) {
    return taxonomyErrorResponse(error, "Unable to save SEO categories");
  }
}
