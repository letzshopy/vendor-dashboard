// src/app/api/bank/ifsc/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = (searchParams.get("code") || "").toUpperCase().trim();

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
    return NextResponse.json({ ok: false, error: "Invalid IFSC format" }, { status: 400 });
  }

  // TODO: call RBI/IFSC API (e.g. Razorpay IFSC) for real data
  // Mocked for dev:
  return NextResponse.json({
    ok: true,
    data: {
      bankName: "HDFC Bank",
      branch: "Chennai - Adyar",
      // Note: account holder name CANNOT be obtained from IFSC; keep as user-entered.
    },
  });
}
