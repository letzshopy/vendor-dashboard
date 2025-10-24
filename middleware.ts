import { NextResponse, type NextRequest } from "next/server";

const COOKIE = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow ALL API routes and static assets
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // Allow signin page
  if (pathname.startsWith("/signin")) return NextResponse.next();

  // Gate everything else
  const token = req.cookies.get(COOKIE)?.value;
  if (token === "ok") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/signin";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
