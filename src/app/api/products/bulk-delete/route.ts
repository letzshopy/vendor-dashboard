import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

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

    // sanitize numeric IDs only
    const cleanIds = ids.map((id) => Number(id)).filter((id) => !!id);

    if (cleanIds.length === 0) {
      return NextResponse.json(
        { error: "No valid product ids" },
        { status: 400 }
      );
    }

    const chunkSize = 50;
    const deleted: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < cleanIds.length; i += chunkSize) {
      const chunk = cleanIds.slice(i, i + chunkSize);

      try {
        const { data } = await woo.post("/products/batch", {
          delete: chunk,
          force: true, // permanent delete
        });

        if (Array.isArray(data?.delete)) {
          deleted.push(...data.delete);
        }
      } catch (e: any) {
        errors.push({
          chunk,
          error:
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Batch delete failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      deletedCount: deleted.length,
      deleted,
      errors,
    });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Bulk permanent delete failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}