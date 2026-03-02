// src/app/api/settings/shipment-fulfillment/route.ts
import { NextResponse } from "next/server";

type ShipmentFulfillmentSettings = {
  mode: "shift" | "self";
  pickup: {
    name: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
  };
};

function wpAuthHeader() {
  const base = process.env.WP_URL;
  const user = process.env.WP_USER;
  const appPass = process.env.WP_APP_PASSWORD;

  if (!base || !user || !appPass) {
    throw new Error("WP_URL, WP_USER or WP_APP_PASSWORD env missing");
  }

  const auth = Buffer.from(`${user}:${appPass}`).toString("base64");
  return {
    base,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
  };
}

export async function GET() {
  try {
    const { base, headers } = wpAuthHeader();
    const res = await fetch(`${base}/wp-json/letz/v1/shipment-fulfillment`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data = (await res.json()) as ShipmentFulfillmentSettings;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("GET shipment-fulfillment error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to load shipment fulfillment settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as ShipmentFulfillmentSettings;
    const { base, headers } = wpAuthHeader();
    const res = await fetch(`${base}/wp-json/letz/v1/shipment-fulfillment`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    const data = (await res.json()) as ShipmentFulfillmentSettings;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("PUT shipment-fulfillment error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to save shipment fulfillment settings" },
      { status: 500 }
    );
  }
}
