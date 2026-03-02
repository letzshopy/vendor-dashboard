// src/app/api/orders/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);

  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Accept any combination: { status, line_items: [{id, product_id, variation_id, quantity}] }
  const body = await req.json().catch(() => ({}));

  try {
    const { data } = await woo.put(`/orders/${id}`, body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 500 }
    );
  }
}
