import { NextResponse } from "next/server";

// Simple: return a fixed rate from env or 0. (If you have Woo tax settings,
// you can wire them here later.)
export async function GET() {
  const rate = Number(process.env.NEXT_PUBLIC_DEFAULT_TAX_RATE || 0);
  return NextResponse.json({ rate });
}
