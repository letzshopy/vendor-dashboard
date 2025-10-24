import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// POST body: { ids: number[], status: "instock" | "outofstock" }
export async function POST(req: Request) {
  try {
    const { ids, status } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }
    if (!["instock", "outofstock"].includes(status)) {
      return NextResponse.json({ error: "Invalid stock status" }, { status: 400 });
    }

    // Force manage_stock=false so stock_status applies cleanly
    const updates = ids.map((id: number) => ({
      id,
      manage_stock: false,
      stock_status: status,
    }));

    const { data } = await woo.post("/products/batch", { update: updates });
    return NextResponse.json({ ok: true, updated: data?.update || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data || e?.message || "Bulk stock failed" }, { status: 500 });
  }
}
