import { NextResponse } from "next/server";

function authHeader() {
  const user = process.env.WP_USER!;
  const pass = process.env.WP_APP_PASSWORD!;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

export async function GET() {
  const WP_URL = process.env.WP_URL!;
  const r = await fetch(`${WP_URL}/wp-json/letz/v1/account-settings`, {
    cache: "no-store",
    headers: { Authorization: authHeader() },
  });

  const text = await r.text();
  return new NextResponse(text, {
    status: r.status,
    headers: { "content-type": "application/json" },
  });
}

export async function PUT(req: Request) {
  const WP_URL = process.env.WP_URL!;
  const body = await req.text();

  const r = await fetch(`${WP_URL}/wp-json/letz/v1/account-settings`, {
    method: "PUT",
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
