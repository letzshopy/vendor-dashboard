import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Note: force delete is not supported for terms; this removes and reassigns children to parent=0
    const { data } = await woo.delete(`/products/categories/${params.id}`, { params: { force: true } });
    return NextResponse.json({ ok: true, deleted: data?.id || params.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data?.message || e?.message || "Delete failed" }, { status: 500 });
  }
}
