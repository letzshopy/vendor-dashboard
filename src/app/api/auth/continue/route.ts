import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const ROLE_COOKIE_NAME = "ls_role";
const TENANT_COOKIE_NAME = process.env.TENANT_COOKIE_NAME || "ls_tenant";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";

  const authMatch = cookieHeader.match(
    new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`)
  );
  const roleMatch = cookieHeader.match(
    new RegExp(`${ROLE_COOKIE_NAME}=([^;]+)`)
  );
  const tenantMatch = cookieHeader.match(
    new RegExp(`${TENANT_COOKIE_NAME}=([^;]+)`)
  );

  const authToken = authMatch?.[1] || "";
  const role = decodeURIComponent(roleMatch?.[1] || "");
  const tenant = tenantMatch?.[1] || "";

  // not logged in
  if (!authToken || authToken.length < 10) {
    return NextResponse.redirect(new URL("/signin", req.url), 302);
  }

  if (role === "master_admin") {
    return NextResponse.redirect(new URL("/master", req.url), 302);
  }

  if (role === "vendor_admin") {
    return NextResponse.redirect(new URL("/select-store", req.url), 302);
  }

  if (role === "store_owner") {
    // if tenant cookie exists, go directly to dashboard
    if (tenant) {
      return NextResponse.redirect(new URL("/dashboard", req.url), 302);
    }

    // if somehow no tenant cookie, let them choose
    return NextResponse.redirect(new URL("/select-store", req.url), 302);
  }

  return NextResponse.redirect(new URL("/signin", req.url), 302);
}