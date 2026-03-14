// src/app/api/attributes/create/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

// Helper to list existing global attributes
async function listAttributes(woo: any) {
  const { data } = await woo.get("/products/attributes", {
    params: { per_page: 100, orderby: "name", order: "asc" },
  });
  return data || [];
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const body = await req.json().catch(() => ({} as any));

    // 1) Preset: ensure Color & Size exist
    if (body?.preset === "color-size") {
      const existing = await listAttributes(woo);

      const need = ["Color", "Size"].filter(
        (n) =>
          !existing.some(
            (a: any) => a?.name?.toLowerCase?.() === n.toLowerCase()
          )
      );

      const created: any[] = [];
      for (const name of need) {
        const payload = {
          name,
          slug: name.toLowerCase(),
          type: "select",
          order_by: "menu_order",
          has_archives: false,
        };
        const { data } = await woo.post("/products/attributes", payload);
        created.push(data);
      }

      return NextResponse.json({ ok: true, created });
    }

    // 2) Manual create
    const name = body?.name?.toString().trim();
    if (!name) {
      return NextResponse.json(
        { error: "Attribute name is required" },
        { status: 400 }
      );
    }

    const slugFromName = name.toLowerCase().replace(/\s+/g, "-");

    const payload = {
      name,
      slug: body?.slug?.toString().trim() || slugFromName,
      type: body?.type || "select",
      order_by: body?.order_by || "menu_order",
      has_archives: false,
    };

    const { data } = await woo.post("/products/attributes", payload);
    return NextResponse.json({ ok: true, attribute: data });
  } catch (e: any) {
    console.error("Attribute create error:", e);

    const status = e?.response?.status || 500;
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Error";

    return NextResponse.json({ error: String(msg) }, { status });
  }
}