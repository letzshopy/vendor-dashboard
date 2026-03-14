import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

function authHeader() {
  const user = process.env.WP_USER!;
  const pass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function GET() {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const r = await fetch(`${base}/wp-json/letz/v1/subscription`, {
    cache: "no-store",
    headers: {
      Authorization: authHeader(),
    },
  });

  const data = await r.json();

  return NextResponse.json(data, {
    status: r.status,
  });
}

export async function PUT(req: Request) {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const body = await req.json();

  const r = await fetch(`${base}/wp-json/letz/v1/subscription`, {
    method: "PUT",
    headers: {
      Authorization: authHeader(),
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await r.json();

  return NextResponse.json(data, {
    status: r.status,
  });
}