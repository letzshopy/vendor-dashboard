import { NextResponse, type NextRequest } from "next/server";
import {
  findAuthorizedStore,
  type SessionPayload,
  type SessionStore,
  verifySessionToken,
} from "@/lib/session";

const AUTH_COOKIE =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const TENANT_COOKIE =
  process.env.TENANT_COOKIE_NAME || "ls_tenant";

const LEGACY_ROLE_COOKIE = "ls_role";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/signin",
  "/reset-password",
  "/vendor-agreement",
]);

const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/logout",
  "/api/payments/webhook/easebuzz",
  "/api/ping",
]);

const SESSION_ONLY_API_PATHS = new Set([
  "/api/auth/me",
  "/api/auth/continue",
  "/api/tenant/select",
]);

type JsonRecord = Record<string, unknown>;

type OnboardingStatusResponse = {
  ok?: boolean;
  kyc_status?:
    | "not_started"
    | "in_review"
    | "approved"
    | "rejected";
  subscription_status?:
    | "trial"
    | "inactive"
    | "pending_payment"
    | "payment_submitted"
    | "active"
    | "suspended"
    | "expired";
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function isStaticPath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon-precomposed.png"
  );
}

function isMasterPage(pathname: string) {
  return (
    pathname === "/master" ||
    pathname.startsWith("/master/")
  );
}

function isMasterApi(pathname: string) {
  return (
    pathname === "/api/master" ||
    pathname.startsWith("/api/master/")
  );
}

function isAlwaysAllowedAfterLogin(pathname: string) {
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/billing/subscription" ||
    pathname.startsWith("/billing/subscription/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/") ||
    pathname === "/vendor-agreement/accept"
  );
}

function parseTenantCookie(
  rawValue: string | undefined
): JsonRecord | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(rawValue)
    );

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getAuthorizedTenant(
  req: NextRequest,
  session: SessionPayload
): SessionStore | null {
  const tenant = parseTenantCookie(
    req.cookies.get(TENANT_COOKIE)?.value
  );

  if (!tenant) {
    return null;
  }

  return findAuthorizedStore(session, {
    blog_id: tenant.blog_id,
    store_url: tenant.store_url,
  });
}

function expireSessionCookies(response: NextResponse) {
  for (const name of [
    AUTH_COOKIE,
    TENANT_COOKIE,
    LEGACY_ROLE_COOKIE,
  ]) {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

function clearTenantCookie(response: NextResponse) {
  response.cookies.set({
    name: TENANT_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });

  return response;
}

function redirectToSignin(req: NextRequest) {
  const url = req.nextUrl.clone();

  url.pathname = "/signin";
  url.search = "";
  url.searchParams.set(
    "next",
    `${req.nextUrl.pathname}${req.nextUrl.search}`
  );

  return expireSessionCookies(
    NextResponse.redirect(url)
  );
}

function unauthorizedApi() {
  return expireSessionCookies(
    NextResponse.json(
      {
        ok: false,
        error: "Invalid or expired session.",
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  );
}

function forbiddenApi(message: string) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

async function getLockedFromMaster(
  blogId: number
): Promise<boolean> {
  try {
    const base = (
      process.env.MASTER_WP_URL || ""
    ).replace(/\/$/, "");

    const key = process.env.MASTER_API_KEY || "";

    if (!base || !key || !blogId) {
      return false;
    }

    const response = await fetch(
      `${base}/wp-json/letz/v1/master-vendors/${blogId}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Letz-Master-Key": key,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return false;
    }

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return false;
    }

    const dashboardAccess = parsed.dashboard_access;

    return (
      isRecord(dashboardAccess) &&
      dashboardAccess.locked === true
    );
  } catch {
    return false;
  }
}

async function getOnboardingStatus(
  req: NextRequest
): Promise<OnboardingStatusResponse | null> {
  try {
    const statusUrl = req.nextUrl.clone();

    statusUrl.pathname = "/api/onboarding/status";
    statusUrl.search = "";

    const response = await fetch(
      statusUrl.toString(),
      {
        headers: {
          cookie: req.headers.get("cookie") || "",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const parsed: unknown = await response
      .json()
      .catch(() => null);

    if (!isRecord(parsed)) {
      return null;
    }

    return parsed as OnboardingStatusResponse;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const apiRequest = isApiPath(pathname);

  if (
    isStaticPath(pathname) ||
    PUBLIC_PAGE_PATHS.has(pathname) ||
    PUBLIC_API_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  if (!SESSION_SIGNING_SECRET) {
    if (apiRequest) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server authentication is not configured.",
        },
        { status: 500 }
      );
    }

    return new NextResponse(
      "Server authentication is not configured.",
      { status: 500 }
    );
  }

  const rawToken =
    req.cookies.get(AUTH_COOKIE)?.value || "";

  const session = await verifySessionToken(
    rawToken,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    return apiRequest
      ? unauthorizedApi()
      : redirectToSignin(req);
  }

  if (apiRequest) {
    if (isMasterApi(pathname)) {
      if (session.saas_role !== "master_admin") {
        return forbiddenApi(
          "Master administrator access is required."
        );
      }

      return NextResponse.next();
    }

    if (
      pathname === "/api/tenant/select" &&
      session.saas_role === "master_admin"
    ) {
      return forbiddenApi(
        "Master administrators cannot select a vendor tenant."
      );
    }

    if (SESSION_ONLY_API_PATHS.has(pathname)) {
      return NextResponse.next();
    }

    if (session.saas_role === "master_admin") {
      return forbiddenApi(
        "This endpoint requires a vendor session."
      );
    }

    const authorizedTenant = getAuthorizedTenant(
      req,
      session
    );

    if (!authorizedTenant) {
      return forbiddenApi(
        "No authorized store is selected."
      );
    }

    return NextResponse.next();
  }

  if (isMasterPage(pathname)) {
    if (session.saas_role === "master_admin") {
      return NextResponse.next();
    }

    const authorizedTenant = getAuthorizedTenant(
      req,
      session
    );

    return NextResponse.redirect(
      new URL(
        authorizedTenant
          ? "/dashboard"
          : "/select-store",
        req.url
      )
    );
  }

  if (session.saas_role === "master_admin") {
    return NextResponse.redirect(
      new URL("/master", req.url)
    );
  }

  if (pathname === "/select-store") {
    return NextResponse.next();
  }

  const authorizedTenant = getAuthorizedTenant(
    req,
    session
  );

  if (!authorizedTenant) {
    return clearTenantCookie(
      NextResponse.redirect(
        new URL("/select-store", req.url)
      )
    );
  }

  if (isAlwaysAllowedAfterLogin(pathname)) {
    return NextResponse.next();
  }

  const locked = await getLockedFromMaster(
    authorizedTenant.blog_id
  );

  if (locked) {
    return NextResponse.redirect(
      new URL("/billing/subscription", req.url)
    );
  }

  const status = await getOnboardingStatus(req);

  if (status?.subscription_status === "expired") {
    const url = new URL("/onboarding", req.url);

    url.searchParams.set(
      "next",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|apple-touch-icon.png|apple-touch-icon-precomposed.png|icons/).*)",
  ],
};
