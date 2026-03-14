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

    const cleanIds = ids.map((id) => Number(id)).filter((id) => !!id);
    if (cleanIds.length === 0) {
      return NextResponse.json({ error: "No valid product ids" }, { status: 400 });
    }

    // 1) Try batch trash first (fast)
    try {
      const chunkSize = 50;
      const trashed: any[] = [];

      for (let i = 0; i < cleanIds.length; i += chunkSize) {
        const chunk = cleanIds.slice(i, i + chunkSize);
        const { data } = await woo.post("/products/batch", {
          delete: chunk,
          force: false, // move to trash
        });

        if (Array.isArray(data?.delete)) trashed.push(...data.delete);
      }

      // If Woo honored batch delete, we’re done
      return NextResponse.json({
        ok: true,
        mode: "batch",
        trashedCount: trashed.length,
        trashed,
      });
    } catch (_batchErr: any) {
      // 2) Fallback to one-by-one trash (safe + compatible)
      const results: Array<{ id: number; ok: boolean; data?: any; error?: string }> = [];

      for (const id of cleanIds) {
        try {
          const { data } = await woo.delete(`/products/${id}`, {
            params: { force: false },
          });
          results.push({ id, ok: true, data });
        } catch (e: any) {
          results.push({
            id,
            ok: false,
            error:
              e?.response?.data?.message ||
              e?.response?.data?.error ||
              e?.message ||
              "Trash failed",
          });
        }
      }

      return NextResponse.json({ ok: true, mode: "loop", results });
    }
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Bulk trash failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}