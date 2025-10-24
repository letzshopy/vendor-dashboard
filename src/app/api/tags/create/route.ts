import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data } = await woo.post("/products/tags", body);
    return NextResponse.json({ tag: data });
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Create failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
