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

export async function POST(req: Request) {
  try {
    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const body = await req.text();

    const wpRes = await fetch(`${base}/wp-json/letz/v1/account/password`, {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body,
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
    console.error("Password proxy error:", error);
    return NextResponse.json(
      { error: error?.message || "Password update failed" },
      { status: 500 }
    );
  }
}