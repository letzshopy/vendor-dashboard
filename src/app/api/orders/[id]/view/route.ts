// src/app/api/orders/[id]/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

import { WCOrder } from "@/lib/order-utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: idStr } = await context.params;
  const id = Number(idStr);

  if (!id) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const woo = await getWooClient();
    const { data } = await woo.get<WCOrder>(`/orders/${id}`);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load order" },
      { status: 500 }
    );
  }
}
