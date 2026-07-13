import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { fetchInternalWp } from "@/lib/wpClient";
import { verifySessionToken } from "@/lib/session";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

const UPSTREAM_TIMEOUT_MS = 15_000;

type JsonRecord = Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
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

    const wpResponse = await fetchInternalWp(
      "/wp-json/letz/v1/account/agreement/accept",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "v1.0",
          accepted_by_email: session.email,
          saas_role: session.saas_role,
        }),
      },
      UPSTREAM_TIMEOUT_MS
    );

    const responsePayload: unknown =
      await wpResponse
        .json()
        .catch(() => null);

    if (!wpResponse.ok) {
      console.error(
        `Agreement acceptance runtime request failed with status ${wpResponse.status}.`
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Could not accept agreement.",
        },
        {
          status:
            wpResponse.status >= 400 &&
            wpResponse.status < 500
              ? 400
              : 502,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      isRecord(responsePayload)
        ? responsePayload
        : { ok: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: unknown) {
    console.error(
      "Agreement accept error:",
      error instanceof Error
        ? error.message
        : "Unknown agreement error"
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Could not accept agreement.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
