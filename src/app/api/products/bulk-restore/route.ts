import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Bulk restore: set status="draft" for each ID
export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }
    const updates = ids.map((id: number) => ({ id, status: "draft" }));
    const { data } = await woo.post("/products/batch", { update: updates });
    return NextResponse.json({ ok: true, updated: data?.update || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data || e?.message || "Bulk restore failed" }, { status: 500 });
  }
}
