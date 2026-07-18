import type { AxiosInstance } from "axios";

import { getWooClient } from "@/lib/woo";
import {
  privateJson,
  productErrorResponse,
} from "@/lib/productPolicy";
import { trashedProductSummary } from "@/lib/productReadPolicy";

async function getAllTrashedProducts(woo: AxiosInstance): Promise<unknown[]> {
  const products: unknown[] = [];

  for (let page = 1; page <= 25; page += 1) {
    const response = await woo.get("/products", {
      params: {
        status: "trash",
        per_page: 100,
        page,
        orderby: "date",
        order: "desc",
        _fields: "id,name,sku,date_created,date_modified",
      },
    });

    if (!Array.isArray(response.data) || response.data.length === 0) break;
    products.push(...response.data);
    if (response.data.length < 100) break;
  }

  return products;
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const products = await getAllTrashedProducts(woo);
    const items = products
      .map(trashedProductSummary)
      .filter((item) => item !== null);

    return privateJson({ items });
  } catch (error: unknown) {
    return productErrorResponse(error, "Failed to load product trash");
  }
}
