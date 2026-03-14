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

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));

    const payload: any = {};
    if (body?.name !== undefined) payload.name = String(body.name).trim();
    if (body?.slug !== undefined) payload.slug = String(body.slug).trim();
    if (body?.description !== undefined) payload.description = String(body.description);

    if (!payload.name) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    const { data } = await woo.post("/products/tags", payload);

    return NextResponse.json({ tag: data });
  } catch (e: any) {
    const msg = extractWooError(e, "Create failed");
    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}