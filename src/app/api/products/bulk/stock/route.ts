import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type Patch = Partial<{
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
}>;

type UpdateItem = { id: number; patch: Patch };

function isValidStockStatus(v: any): v is Patch["stock_status"] {
  return v === "instock" || v === "outofstock" || v === "onbackorder";
}

export async function PUT(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));
    const updates: UpdateItem[] = Array.isArray(body?.updates) ? body.updates : [];

    if (updates.length === 0) {
      return NextResponse.json({ error: "updates required" }, { status: 400 });
    }

    // sanitize + validate
    const clean: UpdateItem[] = [];
    for (const u of updates) {
      const id = Number((u as any)?.id);
      const patchIn = (u as any)?.patch;

      if (!id || !patchIn || typeof patchIn !== "object") continue;

      const patch: Patch = {};

      if ("manage_stock" in patchIn) patch.manage_stock = !!patchIn.manage_stock;

      if ("stock_quantity" in patchIn) {
        patch.stock_quantity =
          patchIn.stock_quantity === null || patchIn.stock_quantity === undefined
            ? null
            : Number(patchIn.stock_quantity);
      }

      if ("stock_status" in patchIn && isValidStockStatus(patchIn.stock_status)) {
        patch.stock_status = patchIn.stock_status;
      }

      if (Object.keys(patch).length === 0) continue;
      clean.push({ id, patch });
    }

    if (clean.length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Woo batch endpoint: /products/batch with { update: [{ id, ...fields }, ...] }
    // Chunk into 50s to be safe.
    const chunkSize = 50;
    const updated: any[] = [];

    for (let i = 0; i < clean.length; i += chunkSize) {
      const ch = clean.slice(i, i + chunkSize);
      const payload = { update: ch.map((u) => ({ id: u.id, ...u.patch })) };

      const { data } = await woo.post("/products/batch", payload);

      // Woo returns { update: [...], create: [...], delete: [...] }
      if (Array.isArray(data?.update)) updated.push(...data.update);
    }

    return NextResponse.json({ ok: true, updatedCount: updated.length, updated });
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Bulk update failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}