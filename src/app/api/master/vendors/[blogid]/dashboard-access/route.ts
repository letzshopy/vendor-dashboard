// src/app/api/master/vendors/[blogid]/dashboard-access/route.ts
import { NextResponse } from "next/server";
import { getMasterWpBaseUrl } from "@/lib/wpClient";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ blogid: string }> }
) {
  try {
    const { blogid } = await params;
    const body = await req.json().catch(() => ({}));

    const key = process.env.MASTER_API_KEY || "";
    const base = getMasterWpBaseUrl().replace(/\/$/, "");

    const res = await fetch(
      `${base}/wp-json/letz/v1/master-vendors/${blogid}/dashboard-access`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "X-Letz-Master-Key": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locked: !!body?.locked,
        }),
        cache: "no-store",
      }
    );

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {}

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.message || text || "Failed to update dashboard access" },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json || { ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}