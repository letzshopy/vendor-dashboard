// src/app/api/products/[id]/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    // Restoring from trash: set a non-trash status (draft is safe)
    const { data } = await woo.put(`/products/${productId}`, { status: "draft" });

    return NextResponse.json({ ok: true, restored: Number(data?.id || 0) });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Restore failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}