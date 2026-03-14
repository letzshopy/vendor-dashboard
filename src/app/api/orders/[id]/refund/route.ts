// src/app/api/orders/[id]/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const orderId = Number(id);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  try {
    const woo = await getWooClient();
    const { data } = await woo.get(`/orders/${orderId}/notes`);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const woo = await getWooClient();
  const { id } = await context.params;
  const orderId = Number(id);
  if (!orderId) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // Woo expects: { note: string, customer_note: boolean }
  const payload = {
    note: String(body.note || ""),
    customer_note: Boolean(body.customer_note || false),
  };

  if (!payload.note.trim()) {
    return NextResponse.json({ error: "note is required" }, { status: 400 });
  }

  try {
    const { data } = await woo.post(`/orders/${orderId}/notes`, payload);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to add note" },
      { status: 500 }
    );
  }
}
