// src/app/api/products/variations/bulk/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const variations: any[] = Array.isArray(body?.variations) ? body.variations : [];

    if (variations.length === 0) {
      return NextResponse.json(
        { error: "No variations provided" },
        { status: 400 }
      );
    }

    const normalize = (v: any) => {
      const payload: any = {};

      if (v?.sku) payload.sku = String(v.sku).trim();
      if (v?.regular_price !== undefined && v?.regular_price !== null && v?.regular_price !== "") {
        payload.regular_price = String(v.regular_price);
      }
      if (v?.sale_price !== undefined && v?.sale_price !== null && v?.sale_price !== "") {
        payload.sale_price = String(v.sale_price);
      }

      payload.manage_stock = !!v?.manage_stock;
      if (v?.manage_stock) {
        const q = Number(v?.stock_quantity);
        payload.stock_quantity = Number.isFinite(q) ? q : 0;
      }

      payload.backorders = v?.backorders || "no";

      if (Array.isArray(v?.attributes)) {
        payload.attributes = v.attributes
          .map((a: any) => ({
            ...(a?.id ? { id: Number(a.id) } : {}),
            ...(a?.name ? { name: String(a.name) } : {}),
            option: String(a?.option ?? ""),
          }))
          .filter((a: any) => a.option !== "" || a.id || a.name);
      }

      return payload;
    };

    // Chunk creates into 50s
    const chunkSize = 50;
    const created: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < variations.length; i += chunkSize) {
      const chunk = variations.slice(i, i + chunkSize);
      const create = chunk.map(normalize);

      try {
        const { data } = await woo.post(
          `/products/${productId}/variations/batch`,
          { create }
        );

        if (Array.isArray(data?.create)) created.push(...data.create);
      } catch (e: any) {
        errors.push({
          indexFrom: i,
          count: chunk.length,
          error:
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Batch create failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      createdCount: created.length,
      created,
      errors,
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";

    return NextResponse.json(
      { error: String(msg) },
      { status: e?.response?.status || 500 }
    );
  }
}