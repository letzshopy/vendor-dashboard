import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET() {
  try {
    // Woo endpoint returns terms of product shipping classes
    const { data } = await woo.get("/products/shipping_classes", {
      params: { per_page: 100, page: 1 },
    });

    // normalize to id/slug/label
    const classes = (data || []).map((c: any) => ({
      id: c.id as number,
      slug: c.slug as string,
      name: c.name as string,
    }));

    return NextResponse.json({ classes });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Load failed";
    return NextResponse.json({ error: msg, classes: [] }, { status: 500 });
  }
}
