import { NextResponse } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

function decodeToken(token: string) {
  try {
    const [body] = token.split(".");
    if (!body) return null;

    // base64url -> base64
    const b64 = body.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((body.length + 3) % 4);
    const json = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${COOKIE}=([^;]+)`));
  const token = m?.[1] || "";

  if (!token) return NextResponse.json({ ok: false, error: "Not logged in" }, { status: 401 });

  const payload = decodeToken(token);
  if (!payload) return NextResponse.json({ ok: false, error: "Bad session" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    email: payload.email,
    saas_role: payload.saas_role,
    stores: payload.stores || [],
  });
}