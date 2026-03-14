// src/app/api/products/[id]/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const patch: any = {};

    if ("manage_stock" in body) {
      patch.manage_stock = !!body.manage_stock;
    }

    if ("stock_quantity" in body) {
      patch.stock_quantity =
        body.stock_quantity === null || body.stock_quantity === undefined
          ? null
          : Number(body.stock_quantity);
    }

    if ("stock_status" in body) {
      patch.stock_status = body.stock_status;
    }

    // Nothing to update
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid stock fields provided" },
        { status: 400 }
      );
    }

    const { data } = await woo.put(`/products/${productId}`, patch);

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Stock update failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}