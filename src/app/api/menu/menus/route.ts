import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireInternalToken(): string {
  const token = process.env.LETZ_INTERNAL_TOKEN || "";

  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }

  return token;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function wpErrorMessage(
  json: any,
  text: string,
  fallback: string
): string {
  return (
    json?.error ||
    json?.message ||
    json?.data?.message ||
    text ||
    fallback
  );
}

export async function GET() {
  try {
    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const token = requireInternalToken();

    const response = await fetch(
      `${base}/wp-json/letzshopy/v1/menus`,
      {
        headers: {
          "X-Letz-Auth": token,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await response.text();
    const json = safeJson(text);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: wpErrorMessage(
            json,
            text,
            "WP menus failed"
          ),
          details: json || text,
        },
        {
          status: response.status || 500,
        }
      );
    }

    return NextResponse.json(
      json || { menus: [] },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Menu list proxy error",
      },
      { status: 500 }
    );
  }
}