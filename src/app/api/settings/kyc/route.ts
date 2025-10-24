// src/app/api/settings/kyc/route.ts
import { NextResponse } from "next/server";
import { deepPatchSettings, getSettings } from "@/lib/settingsStore";

export async function GET() {
  return NextResponse.json(getSettings().kyc);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const updated = deepPatchSettings("kyc", body);
  // TODO: persist to DB; optional webhook/notification to internal review queue
  return NextResponse.json(updated.kyc);
}
