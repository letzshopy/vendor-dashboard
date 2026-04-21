// src/app/api/products/[id]/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function buildMetaData(body: any) {
  const meta_data: { key: string; value: string }[] = [];

  if ("color" in body) {
    meta_data.push({
      key: "_ls_color",
      value: String(body?.color || "").trim(),
    });
  }

  return meta_data;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const woo = await getWooClient();

    const { id } = await context.params;
    const productId = Number(id);

    if (!productId) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { error: "No fields provided for update" },
        { status: 400 }
      );
    }

    const payload: any = { ...body };

    const meta_data = buildMetaData(body);
    delete payload.color;

    if (meta_data.length) {
      payload.meta_data = meta_data;
    }

    const { data } = await woo.put(`/products/${productId}`, payload);

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Update failed";

    return NextResponse.json(
      { ok: false, error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}