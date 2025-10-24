import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const body = await req.json();
    const payload: Record<string, any> = {};

    const copy = (key: string, mapTo?: string) => {
      const k = mapTo || key;
      if (body[key] !== undefined) payload[k] = body[key];
    };

    // Basics
    copy("type");
    copy("name");
    copy("sku");
    copy("status");
    copy("catalog_visibility");
    copy("short_description");
    copy("description");

    // Pricing
    if ("regular_price" in body) {
      payload.regular_price =
        body.regular_price === "" || body.regular_price === null
          ? null
          : String(body.regular_price);
    }

    // IMPORTANT: make blank mean "clear sale"
    if ("sale_price" in body) {
      const blank =
        body.sale_price === "" || body.sale_price === null || body.sale_price === undefined;
      payload.sale_price = blank ? null : String(body.sale_price);

      // If sale is cleared, clear schedule too
      if (blank) {
        payload.date_on_sale_from = null;
        payload.date_on_sale_to = null;
      }
    }

    // Allow scheduling when provided
    if ("date_on_sale_from" in body) {
      payload.date_on_sale_from =
        body.date_on_sale_from === "" || body.date_on_sale_from === null
          ? null
          : body.date_on_sale_from;
    }
    if ("date_on_sale_to" in body) {
      payload.date_on_sale_to =
        body.date_on_sale_to === "" || body.date_on_sale_to === null
          ? null
          : body.date_on_sale_to;
    }

    // Inventory
    if ("manage_stock" in body) payload.manage_stock = !!body.manage_stock;
    if ("stock_quantity" in body) {
      payload.stock_quantity =
        body.stock_quantity === "" || body.stock_quantity === null
          ? null
          : Number(body.stock_quantity);
    }
    copy("backorders");

    // Tax / Shipping
    copy("tax_status");
    copy("tax_class");
    if ("weight" in body) payload.weight = body.weight ?? "";
    if ("dimensions" in body) payload.dimensions = body.dimensions;

    // Media & taxonomy
    if ("images" in body) payload.images = body.images;
    if ("categories" in body) payload.categories = body.categories;
    if ("tags" in body) payload.tags = body.tags;

    // Variable / grouped
    if ("attributes" in body) payload.attributes = body.attributes;
    if ("grouped_products" in body) payload.grouped_products = body.grouped_products;

    const { data } = await woo.put(`/products/${ctx.params.id}`, payload);
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Update failed";
    return NextResponse.json({ error: msg }, { status });
  }
}
