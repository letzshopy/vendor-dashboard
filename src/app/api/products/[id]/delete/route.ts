import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Permanently delete a product (moves bypass trash): force=true
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { data } = await woo.delete(`/products/${params.id}`, { params: { force: true } });
    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data || e?.message || "Permanent delete failed" }, { status: 500 });
  }
}
