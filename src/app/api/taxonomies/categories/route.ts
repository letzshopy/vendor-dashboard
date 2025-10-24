import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET() {
  try {
    const { data } = await woo.get("/products/categories", {
      params: { per_page: 100, hide_empty: false, orderby: "name", order: "asc" },
    });
    // Return only essentials
    const items = data.map((c: any) => ({ id: c.id, name: c.name, parent: c.parent }));
    return NextResponse.json({ items });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg = e?.response?.data?.message || "Failed to load categories";
    return NextResponse.json({ error: msg }, { status });
  }
}
