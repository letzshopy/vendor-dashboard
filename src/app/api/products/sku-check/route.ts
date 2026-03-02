// src/app/api/products/sku-check/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku")?.trim();
    if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

    const { data } = await woo.get("/products", {
      params: { per_page: 1, sku, status: "any" },
    });
    const exists = Array.isArray(data) && data.length > 0;
    return NextResponse.json({ exists });
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
