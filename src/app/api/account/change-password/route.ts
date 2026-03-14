// src/app/api/account/change-password/route.ts
import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER!;
  // app passwords can contain spaces in WP UI; strip for safety
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function POST(req: Request) {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");
  const body = await req.text();

  const r = await fetch(`${base}/wp-json/letz/v1/account/password`, {
    method: "POST",
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