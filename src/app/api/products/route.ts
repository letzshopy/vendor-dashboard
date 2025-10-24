// src/app/api/products/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const payload: any = {
      name: body.name,
      sku: body.sku,
      status: body.status,
      catalog_visibility: body.catalog_visibility,
      type: body.type,
      short_description: body.short_description,
      description: body.description,
      regular_price: body.regular_price,
      sale_price: body.sale_price,
      date_on_sale_from: body.date_on_sale_from,
      date_on_sale_to: body.date_on_sale_to,
      manage_stock: body.manage_stock,
      stock_quantity: body.stock_quantity,
      backorders: body.backorders,
      tax_status: body.tax_status,
      tax_class: body.tax_class || "",
      // keep weight/dimensions (product attributes), but no shipping_class
      weight: body.weight,
      dimensions: body.dimensions,
      images: body.images,
      categories: (body.categories || []).map((id: number) => ({ id })),
      tags: (body.tags || []).map((name: string) => ({ name })),
      attributes: body.attributes,
      grouped_products: body.grouped_products,
    };

    // Removed: shipping_class assignment (until new shipping module lands)
    // if (body.shipping_class !== undefined) {
    //   payload.shipping_class = body.shipping_class || "";
    // }

    const { data } = await woo.post(`/products`, payload);
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Failed to create product";
    return NextResponse.json({ error: msg }, { status });
  }
}
