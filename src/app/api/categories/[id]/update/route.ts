// src/app/api/categories/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";


export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const woo = await getWooClient();
    const { id } = await params;

    // Validate ID
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
    }

    // Force delete = permanently delete the term
    const { data } = await woo.delete(`/products/categories/${numericId}`, {
      params: { force: true },
    });

    return NextResponse.json({
      ok: true,
      deleted: data?.id ?? numericId,
    });
  } catch (e: unknown) {
    const err = e as any;
    const status = err?.response?.status || 500;
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      "Delete failed";

    return NextResponse.json({ error: String(msg) }, { status });
  }
}
