import { NextRequest, NextResponse } from "next/server";

/**
 * Placeholder IFSC lookup. Swap with razorpay IFSC, yesbank API, bankifsccode etc.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase() || "";
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "Invalid IFSC format" }, { status: 400 });
  }

  // Tiny demo map
  const db: Record<string, { bank: string; branch: string }> = {
    HDFC0000123: { bank: "HDFC Bank", branch: "Chennai - Adyar" },
    SBIN0000001: { bank: "State Bank of India", branch: "Mumbai Main" },
  };
  const r = db[code] ?? { bank: "Unknown Bank", branch: "Unknown Branch" };
  return NextResponse.json({ ok: true, code, ...r });
}
