import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }
    // Woo doesn't support batch trash; delete one-by-one with force=false
    const results = [];
    for (const id of ids) {
      try {
        const { data } = await woo.delete(`/products/${id}`, { params: { force: false } });
        results.push({ id, ok: true, data });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.response?.data || e?.message });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bulk trash failed" }, { status: 500 });
  }
}
