// src/app/api/tags/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// Match Next 15 validator: params is a Promise<{ id: string }>
type RouteContext = {
  params: Promise<{ id: string }>;
};

function extractWooError(e: any, fallback: string) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    fallback
  );
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const tagId = Number(id);

    if (!tagId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    // Only allow supported fields
    const payload: any = {};
    if (body?.name !== undefined) payload.name = String(body.name).trim();
    if (body?.slug !== undefined) payload.slug = String(body.slug).trim();
    if (body?.description !== undefined)
      payload.description = String(body.description);

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data } = await woo.put(`/products/tags/${tagId}`, payload);

    return NextResponse.json({ tag: data });
  } catch (e: any) {
    const msg = extractWooError(e, "Update failed");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}