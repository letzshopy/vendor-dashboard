import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { data } = await woo.delete(`/products/${params.id}`, { params: { force: false } });
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data || e?.message || "Trash failed" }, { status: 500 });
  }
}
