import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type Patch = Partial<{
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
}>;

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const updates: { id: number; patch: Patch }[] = body?.updates || [];
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }

    // Woo batch endpoint: /products/batch with { update: [{ id, ...fields }, ...] }
    // Chunk into 50s to be safe.
    const chunkSize = 50;
    const chunks: typeof updates[] = [];
    for (let i = 0; i < updates.length; i += chunkSize) {
      chunks.push(updates.slice(i, i + chunkSize));
    }

    const results: any[] = [];
    for (const ch of chunks) {
      const payload = {
        update: ch.map(u => ({ id: u.id, ...u.patch })),
      };
      const { data } = await woo.post("/products/batch", payload);
      results.push(data);
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Bulk update failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
