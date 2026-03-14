import { NextRequest, NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOKEN = process.env.LETZ_INTERNAL_TOKEN;

async function saveKyc(req: NextRequest) {
  if (!TOKEN) {
    return NextResponse.json(
      { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
      { status: 500 }
    );
  }

  const body = await req.json();
  const base = (await getWpBaseUrl()).replace(/\/$/, "");

  const wpRes = await fetch(`${base}/wp-json/letz/v1/kyc/save?_ts=${Date.now()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-letz-auth": TOKEN,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await wpRes.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {}

  if (!wpRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to save KYC", details: json || text },
      { status: wpRes.status || 500 }
    );
  }

  return NextResponse.json(json, { status: 200 });
}

export async function GET() {
  try {
    if (!TOKEN) {
      return NextResponse.json(
        { ok: false, error: "LETZ_INTERNAL_TOKEN missing" },
        { status: 500 }
      );
    }

    const base = (await getWpBaseUrl()).replace(/\/$/, "");

    const wpRes = await fetch(`${base}/wp-json/letz/v1/kyc?_ts=${Date.now()}`, {
      method: "GET",
      headers: {
        "x-letz-auth": TOKEN,
      },
      cache: "no-store",
    });

    const text = await wpRes.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!wpRes.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to fetch KYC", details: json || text },
        { status: wpRes.status || 500 }
      );
    }

    return NextResponse.json(json, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to load KYC" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return saveKyc(req);
}

export async function PATCH(req: NextRequest) {
  return saveKyc(req);
}