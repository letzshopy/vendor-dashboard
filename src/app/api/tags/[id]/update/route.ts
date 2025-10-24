import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { data } = await woo.put(`/products/tags/${params.id}`, body);
    return NextResponse.json({ tag: data });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Update failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
