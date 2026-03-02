// src/app/api/tags/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Match Next 15 route validator: params is a Promise<{ id: string }>
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data } = await woo.delete(`/products/tags/${id}`, {
      params: { force: true },
    });

    return NextResponse.json({
      ok: true,
      deleted: data?.id || id,
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Delete failed";

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
