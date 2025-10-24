import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET() {
  try {
    // Pull a generous page; adjust if you expect thousands of tags.
    const { data } = await woo.get("/products/tags", {
      params: { per_page: 100, orderby: "name", order: "asc", hide_empty: false },
    });
    return NextResponse.json({ tags: data || [] });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Fetch failed";
    return NextResponse.json({ error: msg, tags: [] }, { status: 500 });
  }
}
