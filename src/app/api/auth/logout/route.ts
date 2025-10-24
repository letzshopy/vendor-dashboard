import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export async function POST() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}
