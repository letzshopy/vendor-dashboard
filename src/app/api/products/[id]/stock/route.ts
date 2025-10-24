import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function PUT(_: Request, { params }: { params: { id: string } }) {
  try {
    const body = await _.json();
    const patch: any = {};
    if ("manage_stock" in body) patch.manage_stock = !!body.manage_stock;
    if ("stock_quantity" in body) patch.stock_quantity = body.stock_quantity ?? null;
    if ("stock_status" in body) patch.stock_status = body.stock_status;

    const { data } = await woo.put(`/products/${params.id}`, patch);
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data?.message || e?.message || "Update failed" }, { status: 400 });
  }
}
