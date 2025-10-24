// src/app/api/settings/profile/route.ts
import { NextResponse } from "next/server";
import { deepPatchSettings, getSettings } from "@/lib/settingsStore"; // <-- FIXED

export async function GET() {
  return NextResponse.json(getSettings().profile);
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const updated = deepPatchSettings("profile", body);
  // TODO: push to WP/Woo (logo, address, WhatsApp plugin)
  return NextResponse.json(updated.profile);
}
