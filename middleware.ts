import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const ROLE_COOKIE = "ls_role";
const TENANT_COOKIE = process.env.TENANT_COOKIE_NAME || "ls_tenant";

function isPublic(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/signin")
  );
}

function isMasterPath(pathname: string) {
  return pathname === "/master" || pathname.startsWith("/master/");
}

function isAlwaysAllowedAfterLogin(pathname: string) {
  return (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/select-store")
  );
}

function parseTenantCookie(raw: string | undefined) {
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}

async function getLockedFromMaster(req: NextRequest): Promise<boolean> {
  try {
    const tenantRaw = req.cookies.get(TENANT_COOKIE)?.value;
    const tenant = parseTenantCookie(tenantRaw);
    const blogId = Number(tenant?.blog_id || 0);

    if (!blogId) return false;

    const base = (process.env.MASTER_WP_URL || "").replace(/\/$/, "");
    const key = process.env.MASTER_API_KEY || "";

    if (!base || !key) return false;

    const res = await fetch(`${base}/wp-json/letz/v1/master-vendors/${blogId}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        "X-Letz-Master-Key": key,
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {}

    return !!json?.dashboard_access?.locked;
  } catch {
    return false;
  }
}

type OnboardingStatusResponse = {
  ok?: boolean;
  kyc_status?: "not_started" | "in_review" | "approved" | "rejected";
  subscription_status?:
    | "inactive"
    | "payment_submitted"
    | "active"
    | "suspended"
    | "expired";
};

async function getOnboardingStatus(
  req: NextRequest
): Promise<OnboardingStatusResponse | null> {
  try {
    const statusUrl = req.nextUrl.clone();
    statusUrl.pathname = "/api/onboarding/status";
    statusUrl.search = "";

    const r = await fetch(statusUrl.toString(), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (!r.ok) {
      return null;
    }

    const data = (await r.json().catch(() => ({}))) as OnboardingStatusResponse;
    return data || null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const authToken = req.cookies.get(AUTH_COOKIE)?.value;
  const role = req.cookies.get(ROLE_COOKIE)?.value || "";

  if (!authToken || authToken.length < 10) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isMasterPath(pathname)) {
    if (role === "master_admin") {
      return NextResponse.next();
    }

    const url = req.nextUrl.clone();
    url.pathname = "/orders";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isAlwaysAllowedAfterLogin(pathname)) {
    return NextResponse.next();
  }

  if (role === "master_admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/master";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 1) Manual master lock is the primary gate for new vendors
  const locked = await getLockedFromMaster(req);

  if (locked) {
    const url = req.nextUrl.clone();
    url.pathname = "/settings";
    url.search = "?tab=account";
    return NextResponse.redirect(url);
  }

  // 2) Automatic onboarding/subscription gate:
  // Allow dashboard for inactive / payment_submitted / active / suspended.
  // Block only when subscription is EXPIRED.
  const status = await getOnboardingStatus(req);

  if (status?.subscription_status === "expired") {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 3) Fail open:
  // If onboarding API fails or status is unavailable, do NOT block dashboard.
  // Manual lock remains the source of truth for first-stage access.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};