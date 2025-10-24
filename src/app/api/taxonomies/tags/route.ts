import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET() {
  try {
    const { data } = await woo.get("/products/tags", {
      params: { per_page: 100, orderby: "name", order: "asc" },
    });
    const items = data.map((t: any) => ({ id: t.id, name: t.name }));
    return NextResponse.json({ items });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Failed to load tags";
    return NextResponse.json({ error: msg }, { status });
  }
}
