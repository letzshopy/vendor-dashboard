import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { getWpBaseUrl } from "@/lib/wpClient";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ls_vendor_auth";
const ROLE_COOKIE_NAME = "ls_role";
const DASHBOARD_SECRET = process.env.DASHBOARD_SECRET || "";

function b64urlToBuffer(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLen), "base64");
}

function verifySignedToken(token: string, secret: string) {
  try {
    const [body, sig] = token.split(".");
    if (!body || !sig || !secret) return null;

    const expected = crypto.createHmac("sha256", secret).update(body).digest();
    const actual = b64urlToBuffer(sig);

    if (expected.length !== actual.length) return null;
    if (!crypto.timingSafeEqual(expected, actual)) return null;

    const json = JSON.parse(b64urlToBuffer(body).toString("utf8"));
    return json;
  } catch {
    return null;
  }
}

function authHeader() {
  const user = process.env.WP_USER;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Missing WP_USER or WP_APP_PASSWORD environment variables.");
  }

  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get(ROLE_COOKIE_NAME)?.value || "";

    if (role !== "store_owner") {
      return NextResponse.json(
        { ok: false, error: "Only store owners can accept the Vendor Agreement." },
        { status: 403 }
      );
    }

    const authToken = cookieStore.get(AUTH_COOKIE_NAME)?.value || "";
    const session = verifySignedToken(authToken, DASHBOARD_SECRET);

    const acceptedByEmail =
      typeof session?.email === "string" ? session.email.trim() : "";

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const wpRes = await fetch(`${base}/wp-json/letz/v1/account/agreement/accept`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        version: "v1.0",
        accepted_by_email: acceptedByEmail,
        saas_role: role,
      }),
    });

    const text = await wpRes.text();

    return new NextResponse(text, {
      status: wpRes.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Agreement accept error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Could not accept agreement." },
      { status: 500 }
    );
  }
}