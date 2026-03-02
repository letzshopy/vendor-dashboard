// src/app/api/products/[id]/stock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const patch: any = {};

    if ("manage_stock" in body) patch.manage_stock = !!body.manage_stock;
    if ("stock_quantity" in body)
      patch.stock_quantity = body.stock_quantity ?? null;
    if ("stock_status" in body) patch.stock_status = body.stock_status;

    const { data } = await woo.put(`/products/${id}`, patch);
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Update failed",
      },
      { status: 400 }
    );
  }
}
