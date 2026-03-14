// src/app/api/products/[id]/variations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getAllVariations(woo: any, productId: number) {
  const all: any[] = [];
  let page = 1;
  const PER_PAGE = 100;
  const MAX_PAGES = 25; // safety cap

  while (page <= MAX_PAGES) {
    const { data } = await woo.get(`/products/${productId}/variations`, {
      params: {
        per_page: PER_PAGE,
        page,
        orderby: "menu_order",
        order: "asc",
      },
    });

    if (!Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < PER_PAGE) break;
    page++;
  }

  return all;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const variations = await getAllVariations(woo, productId);
    return NextResponse.json({ variations });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to load variations";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const items: any[] = Array.isArray(body?.variations) ? body.variations : [];

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No variations provided" },
        { status: 400 }
      );
    }

    // Split into updates vs creates
    const update = items.filter((v) => v?.id).map((v) => v);
    const create = items.filter((v) => !v?.id).map((v) => v);

    // ✅ Use Woo batch endpoint (much faster than looping)
    const { data } = await woo.post(`/products/${productId}/variations/batch`, {
      update,
      create,
    });

    const results: any[] = [
      ...(Array.isArray(data?.update) ? data.update : []),
      ...(Array.isArray(data?.create) ? data.create : []),
    ];

    return NextResponse.json({ variations: results });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to save variations";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}