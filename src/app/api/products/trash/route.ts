import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET() {
  try {
    const { data } = await woo.get("/products", {
      params: {
        status: "trash",
        per_page: 100,
        orderby: "date",
        order: "desc",
      },
    });

    const items = (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      date: p.date_created,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data?.message || "Failed to load trash" },
      { status: e?.response?.status || 500 }
    );
  }
}
