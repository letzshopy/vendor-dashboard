import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { data } = await woo.delete(`/products/tags/${params.id}`, { params: { force: true } });
    return NextResponse.json({ ok: true, deleted: data?.id || params.id });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Delete failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
