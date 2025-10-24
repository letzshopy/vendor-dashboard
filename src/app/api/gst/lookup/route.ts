// src/app/api/gst/lookup/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const gstin = (searchParams.get("gstin") || "").toUpperCase().trim();

  // Very basic format check (not full validation)
  if (!gstin || gstin.length !== 15) {
    return NextResponse.json({ ok: false, error: "Invalid GSTIN" }, { status: 400 });
  }

  // TODO: call a real GST verification API here
  // Mocked response for dev:
  const stateCode = gstin.slice(0, 2);
  const statesMap: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", "19": "West Bengal",
    "27": "Maharashtra", "29": "Karnataka", "33": "Tamil Nadu", "36": "Telangana"
  };
  const state = statesMap[stateCode] || "Unknown";

  return NextResponse.json({
    ok: true,
    data: {
      legalName: "Sample Legal Name Pvt Ltd",
      tradeName: "Sample Trade Name",
      state,
    },
  });
}
