// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 👀 Debug log – you should see this in the terminal for every page hit
  console.log("[middleware] path =", pathname);

  // Allow the sign-in page itself
  if (pathname === "/signin") {
    return NextResponse.next();
  }

  // Read cookie
  const token = req.cookies.get(COOKIE_NAME)?.value;

  // If logged in → allow
  if (token === "ok") {
    return NextResponse.next();
  }

  // Otherwise redirect to /signin
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/signin";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// ✅ Let middleware run on *all* paths except API/_next/static and a few files
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
