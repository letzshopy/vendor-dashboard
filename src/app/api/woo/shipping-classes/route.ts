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
    const MAX_PAGES = 10; // safety cap (1000 classes max)

    const all: any[] = [];
    let page = 1;

    while (page <= MAX_PAGES) {
      const { data } = await woo.get("/products/shipping_classes", {
        params: { per_page: PER_PAGE, page },
      });

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) break;

      all.push(...rows);

      if (rows.length < PER_PAGE) break;
      page++;
    }

    const classes = all
      .map((c: any) => ({
        id: Number(c?.id || 0),
        slug: String(c?.slug || ""),
        name: String(c?.name || ""),
      }))
      .filter((c) => c.id > 0);

    return NextResponse.json({ classes });
  } catch (e: any) {
    const msg = extractWooError(e, "Load failed");
    return NextResponse.json(
      { error: msg, classes: [] },
      { status: e?.response?.status || 500 }
    );
  }
}