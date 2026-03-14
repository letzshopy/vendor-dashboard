import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


export async function GET() {
  try {
    const woo = await getWooClient();
    const { data } = await woo.get("/products/categories", {
      params: { per_page: 100, hide_empty: false, orderby: "name", order: "asc" },
    });
    return NextResponse.json({ categories: data || [] });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";
    return NextResponse.json({ error: String(msg) }, { status });
  }
}
