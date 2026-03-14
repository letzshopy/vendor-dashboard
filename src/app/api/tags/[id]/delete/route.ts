// src/app/api/tags/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// Match Next 15 route validator: params is a Promise<{ id: string }>
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const tagId = Number(id);

    if (!tagId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { data } = await woo.delete(`/products/tags/${tagId}`, {
      params: { force: true },
    });

    return NextResponse.json({
      ok: true,
      deleted: Number(data?.id || tagId),
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Delete failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}