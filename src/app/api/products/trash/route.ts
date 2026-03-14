import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

async function getAllTrashedProducts(woo: any) {
  const all: any[] = [];
  let page = 1;
  const PER_PAGE = 100;
  const MAX_PAGES = 25; // safety cap

  while (page <= MAX_PAGES) {
    const { data } = await woo.get("/products", {
      params: {
        status: "trash",
        per_page: PER_PAGE,
        page,
        orderby: "date",
        order: "desc",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < PER_PAGE) break;
    page++;
  }

  return all;
}

export async function GET() {
  try {
    const woo = await getWooClient();

    const data = await getAllTrashedProducts(woo);

    const items = (data || []).map((p: any) => ({
      id: Number(p?.id || 0),
      name: String(p?.name || ""),
      sku: String(p?.sku || ""),
      date: p?.date_created || p?.date_modified || null,
    }));

    return NextResponse.json({ items });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to load trash";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}