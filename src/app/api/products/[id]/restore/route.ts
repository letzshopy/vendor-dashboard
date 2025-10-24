import { NextRequest, NextResponse } from "next/server";
import { woo } from "@/lib/woo";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Restoring from trash: set a non-trash status (draft is safe)
    const { data } = await woo.put(`/products/${params.id}`, { status: "draft" });
    return NextResponse.json({ restored: data?.id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.response?.data?.message || "Restore failed" },
      { status: e?.response?.status || 500 }
    );
  }
}
