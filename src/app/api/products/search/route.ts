import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// Search WooCommerce products by name OR exact SKU
export async function GET(req: Request) {
  try {
    const woo = await getWooClient();

    const { searchParams } = new URL(req.url);
    const q = String(searchParams.get("q") || "").trim();

    if (!q) return NextResponse.json({ results: [] });

    const paramsBase = { per_page: 20, status: "any" as const };

    const [byNameRes, bySkuRes] = await Promise.all([
      woo
        .get("/products", { params: { ...paramsBase, search: q } })
        .catch(() => ({ data: [] })),
      woo
        .get("/products", { params: { ...paramsBase, sku: q } })
        .catch(() => ({ data: [] })),
    ]);

    const byName = Array.isArray((byNameRes as any)?.data) ? (byNameRes as any).data : [];
    const bySku = Array.isArray((bySkuRes as any)?.data) ? (bySkuRes as any).data : [];

    const map = new Map<number, any>();
    for (const p of byName) if (p?.id) map.set(Number(p.id), p);
    for (const p of bySku) if (p?.id) map.set(Number(p.id), p);

    const results = Array.from(map.values()).map((p) => ({
      id: Number(p.id),
      name: String(p.name || ""),
      sku: String(p.sku || ""),
      price: String(p.price || ""),
      regular_price: String(p.regular_price || ""),
      sale_price: String(p.sale_price || ""),
      image: p?.images?.[0]?.src || "",
    }));

    return NextResponse.json({ results });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "search failed";

    return NextResponse.json(
      { error: msg, results: [] },
      { status: e?.response?.status || 500 }
    );
  }
}