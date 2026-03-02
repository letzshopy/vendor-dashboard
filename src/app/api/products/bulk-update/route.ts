// src/app/api/products/bulk-update/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

/**
 * POST /api/products/bulk-update
 * Body: {
 *   ids: number[],
 *   patch: {
 *     // simple fields (applied if defined)
 *     status?: "draft"|"publish";
 *     catalog_visibility?: "visible"|"catalog"|"search"|"hidden";
 *     regular_price?: string;  // sets price
 *     sale_price?: string;     // sets sale price
 *     date_on_sale_from?: string; // YYYY-MM-DD
 *     date_on_sale_to?: string;   // YYYY-MM-DD
 *     manage_stock?: boolean;
 *     stock_quantity?: number;
 *     backorders?: "no"|"notify"|"yes";
 *
 *     // taxonomy ops
 *     categories?: { ids: number[]; op: "replace"|"add"|"remove" };
 *     tags?: { names: string[]; op: "replace"|"append"|"remove" };
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const { ids, patch } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No product ids" }, { status: 400 });
    }

    // Helper to fetch current product (for add/remove/append ops)
    async function fetchProducts(productIds: number[]) {
      const chunks: number[][] = [];
      for (let i = 0; i < productIds.length; i += 20) {
        chunks.push(productIds.slice(i, i + 20));
      }
      const out: any[] = [];
      for (const ch of chunks) {
        const res = await Promise.all(
          ch.map((id) => woo.get(`/products/${id}`)).map((p) => p.catch(() => null))
        );
        res.forEach((r) => r && out.push(r.data));
      }
      return out;
    }

    let existing: any[] | null = null;
    const needsExisting =
      (patch?.categories && patch.categories.op !== "replace") ||
      (patch?.tags && patch.tags.op !== "replace");

    if (needsExisting) {
      existing = await fetchProducts(ids);
    }

    // Build update array per product
    const updates = ids.map((id: number) => {
      const u: any = { id };

      // simple scalar fields
      [
        "status",
        "catalog_visibility",
        "regular_price",
        "sale_price",
        "date_on_sale_from",
        "date_on_sale_to",
        "manage_stock",
        "stock_quantity",
        "backorders",
      ].forEach((k) => {
        if (patch[k] !== undefined && patch[k] !== null && patch[k] !== "") {
          u[k] = patch[k];
        }
      });

      // categories
      if (patch?.categories) {
        const { ids: catIds = [], op } = patch.categories as {
          ids: number[];
          op: "replace" | "add" | "remove";
        };

        if (op === "replace") {
          u.categories = catIds.map((cid: number) => ({ id: cid }));
        } else if (existing) {
          const cur =
            existing.find((p) => p.id === id)?.categories?.map((c: any) => c.id) || [];
          const next = new Set<number>(cur);

          if (op === "add") {
            catIds.forEach((cid: number) => next.add(cid));
          }
          if (op === "remove") {
            catIds.forEach((cid: number) => next.delete(cid));
          }

          u.categories = Array.from(next).map((cid: number) => ({ id: cid }));
        }
      }

      // tags (Woo lets you send { name } to create if missing)
      if (patch?.tags) {
        const { names = [], op } = patch.tags as {
          names: string[];
          op: "replace" | "append" | "remove";
        };

        if (op === "replace") {
          u.tags = names.map((n: string) => ({ name: n }));
        } else if (existing) {
          const curNames: string[] =
            (existing.find((p) => p.id === id)?.tags || []).map((t: any) => t.name);
          const set = new Set<string>(curNames);

          if (op === "append") {
            names.forEach((n: string) => set.add(n));
          }
          if (op === "remove") {
            names.forEach((n: string) => set.delete(n));
          }

          u.tags = Array.from(set).map((n: string) => ({ name: n }));
        }
      }

      return u;
    });

    // Woo batch update
    const { data } = await woo.post("/products/batch", { update: updates });
    return NextResponse.json({ ok: true, updated: data?.update || [] });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data || e?.message || "Bulk update failed" },
      { status: 500 }
    );
  }
}
