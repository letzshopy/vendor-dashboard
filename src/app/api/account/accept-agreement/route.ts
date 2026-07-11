import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { getWpBaseUrl } from "@/lib/wpClient";
import { verifySessionToken } from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

function authHeader() {
  const user = process.env.WP_USER;
  const pass = (
    process.env.WP_APP_PASSWORD || ""
  ).replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error(
      "Missing WP_USER or WP_APP_PASSWORD environment variables."
    );
  }

  return (
    "Basic " +
    Buffer.from(`${user}:${pass}`).toString("base64")
  );
}

export async function POST() {
  try {
    if (!SESSION_SIGNING_SECRET) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server authentication is not configured.",
        },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    const authToken =
      cookieStore.get(AUTH_COOKIE_NAME)?.value || "";

    const session = await verifySessionToken(
      authToken,
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

    if (session.saas_role !== "store_owner") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Only store owners can accept the Vendor Agreement.",
        },
        {
          status: 403,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const wpResponse = await fetch(
      `${base}/wp-json/letz/v1/account/agreement/accept`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader(),
          "Content-Type": "application/json",
          "X-Letz-Dashboard-Key":
            process.env.LETZ_DASHBOARD_API_KEY || "",
        },
        cache: "no-store",
        body: JSON.stringify({
          version: "v1.0",
          accepted_by_email: session.email,
          saas_role: session.saas_role,
        }),
      }
    );

    const responseText = await wpResponse.text();

    return new NextResponse(responseText, {
      status: wpResponse.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Agreement accept error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not accept agreement.",
      },
      { status: 500 }
    );
  }
}
