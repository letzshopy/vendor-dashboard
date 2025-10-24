// src/app/api/products/[id]/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    const { data } = await woo.get(`/products/${ctx.params.id}`);

    // Keep only essentials we use on the form
    return NextResponse.json({
      id: data.id,
      name: data.name,
      regular_price: data.regular_price,
      sku: data.sku,
      stock_quantity: data.stock_quantity,
      description: data.description,
      status: data.status,

      images: (data.images || []).map((img: any) => img.src),

      categories: (data.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        parent: c.parent,
      })),
      tags: (data.tags || []).map((t: any) => ({ id: t.id, name: t.name })),

      category_ids: (data.categories || []).map((c: any) => c.id),
      tag_ids: (data.tags || []).map((t: any) => t.id),
    });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Failed to load product";
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(req: Request, ctx: { params: { id: string } }) {
  try {
    const body = await req.json();

    // Only pass through fields we allow to edit from the detail form
    const payload: any = {
      name: body.name,
      sku: body.sku,
      regular_price: body.regular_price,
      stock_quantity: body.stock_quantity,
      description: body.description,
      status: body.status, // "publish" | "draft"
    };

    const { data } = await woo.put(`/products/${ctx.params.id}`, payload);

    // Return in the same normalized shape as GET so the client can reset "dirty"
    return NextResponse.json({
      id: data.id,
      name: data.name,
      regular_price: data.regular_price,
      sku: data.sku,
      stock_quantity: data.stock_quantity,
      description: data.description,
      status: data.status,
      images: (data.images || []).map((img: any) => img.src),
      categories: (data.categories || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        parent: c.parent,
      })),
      tags: (data.tags || []).map((t: any) => ({ id: t.id, name: t.name })),
      category_ids: (data.categories || []).map((c: any) => c.id),
      tag_ids: (data.tags || []).map((t: any) => t.id),
    });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Failed to update product";
    return NextResponse.json({ error: msg }, { status });
  }
}
