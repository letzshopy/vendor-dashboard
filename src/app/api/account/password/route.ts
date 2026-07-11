import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  verifySessionToken,
} from "@/lib/session";
import {
  getWpBaseUrl,
  wpAuthHeader,
} from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ||
  "ls_vendor_auth";

const SESSION_SIGNING_SECRET =
  process.env.DASHBOARD_SECRET || "";

const MAX_REQUEST_BYTES = 4_096;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
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

function privateJson(
  body: JsonRecord,
  status: number
): NextResponse<JsonRecord> {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function validatePassword(
  value: unknown
): string | null {
  if (
    typeof value !== "string" ||
    value.length < MIN_PASSWORD_LENGTH ||
    value.length > MAX_PASSWORD_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  return value;
}

export async function POST(request: Request) {
  if (!SESSION_SIGNING_SECRET) {
    return privateJson(
      {
        error:
          "Password service is not configured.",
      },
      500
    );
  }

  const cookieStore = await cookies();
  const token =
    cookieStore.get(AUTH_COOKIE_NAME)
      ?.value || "";

  const session =
    await verifySessionToken(
      token,
      SESSION_SIGNING_SECRET
    );

  if (!session) {
    return privateJson(
      { error: "Authentication required." },
      401
    );
  }

  /*
   * Store owners may update only their own store login password.
   * Shared vendor-admin and master-admin identities are managed
   * centrally because they may span multiple stores.
   */
  if (session.saas_role !== "store_owner") {
    return privateJson(
      {
        error:
          "Password changes for this account are managed by LetzShopy support.",
      },
      403
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateJson(
      {
        error:
          "Invalid password update request.",
      },
      400
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson(
      {
        error:
          "Invalid password update request.",
      },
      400
    );
  }

  if (!isRecord(body)) {
    return privateJson(
      {
        error:
          "Invalid password update request.",
      },
      400
    );
  }

  const newPassword =
    validatePassword(body.new_password);

  if (!newPassword) {
    return privateJson(
      {
        error:
          "Password must be between 8 and 256 characters and must not contain control characters.",
      },
      400
    );
  }

  try {
    const base = (
      await getWpBaseUrl()
    ).replace(/\/$/, "");

    const response = await fetch(
      `${base}/wp-json/letz/v1/account/password`,
      {
        method: "POST",
        headers: {
  Accept: "application/json",
  ...wpAuthHeader(),
  "Content-Type":
    "application/json",
},
        body: JSON.stringify({
          new_password: newPassword,
          login_email: session.email,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(
          UPSTREAM_TIMEOUT_MS
        ),
      }
    );

    if (!response.ok) {
      console.error(
        `Password update runtime request failed with status ${response.status}.`
      );

      return privateJson(
        {
          error:
            "Password update failed.",
        },
        response.status >= 400 &&
          response.status < 500
          ? 400
          : 502
      );
    }

    return privateJson(
      { ok: true },
      200
    );
  } catch (error: unknown) {
    console.error(
      "Password update proxy failed:",
      error instanceof Error
        ? error.message
        : "Unknown password update error"
    );

    return privateJson(
      {
        error:
          "Password update failed.",
      },
      502
    );
  }
}