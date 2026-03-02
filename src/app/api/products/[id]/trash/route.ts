// src/app/api/products/[id]/trash/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data } = await woo.delete(`/products/${id}`, {
      params: { force: false }, // move to trash, not permanent
    });

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data ||
          e?.response?.data?.message ||
          e?.message ||
          "Trash failed",
      },
      { status: 500 }
    );
  }
}
