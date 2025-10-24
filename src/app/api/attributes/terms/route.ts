import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // Woo attribute terms do NOT support orderby=menu_order; use name/asc
      const { data } = await woo.get(`/products/attributes/${id}/terms`, {
        params: {
          per_page: 100,
          hide_empty: false,
          orderby: "name",
          order: "asc",
        },
      });
      return NextResponse.json({ terms: data || [] });
    } else {
      // List attributes for the page bootstrap
      const { data } = await woo.get("/products/attributes", {
        params: { per_page: 100, orderby: "name", order: "asc" },
      });
      return NextResponse.json({ attributes: data || [] });
    }
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";
    return NextResponse.json({ error: String(msg) }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const id = body.id;
    if (!id) return NextResponse.json({ error: "Missing attribute id" }, { status: 400 });

    // Allowed fields for attribute term create: name, slug, description
    const payload: any = {
      name: body.name,
      slug: body.slug || body.name?.toLowerCase().replace(/\s+/g, "-"),
    };
    if (body.description) payload.description = body.description;

    const { data } = await woo.post(`/products/attributes/${id}/terms`, payload);
    return NextResponse.json({ ok: true, term: data });
  } catch (e: any) {
    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";
    return NextResponse.json({ error: String(msg) }, { status });
  }
}
