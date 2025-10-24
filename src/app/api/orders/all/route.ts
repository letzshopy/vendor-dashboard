// src/app/api/orders/all/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import { WCOrder } from "@/lib/order-utils";

async function fetchMany(): Promise<WCOrder[]> {
  const MAX_PAGES = 5; // up to 500 latest orders (adjust if needed)
  const PER = 100;
  const out: WCOrder[] = [];
  for (let p = 1; p <= MAX_PAGES; p++) {
    const { data } = await woo.get<WCOrder[]>("/orders", {
      per_page: PER,
      page: p,
      order: "desc",
      orderby: "date",
    });
    out.push(...data);
    if (data.length < PER) break;
  }
  return out;
}

export async function GET() {
  try {
    const data = await fetchMany();
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load orders" }, { status: 500 });
  }
}
