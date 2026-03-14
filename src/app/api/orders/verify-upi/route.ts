import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json(
        { error: "Missing orderId" },
        { status: 400 }
      );
    }

    // Load order from Woo
    const { data: order } = await woo.get(`/orders/${orderId}`);

    if (order.payment_method !== "letz_upi") {
      return NextResponse.json(
        { error: "Not a UPI order" },
        { status: 400 }
      );
    }

    if (order.status !== "on-hold") {
      return NextResponse.json(
        { error: "Order is not awaiting verification" },
        { status: 400 }
      );
    }

    // Move to processing
    await woo.put(`/orders/${orderId}`, {
      status: "processing",
    });

    // Add an order note for audit trail
    await woo.post(`/orders/${orderId}/notes`, {
      note: "Manual UPI payment verified from LetzShopy vendor dashboard.",
      customer_note: false,
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("verify-upi error", e?.message || e);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
