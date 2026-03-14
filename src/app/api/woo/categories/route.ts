import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

export const dynamic = "force-dynamic";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

/**
 * GET /api/woo/categories
 * Query:
 *  - per_page (default 100, max 100)
 *  - search
 *  - simple=1  -> returns flat array [{id,name}] instead of { ok, items }
 */
export async function GET(req: NextRequest) {
  try {
    const woo = await getWooClient();

    const url = new URL(req.url);
    const perPage = clamp(Number(url.searchParams.get("per_page") || 100), 1, 100);
    const search = String(url.searchParams.get("search") || "").trim();
    const simple = url.searchParams.get("simple") === "1";

    let page = 1;
    const items: any[] = [];

    const MAX_PAGES = 25; // safety cap (25*100 = 2500 categories)

    while (page <= MAX_PAGES) {
      const { data } = await woo.get("/products/categories", {
        params: {
          per_page: perPage,
          page,
          ...(search ? { search } : {}),
          hide_empty: false,
          orderby: "name",
          order: "asc",
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (rows.length === 0) break;

      items.push(...rows);

      if (rows.length < perPage) break;
      page += 1;
    }

    const cats = items.map((c: any) => ({
      id: Number(c?.id || 0),
      name: String(c?.name || ""),
      slug: String(c?.slug || ""),
      parent: Number(c?.parent || 0),
    }));

    // flat mode for simple dropdowns
    if (simple) {
      return NextResponse.json(
        cats.filter((c) => c.id > 0).map((c) => ({ id: c.id, name: c.name }))
      );
    }

    return NextResponse.json({ ok: true, items: cats });
  } catch (err: any) {
    const msg = extractWooError(err, "Woo fetch failed");
    return NextResponse.json(
      { ok: false, error: msg },
      { status: err?.response?.status || 500 }
    );
  }
}