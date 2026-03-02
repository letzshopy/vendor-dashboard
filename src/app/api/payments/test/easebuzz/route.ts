import { NextResponse } from "next/server";

/**
 * We simulate a credential sanity check:
 * - key and salt present => ok
 * (You can later call a tiny Easebuzz ping if they expose one.)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!body?.key || !body?.salt) {
      return NextResponse.json({ ok: false, error: "Missing key/salt" }, { status: 400 });
    }
    // Optionally validate format / length here.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Test failed" }, { status: 500 });
  }
}
