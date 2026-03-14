import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));
    const idsRaw: any[] = Array.isArray(body?.ids) ? body.ids : [];

    if (idsRaw.length === 0) {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 });
    }

    const ids = idsRaw.map((x) => Number(x)).filter((n) => !!n);

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid ids" }, { status: 400 });
    }

    const chunkSize = 50;
    let updatedCount = 0;
    const errors: any[] = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);

      const update = chunk.map((id) => ({
        id,
        images: [] as any[], // clear gallery + featured
      }));

      try {
        const { data } = await woo.post("/products/batch", { update });
        if (Array.isArray(data?.update)) {
          updatedCount += data.update.length;
        }
      } catch (e: any) {
        errors.push({
          chunk,
          error:
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Batch clear images failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      updatedCount,
      errors,
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}