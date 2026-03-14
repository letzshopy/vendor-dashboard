// src/app/api/products/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Permanently delete a product (bypass trash): force=true
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { data } = await woo.delete(`/products/${productId}`, {
      params: { force: true },
    });

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Permanent delete failed";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}