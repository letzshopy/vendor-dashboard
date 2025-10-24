// src/app/api/settings/general/route.ts
import { NextResponse } from "next/server";
import { deepPatchSettings, getSettings } from "@/lib/settingsStore";
import { syncWooGeneralProducts } from "@/lib/wooSync";

export async function GET() {
  const { general } = getSettings();
  return NextResponse.json({ products: general.products });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const incoming = body?.products ?? {};

  const err: Record<string, string> = {};
  if (incoming.priceDecimals != null && (incoming.priceDecimals < 0 || incoming.priceDecimals > 4))
    err.priceDecimals = "Must be between 0 and 4";
  if (incoming.lowStockThreshold != null && incoming.lowStockThreshold < 0)
    err.lowStockThreshold = "Must be ≥ 0";
  if ((incoming.notifyLowStock || incoming.notifyNoStock) && incoming.stockEmailRecipient === "")
    err.stockEmailRecipient = "Recipient email is required when notifications are enabled";
  if (Object.keys(err).length) return NextResponse.json({ ok: false, error: err }, { status: 400 });

  const updated = deepPatchSettings({ general: { products: incoming } });

  try {
    await syncWooGeneralProducts(incoming);
    return NextResponse.json({ ok: true, synced: true, products: updated.general.products });
  } catch (e: any) {
    // Don’t block UI—save succeeded locally, sync failed
    return NextResponse.json({
      ok: true,
      synced: false,
      reason: e?.response?.data?.message || String(e),
      products: updated.general.products,
    });
  }
}
