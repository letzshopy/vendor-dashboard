import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type SearchScope = "products" | "orders" | "customers";

type SearchResult = {
  id: number | string;
  label: string;
  subLabel?: string;
  url: string;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const scope = (searchParams.get("scope") ||
    "products") as SearchScope;

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
      items = (data as any[]).map((p) => ({
        id: p.id,
        label: p.name || "(no title)",
        subLabel: p.sku ? `SKU: ${p.sku}` : undefined,
        url: `/products/${p.id}`,
      }));
    } else if (scope === "orders") {
      const { data } = await woo.get("/orders", {
        params: {
          search: q,
          per_page: 5,
          orderby: "date",
          order: "desc",
        },
      });
      items = (data as any[]).map((o) => {
        const name =
          ((o.billing?.first_name as string) || "") +
          " " +
          ((o.billing?.last_name as string) || "");
        const label = `Order #${o.number || o.id}`;
        const subParts = [];
        if (name.trim()) subParts.push(name.trim());
        if (o.total) subParts.push(`₹${o.total}`);
        return {
          id: o.id,
          label,
          subLabel: subParts.join(" • "),
          url: `/orders/${o.id}`,
        };
      });
    } else if (scope === "customers") {
      const { data } = await woo.get("/customers", {
        params: {
          search: q,
          per_page: 5,
          orderby: "name",
          order: "asc",
        },
      });
      items = (data as any[]).map((c) => {
        const name =
          ((c.first_name as string) || "") +
          " " +
          ((c.last_name as string) || "");
        const email = c.email as string | undefined;
        return {
          id: c.id,
          label: name.trim() || email || "Customer",
          subLabel: email || undefined,
          // You can adjust this to your actual Customers page URL
          url: `/customers?search=${encodeURIComponent(
            email || name || ""
          )}`,
        };
      });
    }

    return NextResponse.json({ items });
  } catch (e: any) {
    console.error("Quick search API error:", e?.message || e);
    return NextResponse.json({ items: [] });
  }
}
