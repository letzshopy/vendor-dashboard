// src/app/api/products/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Permanently delete a product (bypass trash): force=true
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data } = await woo.delete(`/products/${id}`, {
      params: { force: true },
    });

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    const msg =
      e?.response?.data ||
      e?.response?.data?.message ||
      e?.message ||
      "Permanent delete failed";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
