import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// Bulk restore: set status="draft" for each ID
export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));
    const ids: number[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No product ids provided" },
        { status: 400 }
      );
    }

    const cleanIds = ids.map((id) => Number(id)).filter((id) => !!id);

    if (cleanIds.length === 0) {
      return NextResponse.json({ error: "No valid product ids" }, { status: 400 });
    }

    const chunkSize = 50;
    const updated: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < cleanIds.length; i += chunkSize) {
      const chunk = cleanIds.slice(i, i + chunkSize);
      const updates = chunk.map((id) => ({ id, status: "draft" }));

      try {
        const { data } = await woo.post("/products/batch", { update: updates });
        if (Array.isArray(data?.update)) updated.push(...data.update);
      } catch (e: any) {
        errors.push({
          chunk,
          error:
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Batch restore failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      updatedCount: updated.length,
      updated,
      errors,
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Bulk restore failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}