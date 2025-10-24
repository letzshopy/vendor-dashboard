import { NextResponse } from "next/server";
import { deepPatchSettings, getSettings } from "@/lib/settingsStore";

export async function GET() {
  return NextResponse.json(getSettings().pages);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  deepPatchSettings({ pages: body });
  return NextResponse.json({ ok: true });
}
