// src/app/api/settings/shipment-fulfillment/route.ts
import { NextResponse } from "next/server";
import { getWpBaseUrl } from "@/lib/wpClient";

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

function safeAppPass(pass?: string) {
  return (pass || "").replace(/\s+/g, "");
}

async function wpAuth() {
  const base = (await getWpBaseUrl()).replace(/\/$/, "");
  const user = process.env.WP_USER;
  const appPass = safeAppPass(process.env.WP_APP_PASSWORD);

  if (!base || !user || !appPass) {
    throw new Error("Tenant base URL / WP_USER / WP_APP_PASSWORD missing");
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
    const { base, headers } = await wpAuth();

    const res = await fetch(`${base}/wp-json/letz/v1/shipment-fulfillment`, {
      headers,
      cache: "no-store",
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.message || "Failed to load shipment fulfillment settings", details: json || text },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json as ShipmentFulfillmentSettings);
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
    const { base, headers } = await wpAuth();

    // Keep method as POST if your WP route expects POST for updates.
    // If your WP endpoint is truly PUT, change method to "PUT".
    const res = await fetch(`${base}/wp-json/letz/v1/shipment-fulfillment`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: json?.message || "Failed to save shipment fulfillment settings", details: json || text },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json as ShipmentFulfillmentSettings);
  } catch (err: any) {
    console.error("PUT shipment-fulfillment error:", err?.message || err);
    return NextResponse.json(
      { error: "Failed to save shipment fulfillment settings" },
      { status: 500 }
    );
  }
}