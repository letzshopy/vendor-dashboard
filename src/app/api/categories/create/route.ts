import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const body = await req.json();
    const { data } = await woo.post("/products/categories", body);
    return NextResponse.json({ category: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.response?.data?.message || e?.message || "Create failed" }, { status: 500 });
  }
}
