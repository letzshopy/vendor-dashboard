// src/app/api/orders/[id]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import { WCOrder } from "@/lib/order-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const { data } = await woo.get<WCOrder>(`/orders/${id}`);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to load order" }, { status: 500 });
  }
}
