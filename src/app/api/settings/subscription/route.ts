import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

const NEXT_ROUTE_VERSION = "next-sub-debug-v1";

export async function GET() {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          next_route_version: NEXT_ROUTE_VERSION,
          error: "LETZ_INTERNAL_TOKEN missing",
        },
        { status: 500 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const target = `${base}/wp-json/letz/v1/subscription`;

    const r = await fetch(target, {
      cache: "no-store",
      headers: {
        "x-letz-auth": TOKEN,
      },
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(
      {
        next_route_version: NEXT_ROUTE_VERSION,
        wp_target: target,
        wp_status: r.status,
        wp_response: data,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        next_route_version: NEXT_ROUTE_VERSION,
        error: e?.message || "Subscription GET failed",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        {
          ok: false,
          next_route_version: NEXT_ROUTE_VERSION,
          error: "LETZ_INTERNAL_TOKEN missing",
        },
        { status: 500 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");
    const target = `${base}/wp-json/letz/v1/subscription`;
    const body = await req.json();

    const r = await fetch(target, {
      method: "PUT",
      headers: {
        "x-letz-auth": TOKEN,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(
      {
        next_route_version: NEXT_ROUTE_VERSION,
        wp_target: target,
        wp_status: r.status,
        wp_response: data,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        next_route_version: NEXT_ROUTE_VERSION,
        error: e?.message || "Subscription PUT failed",
      },
      { status: 500 }
    );
  }
}