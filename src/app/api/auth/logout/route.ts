// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0, // delete
  });

  return res;
}
