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

function relativeRedirect(
  location: string
): NextResponse {
  return new NextResponse(
    null,
    {
      status: 302,
      headers: {
        Location:
          location,
      },
    }
  );
}

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
  if (!SESSION_SIGNING_SECRET) {
    return relativeRedirect(
      "/signin"
    );
  }

  const rawToken =
    req.cookies.get(AUTH_COOKIE_NAME)?.value || "";

  const session = await verifySessionToken(
    rawToken,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    return relativeRedirect(
      "/signin"
    );
  }

  if (session.saas_role === "master_admin") {
    return relativeRedirect(
      "/master"
    );
  }

  if (session.saas_role === "vendor_admin") {
    return relativeRedirect(
      "/select-store"
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
    return relativeRedirect(
      "/dashboard"
    );
  }

  return relativeRedirect(
    "/select-store"
  );
}
