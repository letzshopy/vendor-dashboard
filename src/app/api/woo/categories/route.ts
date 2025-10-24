import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const perPage = 100;
    let page = 1;
    const items: any[] = [];

    while (true) {
      const { data } = await woo.get("/products/categories", {
        params: { per_page: perPage, page },
      });
      if (!Array.isArray(data) || data.length === 0) break;
      items.push(...data);
      if (data.length < perPage) break;
      page += 1;
    }

    const cats = items.map((c) => ({
      id: Number(c.id),
      name: String(c.name || ""),
      slug: String(c.slug || ""),
      parent: Number(c.parent || 0),
    }));

    return NextResponse.json({ ok: true, items: cats });
  } catch (err: any) {
    const msg = err?.response?.data || err?.message || "Woo fetch failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
