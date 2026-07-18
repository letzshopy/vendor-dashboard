import { NextResponse, type NextRequest } from "next/server";
import {
  findAuthorizedStore,
  verifySessionToken,
} from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const TENANT_COOKIE_NAME =
  process.env.TENANT_COOKIE_NAME || "ls_tenant";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

function parseTenantCookie(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(rawValue)
    );

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const signinUrl = new URL("/signin", req.url);

  if (!SESSION_SIGNING_SECRET) {
    return NextResponse.redirect(signinUrl, 302);
  }

  const rawToken =
    req.cookies.get(AUTH_COOKIE_NAME)?.value || "";

  const session = await verifySessionToken(
    rawToken,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    return NextResponse.redirect(signinUrl, 302);
  }

  if (session.saas_role === "master_admin") {
    return NextResponse.redirect(
      new URL("/master", req.url),
      302
    );
  }

  if (session.saas_role === "vendor_admin") {
    return NextResponse.redirect(
      new URL("/select-store", req.url),
      302
    );
  }

  const tenant = parseTenantCookie(
    req.cookies.get(TENANT_COOKIE_NAME)?.value
  );

  const authorizedStore = tenant
    ? findAuthorizedStore(session, {
        blog_id: tenant.blog_id,
        store_url: tenant.store_url,
      })
    : null;

  if (authorizedStore) {
    return NextResponse.redirect(
      new URL("/dashboard", req.url),
      302
    );
  }

  return NextResponse.redirect(
    new URL("/select-store", req.url),
    302
  );
}
