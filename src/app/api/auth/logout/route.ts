import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "ls_tenant";

const LEGACY_ROLE_COOKIE_NAME = "ls_role";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  for (const name of [
    AUTH_COOKIE_NAME,
    TENANT_COOKIE_NAME,
    LEGACY_ROLE_COOKIE_NAME,
  ]) {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });
  }

  return response;
}
