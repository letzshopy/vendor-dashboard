// src/app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();
    const { id } = await context.params;

    const { data } = await woo.get(`/products/${id}`);

    return NextResponse.json({
      // --- Core fields (used in edit + view) ---
      id: data.id,
      name: data.name,
      regular_price: data.regular_price,
      sku: data.sku,
      stock_quantity: data.stock_quantity,
      description: data.description,
      status: data.status,

      // shipping class for prefilling the select
      shipping_class_id: data.shipping_class_id ?? null,
      shipping_class: data.shipping_class ?? null, // slug

      // EDIT FORM: keep this as string[] (so your ProductImages component still works)
      images: (data.images || []).map((img: any) => img.src),

      // VIEW PAGE: full image objects (id + src + name)
      image_objects: (data.images || []).map((img: any) => ({
        id: img.id,
        src: img.src,
        name: img.name,
      })),

      // Categories / tags
      categories: (data.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        parent: c.parent,
      })),
      tags: (data.tags || []).map((t: any) => ({ id: t.id, name: t.name })),

      category_ids: (data.categories || []).map((c: any) => c.id),
      tag_ids: (data.tags || []).map((t: any) => t.id),

      // --- Extra fields for the nice view page ---
      type: data.type,
      permalink: data.permalink,
      price: data.price,
      sale_price: data.sale_price,
      stock_status: data.stock_status,
      manage_stock: data.manage_stock,
      catalog_visibility: data.catalog_visibility,

      short_description: data.short_description,
      weight: data.weight,
      dimensions: data.dimensions, // { length, width, height }

      date_created: data.date_created,
      date_modified: data.date_modified,
    });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Failed to load product";
    return NextResponse.json({ error: msg }, { status });
  }
}
