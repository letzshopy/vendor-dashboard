import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

export async function GET(req: Request) {
  if (!SESSION_SIGNING_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "Server authentication is not configured.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const cookieHeader = req.headers.get("cookie") || "";

  const authMatch = cookieHeader.match(
    new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`)
  );

  const rawToken = authMatch?.[1] || "";

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
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      email: session.email,
      saas_role: session.saas_role,
      stores: session.stores,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
