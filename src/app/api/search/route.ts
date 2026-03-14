import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type SearchScope = "products" | "orders" | "customers";

type SearchResult = {
  id: number | string;
  label: string;
  subLabel?: string;
  url: string;
};

function asScope(v: any): SearchScope {
  return v === "orders" || v === "customers" || v === "products"
    ? v
    : "products";
}

export async function GET(req: Request) {
  const woo = await getWooClient();

  const { searchParams } = new URL(req.url);
  const q = String(searchParams.get("q") || "").trim();
  const scope = asScope(searchParams.get("scope"));

  if (!q || q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  try {
    let items: SearchResult[] = [];

    if (scope === "products") {
      const { data } = await woo.get("/products", {
        params: {
          search: q,
          per_page: 5,
          status: "any",
          orderby: "date",
          order: "desc",
        },
      });

      const arr = Array.isArray(data) ? data : [];
      items = arr.map((p: any) => ({
        id: Number(p?.id || 0),
        label: String(p?.name || "(no title)"),
        subLabel: p?.sku ? `SKU: ${String(p.sku)}` : undefined,
        url: `/products/${p?.id}`,
      }));
    }

    if (scope === "orders") {
      // Woo orders search can be inconsistent across stores.
      // We'll try "search" first, and if q is numeric, try include as fallback.
      const isNum = /^\d+$/.test(q);

      const primary = await woo
        .get("/orders", {
          params: {
            search: q,
            per_page: 5,
            orderby: "date",
            order: "desc",
          },
        })
        .catch(() => ({ data: [] }));

      let arr = Array.isArray((primary as any)?.data) ? (primary as any).data : [];

      if (arr.length === 0 && isNum) {
        const fallback = await woo
          .get("/orders", { params: { include: [Number(q)], per_page: 5 } })
          .catch(() => ({ data: [] }));
        const farr = Array.isArray((fallback as any)?.data) ? (fallback as any).data : [];
        arr = farr.length ? farr : arr;
      }

      items = arr.map((o: any) => {
        const name =
          `${String(o?.billing?.first_name || "")} ${String(o?.billing?.last_name || "")}`.trim();

        const label = `Order #${o?.number || o?.id}`;
        const subParts: string[] = [];
        if (name) subParts.push(name);
        if (o?.total) subParts.push(`₹${String(o.total)}`);

        return {
          id: Number(o?.id || 0),
          label,
          subLabel: subParts.length ? subParts.join(" • ") : undefined,
          url: `/orders/${o?.id}`,
        };
      });
    }

    if (scope === "customers") {
      const { data } = await woo.get("/customers", {
        params: {
          search: q,
          per_page: 5,
          orderby: "name",
          order: "asc",
        },
      });

      const arr = Array.isArray(data) ? data : [];
      items = arr.map((c: any) => {
        const name = `${String(c?.first_name || "")} ${String(c?.last_name || "")}`.trim();
        const email = (c?.email ? String(c.email) : "") || undefined;

        return {
          id: Number(c?.id || 0),
          label: name || email || "Customer",
          subLabel: email,
          // Adjust if you later add /customers/[id]
          url: `/customers?search=${encodeURIComponent(email || name || "")}`,
        };
      });
    }

    // remove any accidental id=0 rows
    items = items.filter((it) => it.id !== 0);

    return NextResponse.json({ items });
  } catch {
    // keep UI smooth
    return NextResponse.json({ items: [] });
  }
}