// src/app/api/products/bulk-update/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type BulkPatch = Partial<{
  status: "draft" | "publish";
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string; // YYYY-MM-DD
  date_on_sale_to: string; // YYYY-MM-DD
  manage_stock: boolean;
  stock_quantity: number;
  backorders: "no" | "notify" | "yes";
  categories: { ids: number[]; op: "replace" | "add" | "remove" };
  tags: { names: string[]; op: "replace" | "append" | "remove" };
}>;

/**
 * POST /api/products/bulk-update
 * Body: { ids: number[], patch: BulkPatch }
 */
export async function POST(req: Request) {
  try {
    const woo = await getWooClient();

    const body = await req.json().catch(() => ({}));
    const idsRaw: any[] = Array.isArray(body?.ids) ? body.ids : [];
    const patch: BulkPatch = body?.patch && typeof body.patch === "object" ? body.patch : {};

    if (idsRaw.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }

    const ids = idsRaw.map((x) => Number(x)).filter((n) => !!n);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid product ids" }, { status: 400 });
    }

    const needsExisting =
      (patch?.categories && patch.categories.op !== "replace") ||
      (patch?.tags && patch.tags.op !== "replace");

    // Helper: fetch products (used only for add/remove/append ops)
    async function fetchProducts(productIds: number[]) {
      const out: any[] = [];
      const chunkSize = 20;

      for (let i = 0; i < productIds.length; i += chunkSize) {
        const ch = productIds.slice(i, i + chunkSize);

        // bounded concurrency per chunk
        const res = await Promise.all(
          ch.map((id) =>
            woo
              .get(`/products/${id}`)
              .then((r: any) => r?.data)
              .catch(() => null)
          )
        );

        res.forEach((p) => p && out.push(p));
      }
      return out;
    }

    let existing: any[] | null = null;
    if (needsExisting) existing = await fetchProducts(ids);

    const scalarKeys: Array<keyof BulkPatch> = [
      "status",
      "catalog_visibility",
      "regular_price",
      "sale_price",
      "date_on_sale_from",
      "date_on_sale_to",
      "manage_stock",
      "stock_quantity",
      "backorders",
    ];

    // Build update array per product
    const updates = ids.map((id) => {
      const u: any = { id };

      // simple scalar fields
      for (const k of scalarKeys) {
        const v: any = (patch as any)[k];
        if (v !== undefined && v !== null && v !== "") {
          u[k] = v;
        }
      }

      // categories
      if (patch?.categories) {
        const catIds = Array.isArray(patch.categories.ids)
          ? patch.categories.ids.map((x) => Number(x)).filter((n) => !!n)
          : [];
        const op = patch.categories.op;

        if (op === "replace") {
          u.categories = catIds.map((cid) => ({ id: cid }));
        } else if (existing) {
          const cur: number[] =
            existing.find((p) => Number(p?.id) === id)?.categories?.map((c: any) => Number(c?.id)) ||
            [];
          const next = new Set<number>(cur.filter((n) => !!n));

          if (op === "add") catIds.forEach((cid) => next.add(cid));
          if (op === "remove") catIds.forEach((cid) => next.delete(cid));

          u.categories = Array.from(next).map((cid) => ({ id: cid }));
        }
      }

      // tags (Woo accepts { name } and will create if missing)
      if (patch?.tags) {
        const names = Array.isArray(patch.tags.names)
          ? patch.tags.names.map((n) => String(n || "").trim()).filter(Boolean)
          : [];
        const op = patch.tags.op;

        if (op === "replace") {
          u.tags = names.map((n) => ({ name: n }));
        } else if (existing) {
          const curNames: string[] =
            (existing.find((p) => Number(p?.id) === id)?.tags || [])
              .map((t: any) => String(t?.name || "").trim())
              .filter(Boolean);

          const set = new Set<string>(curNames);

          if (op === "append") names.forEach((n) => set.add(n));
          if (op === "remove") names.forEach((n) => set.delete(n));

          u.tags = Array.from(set).map((n) => ({ name: n }));
        }
      }

      return u;
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Woo batch update (chunk into 50)
    const chunkSize = 50;
    const updated: any[] = [];
    const errors: any[] = [];

    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);

      try {
        const { data } = await woo.post("/products/batch", { update: chunk });
        if (Array.isArray(data?.update)) updated.push(...data.update);
      } catch (e: any) {
        errors.push({
          chunkIds: chunk.map((u: any) => u.id),
          error:
            e?.response?.data?.message ||
            e?.response?.data?.error ||
            e?.message ||
            "Batch update failed",
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
      "Bulk update failed";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}