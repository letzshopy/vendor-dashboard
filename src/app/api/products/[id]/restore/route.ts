// src/app/api/products/[id]/restore/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Restoring from trash: set a non-trash status (draft is safe)
    const { data } = await woo.put(`/products/${id}`, { status: "draft" });
    return NextResponse.json({ restored: data?.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data?.message || "Restore failed" },
      { status: e?.response?.status || 500 }
    );
  }
}
