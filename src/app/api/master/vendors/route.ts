// src/app/api/master/vendors/route.ts
import { NextResponse } from "next/server";
import { getMasterWpBaseUrl } from "@/lib/wpClient";

type RawVendor = {
  blog_id: number;
  store_name: string;
  store_url: string;
  owner_email: string;
  plan: string;
  status: string;
  billing_state: string;
};

type VendorsResponse = {
  vendors: RawVendor[];
};

export async function GET() {
  try {
    // MASTER-only base URL (never tenant cookie)
    const base = (await getMasterWpBaseUrl()).replace(/\/$/, "");

    const wpUser = process.env.WP_USER;
    // WP shows app passwords with spaces – safe to remove them for Basic auth
    const wpPass = (process.env.WP_APP_PASSWORD || "").replace(/\s+/g, "");

    if (!base || !wpUser || !wpPass) {
      return NextResponse.json(
        { error: "Missing MASTER_WP_URL / WP_USER / WP_APP_PASSWORD env vars" },
        { status: 500 }
      );
    }

    const apiUrl = `${base}/wp-json/letz/v1/master-vendors`;
    const auth = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ignore non-JSON
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: json?.message || "WP API error",
          status: res.status,
          body: json || text,
        },
        { status: res.status || 500 }
      );
    }

    const data = (json as VendorsResponse) || ({} as VendorsResponse);
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}