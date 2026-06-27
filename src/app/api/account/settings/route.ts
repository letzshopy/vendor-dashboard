import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER!;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

function wpHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: authHeader(),
    "X-Letz-Dashboard-Key": process.env.LETZ_DASHBOARD_API_KEY || "",
    ...extra,
  };
}

export async function GET() {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const r = await fetch(`${base}/wp-json/letz/v1/account-settings`, {
    cache: "no-store",
    headers: wpHeaders(),
  });

  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PUT(req: Request) {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");
  const body = await req.text();

  const r = await fetch(`${base}/wp-json/letz/v1/account-settings`, {
    method: "PUT",
    headers: wpHeaders({
      "content-type": "application/json",
    }),
    body,
  });

  const text = await r.text();

  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}