// src/app/api/orders/[id]/refund/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Body options example:
// { amount: "120.00", reason: "Customer request", line_items: [{ id: lineItemId, quantity: 1, refund_total: "120.00" }] }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const orderId = Number(params.id);
  const body = await req.json().catch(() => ({}));

  if (!orderId) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });

  try {
    const { data } = await woo.post(`/orders/${orderId}/refunds`, body);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Refund failed" }, { status: 500 });
  }
}
