import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER!;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function wpHeaders() {
  return {
    Authorization: authHeader(),
    "Content-Type": "application/json",
    "X-Letz-Dashboard-Key": process.env.LETZ_DASHBOARD_API_KEY || "",
  };
}

export async function GET() {
  try {
    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const wpRes = await fetch(
      `${base}/wp-json/letz/v1/account/agreement/status`,
      {
        method: "GET",
        headers: wpHeaders(),
        cache: "no-store",
      }
    );

    const text = await wpRes.text();

    return new NextResponse(text, {
      status: wpRes.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Agreement status proxy error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to load agreement status.",
      },
      { status: 500 }
    );
  }
}