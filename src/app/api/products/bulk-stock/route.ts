import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// POST body: { ids: number[], status: "instock" | "outofstock" }
export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));
    const ids: number[] = Array.isArray(body?.ids) ? body.ids : [];
    const status = body?.status;

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No product ids provided" },
        { status: 400 }
      );
    }

    if (status !== "instock" && status !== "outofstock") {
      return NextResponse.json(
        { error: "Invalid stock status" },
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

      // Force manage_stock=false so stock_status applies cleanly
      const updates = chunk.map((id) => ({
        id,
        manage_stock: false,
        stock_status: status,
      }));

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
            "Batch stock update failed",
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
      "Bulk stock failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}