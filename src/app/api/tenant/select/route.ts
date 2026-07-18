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

export async function POST(req: NextRequest) {
  if (!SESSION_SIGNING_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server authentication is not configured.",
      },
      { status: 500 }
    );
  }

  const rawToken =
    req.cookies.get(AUTH_COOKIE_NAME)?.value || "";

  const session = await verifySessionToken(
    rawToken,
    SESSION_SIGNING_SECRET
  );

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid or expired session.",
      },
      { status: 401 }
    );
  }

  const body: unknown = await req.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid store selection.",
      },
      { status: 400 }
    );
  }

  const candidate = body as Record<string, unknown>;

  const authorizedStore = findAuthorizedStore(
    session,
    {
      blog_id: candidate.blog_id,
      store_url: candidate.store_url,
    }
  );

  if (!authorizedStore) {
    return NextResponse.json(
      {
        ok: false,
        error: "You are not authorized to access this store.",
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    store: authorizedStore,
  });

  response.cookies.set(
    TENANT_COOKIE_NAME,
    encodeURIComponent(
      JSON.stringify({
        blog_id: authorizedStore.blog_id,
        store_name: authorizedStore.store_name,
        store_url: authorizedStore.store_url,
      })
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    }
  );

  return response;
}
