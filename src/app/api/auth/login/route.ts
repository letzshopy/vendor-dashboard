import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const SECRET = process.env.DASHBOARD_SECRET || "";

export async function POST(req: Request) {
  const { secret, next } = await req.json();
  if (!secret || secret !== SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const store = cookies();
  store.set(COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,          // stays true; in localhost it’s fine
    path: "/",
    maxAge: 60 * 60 * 8,   // 8 hours
  });
  return NextResponse.json({ ok: true, next: next || "/orders" });
}
