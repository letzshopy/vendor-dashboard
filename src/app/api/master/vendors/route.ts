// src/app/api/master/vendors/route.ts
import { NextResponse } from "next/server";

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
    const siteUrl = process.env.SITE_URL;
    const wpUser = process.env.WP_USER;
    const wpPass = process.env.WP_APP_PASSWORD;

    if (!siteUrl || !wpUser || !wpPass) {
      return NextResponse.json(
        { error: "Missing SITE_URL / WP_USER / WP_APP_PASSWORD env vars" },
        { status: 500 }
      );
    }

    const apiUrl = `${siteUrl.replace(/\/$/, "")}/wp-json/letz/v1/master-vendors`;

    const auth = Buffer.from(`${wpUser}:${wpPass}`).toString("base64");

    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      // Always live data
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "WP API error", status: res.status, body: text },
        { status: 500 }
      );
    }

    const data = (await res.json()) as VendorsResponse;

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
