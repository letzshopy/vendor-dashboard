// src/app/api/products/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT: full/partial update
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const { data } = await woo.put(`/products/${id}`, body);
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data ||
          e?.response?.data?.message ||
          e?.message ||
          "Update failed",
      },
      { status: 500 }
    );
  }
}
