import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Permanently delete many products: loop DELETE with force=true
export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }
    const results: Array<{ id: number; ok: boolean; error?: any }> = [];
    for (const id of ids) {
      try {
        await woo.delete(`/products/${id}`, { params: { force: true } });
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.response?.data || e?.message });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bulk permanent delete failed" }, { status: 500 });
  }
}
