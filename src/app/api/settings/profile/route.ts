// src/app/api/settings/profile/route.ts
import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER!;
  // WP app passwords may contain spaces in UI — strip them
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function GET() {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const r = await fetch(`${base}/wp-json/letz/v1/profile-settings`, {
    cache: "no-store",
    headers: { Authorization: authHeader() },
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PATCH(req: Request) {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");
  const body = await req.text();

  const r = await fetch(`${base}/wp-json/letz/v1/profile-settings`, {
    method: "PATCH",
    headers: {
      Authorization: authHeader(),
      "content-type": "application/json",
    },
    body,
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}