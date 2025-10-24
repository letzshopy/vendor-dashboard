import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No ids" }, { status: 400 });
    }
    const update = ids.map((id: number) => ({ id, images: [] as any[] }));
    await woo.post("/products/batch", { update });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data?.message || e?.message || "Failed" },
      { status: 500 }
    );
  }
}
