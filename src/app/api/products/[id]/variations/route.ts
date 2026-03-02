// src/app/api/products/[id]/variations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const { data } = await woo.get(`/products/${id}/variations`, {
      params: { per_page: 100, orderby: "menu_order", order: "asc" },
    });

    return NextResponse.json({ variations: data });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load variations",
      },
      { status: e?.response?.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const body = await req.json();
    const items: any[] = Array.isArray(body?.variations)
      ? body.variations
      : [];

    // Split into updates vs creates
    const toUpdate = items.filter((v) => v.id);
    const toCreate = items.filter((v) => !v.id);

    const results: any[] = [];

    // Update existing
    for (const v of toUpdate) {
      const { data } = await woo.put(
        `/products/${id}/variations/${v.id}`,
        v
      );
      results.push(data);
    }

    // Create new (if any)
    for (const v of toCreate) {
      const { data } = await woo.post(
        `/products/${id}/variations`,
        v
      );
      results.push(data);
    }

    return NextResponse.json({ variations: results });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to save variations",
      },
      { status: e?.response?.status || 500 }
    );
  }
}
