import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const { ids, action, qty } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }
    const updates =
      action === "instock"
        ? ids.map((id: number) => ({ id, stock_status: "instock" }))
        : action === "outofstock"
        ? ids.map((id: number) => ({ id, stock_status: "outofstock" }))
        : action === "setqty"
        ? ids.map((id: number) => ({
            id,
            manage_stock: true,
            stock_quantity: Number(qty ?? 0),
          }))
        : null;

    if (!updates) {
      return NextResponse.json({ error: "Bad action" }, { status: 400 });
    }

    await woo.post("/products/batch", { update: updates });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data?.message || e?.message || "Failed" },
      { status: 500 }
    );
  }
}
