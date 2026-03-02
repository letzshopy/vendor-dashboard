// src/app/api/tags/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Match Next 15 validator: params is a Promise<{ id: string }>
type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const { data } = await woo.put(`/products/tags/${id}`, body);
    return NextResponse.json({ tag: data });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.message ||
      "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
