import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const productId = params.id;
    const variations: any[] = Array.isArray(body.variations) ? body.variations : [];

    const created: any[] = [];
    for (const v of variations) {
      const payload: any = {
        sku: v.sku || undefined,
        regular_price: v.regular_price || undefined,
        sale_price: v.sale_price || undefined,
        manage_stock: !!v.manage_stock,
        stock_quantity:
          v.manage_stock && Number.isFinite(Number(v.stock_quantity))
            ? Number(v.stock_quantity)
            : undefined,
        backorders: v.backorders || "no",
        attributes: (v.attributes || []).map((a: any) => ({
          id: a.id ?? undefined,
          name: a.name ?? undefined,
          option: String(a.option),
        })),
      };
      const { data } = await woo.post(`/products/${productId}/variations`, payload);
      created.push(data);
    }

    return NextResponse.json({ ok: true, created });
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
