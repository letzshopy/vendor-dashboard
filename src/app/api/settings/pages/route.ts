import { NextResponse } from "next/server";
import { deepPatchSettings, getSettings } from "@/lib/settingsStore";

export async function GET() {
  return NextResponse.json(getSettings().setupSite);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  deepPatchSettings({ setupSite: body });
  return NextResponse.json({ ok: true });
}