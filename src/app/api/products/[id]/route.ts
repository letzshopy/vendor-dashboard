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
      // Core
      id: data.id,
      name: data.name,
      sku: data.sku,
      type: data.type,
      status: data.status,
      permalink: data.permalink,

      // Pricing / stock
      price: data.price,
      regular_price: data.regular_price,
      sale_price: data.sale_price,
      stock_status: data.stock_status,
      stock_quantity: data.stock_quantity,
      manage_stock: data.manage_stock,
      catalog_visibility: data.catalog_visibility,

      // Descriptions
      description: data.description,
      short_description: data.short_description,

      // Shipping
      weight: data.weight,
      dimensions: data.dimensions || null,
      shipping_class_id: data.shipping_class_id ?? null,
      shipping_class: data.shipping_class ?? null,

      // Images
      images: (data.images || []).map((img: any) => img.src),
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
      tags: (data.tags || []).map((t: any) => ({
        id: t.id,
        name: t.name,
      })),
      category_ids: (data.categories || []).map((c: any) => c.id),
      tag_ids: (data.tags || []).map((t: any) => t.id),

      // Attributes
      attributes: (data.attributes || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        position: a.position,
        visible: a.visible,
        variation: a.variation,
        options: a.options || [],
      })),

      // Grouped products
      grouped_products: Array.isArray(data.grouped_products)
        ? data.grouped_products
        : [],

      // Dates
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