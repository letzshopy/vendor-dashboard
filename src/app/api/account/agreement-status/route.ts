import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Missing WP_USER or WP_APP_PASSWORD environment variables.");
  }

  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function GET() {
  try {
    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const wpRes = await fetch(`${base}/wp-json/letz/v1/account/agreement/status`, {
      method: "GET",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

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
      { ok: false, error: error?.message || "Failed to load agreement status." },
      { status: 500 }
    );
  }
}