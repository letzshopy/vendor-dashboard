import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // 👈 await
    const { data } = await woo.get(`/products/${id}`);
    return NextResponse.json({ product: data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data || e?.message || "Fetch failed" },
      { status: 500 }
    );
  }
}
