import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

export async function GET() {
  try {
    const woo = await getWooClient();

    const PER_PAGE = 100;
    const MAX_PAGES = 20; // safety cap (max 2000 tags)

    const all: any[] = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      const { data } = await woo.get("/products/tags", {
        params: {
          per_page: PER_PAGE,
          page,
          orderby: "name",
          order: "asc",
          hide_empty: false,
        },
      });

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    const items = all.map((t: any) => ({
      id: Number(t?.id || 0),
      name: String(t?.name || ""),
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    const msg = extractWooError(e, "Failed to load tags");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}