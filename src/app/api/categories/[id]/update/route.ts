import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { data } = await woo.put(`/products/categories/${params.id}`, body);
    return NextResponse.json({ category: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data?.message || e?.message || "Update failed" }, { status: 500 });
  }
}
