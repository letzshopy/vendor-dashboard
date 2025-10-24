import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

// helper
async function listAttributes() {
  const { data } = await woo.get("/products/attributes", {
    params: { per_page: 100, orderby: "name", order: "asc" },
  });
  return data || [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Preset to ensure Color & Size exist
    if (body?.preset === "color-size") {
      const existing = await listAttributes();
      const need = ["Color", "Size"].filter(
        (n) => !existing.some((a: any) => a.name.toLowerCase() === n.toLowerCase())
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

    // Manual create
    const payload = {
      name: body.name,
      slug: body.slug || body.name?.toLowerCase().replace(/\s+/g, "-"),
      type: body.type || "select",
      order_by: "menu_order",
      has_archives: false,
    };
    const { data } = await woo.post("/products/attributes", payload);
    return NextResponse.json({ ok: true, attribute: data });
  } } catch (e: any) {
  const status = e?.response?.status || 500;
  const msg =
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Error";
  return NextResponse.json({ error: String(msg) }, { status });
}
}
