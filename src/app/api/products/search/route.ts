import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// Search WooCommerce products by name (search param) OR exact SKU (sku param)
// We combine both result sets and return id, name, sku.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return NextResponse.json({ results: [] });

    // Name search
    const byName = await woo.get("/products", {
      params: { per_page: 20, search: q, status: "any" },
    });

    // Exact SKU search (Woo supports ?sku=)
    let bySku: any = { data: [] };
    try {
      bySku = await woo.get("/products", {
        params: { per_page: 20, sku: q, status: "any" },
      });
    } catch {
      // ignore sku request errors; not all stores enable it
    }

    const map = new Map<number, any>();
    for (const p of (byName.data || [])) map.set(p.id, p);
    for (const p of (bySku.data || [])) map.set(p.id, p);

    const results = Array.from(map.values()).map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
    }));

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "search failed", results: [] }, { status: 500 });
  }
}
