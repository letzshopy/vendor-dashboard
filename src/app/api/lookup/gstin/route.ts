import { NextRequest, NextResponse } from "next/server";

/**
 * NOTE: This is a minimal placeholder.
 * Replace with a real GSTIN lookup (ClearTax, Masters India, Govt. APIs, etc.).
 */
export async function GET(req: NextRequest) {
  const gstin = req.nextUrl.searchParams.get("gstin")?.toUpperCase() || "";
  // Very naive validation
  const ok = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);

  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid GSTIN format" }, { status: 400 });
  }

  // Demo data map; swap with real provider
  const demo = {
    legalName: "Sample Legal Name Pvt Ltd",
    tradeName: "Sample Trade",
    state: "TS",
  };

  return NextResponse.json({ ok: true, gstin, ...demo });
}
