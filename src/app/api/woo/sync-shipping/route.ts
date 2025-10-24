// src/app/api/woo/sync-shipping/route.ts
import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settingsStore";

export async function POST() {
  const cfg = getSettings().shipping;

  // Here you’d call your Woo/WordPress plugin endpoint. Example:
  // await fetch(WP_URL+"/wp-json/letzship/v1/sync-shipping", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  //   body: JSON.stringify({ methodTitle: "Shipping Charge", config: cfg }),
  // });

  return NextResponse.json({
    ok: true,
    methodTitle: "Shipping Charge",
    configPushed: cfg,
  });
}
