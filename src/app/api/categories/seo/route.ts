import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

function cleanIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((num) => Number.isInteger(num) && num > 0)
    )
  ).slice(0, 6);
}

export async function GET() {
  try {
    const woo = await getWooClient();

    const { data } = await woo.get("/letzshopy/seo-categories");

    return NextResponse.json(
      data || { ok: true, selectedIds: [], min: 3, max: 6 }
    );
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Unable to load SEO categories";

    return NextResponse.json({ ok: false, error: String(msg) }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = cleanIds(body?.ids);

    const woo = await getWooClient();

    const { data } = await woo.post("/letzshopy/seo-categories", {
      ids,
    });

    return NextResponse.json(
      data || { ok: true, selectedIds: ids, min: 3, max: 6 }
    );
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Unable to save SEO categories";

    return NextResponse.json({ ok: false, error: String(msg) }, { status });
  }
}