import {
  NextRequest,
  NextResponse,
} from "next/server";

import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

function requireInternalToken(): string {
  const token = process.env.LETZ_INTERNAL_TOKEN || "";

  if (!token) {
    throw new Error(
      "Missing LETZ_INTERNAL_TOKEN in dashboard env"
    );
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

async function getWpMenuBase(): Promise<string> {
  const base = await getWpBaseUrl();
  return base.replace(/\/$/, "");
}

export async function GET(req: NextRequest) {
  try {
    const base = await getWpMenuBase();
    const token = requireInternalToken();

    const { searchParams } = new URL(req.url);
    const query = new URLSearchParams();

    for (const key of [
      "location",
      "location_label",
      "menu_name",
      "menu_id",
    ]) {
      const value = searchParams.get(key);

      if (value !== null) {
        query.set(key, value);
      }
    }

    const suffix = query.toString();
    const url =
      `${base}/wp-json/letzshopy/v1/menu` +
      (suffix ? `?${suffix}` : "");

    const response = await fetch(url, {
      headers: {
        "X-Letz-Auth": token,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();
    const json = safeJson(text);

    if (!response.ok) {
      return NextResponse.json(
        {
          error: wpErrorMessage(
            json,
            text,
            "WP menu GET failed"
          ),
          details: json || text,
        },
        {
          status: response.status || 500,
        }
      );
    }

    return NextResponse.json(
      json || { items: [] },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Menu proxy GET error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const base = await getWpMenuBase();
    const token = requireInternalToken();
    const body = await req.json();

    const response = await fetch(
      `${base}/wp-json/letzshopy/v1/menu`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Letz-Auth": token,
          Accept: "application/json",
        },
        body: JSON.stringify(body),
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
            "WP menu POST failed"
          ),
          details: json || text,
        },
        {
          status: response.status || 500,
        }
      );
    }

    return NextResponse.json(
      json || { ok: true },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Menu proxy POST error",
      },
      { status: 500 }
    );
  }
}