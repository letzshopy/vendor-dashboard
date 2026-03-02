// src/app/api/payments/manual/mark-paid/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import fs from "node:fs/promises";
import path from "node:path";
import { notifyVendorOnWhatsapp, resolveSuccessStatus } from "@/lib/payments";

// Minimal local shape – just what we actually use here
type LocalPaymentsSettings = {
  success_status?: string;
};

const STORE = path.join(process.cwd(), "tmp_payments_settings.json");

async function readSettings(): Promise<Partial<LocalPaymentsSettings>> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = Number(body?.order_id || 0);
    const txn = String(body?.txn || "").trim();
    const customerPhone = String(body?.customer_phone || ""); // optional, currently unused
    const vendorPhone = process.env.VENDOR_WHATSAPP || "";    // set this env to receive alerts

    if (!orderId || !txn) {
      return NextResponse.json(
        { ok: false, error: "order_id and txn are required" },
        { status: 400 }
      );
    }

    const settings = await readSettings();
    const status = resolveSuccessStatus(settings?.success_status as any);

    // Add order note with transaction number
    await woo
      .post(`/orders/${orderId}/notes`, {
        note: `Customer submitted transaction number: ${txn}`,
      })
      .catch(() => {});

    // Update order status + meta
    await woo.put(`/orders/${orderId}`, {
      status,
      meta_data: [{ key: "_manual_txn", value: txn }],
    });

    // Optional WhatsApp ping to vendor
    if (vendorPhone) {
      const res = await notifyVendorOnWhatsapp(
        vendorPhone,
        `Order #${orderId} marked PAID (manual). Txn: ${txn}`
      );
      void res; // ignore any errors
    }

    // (Optional) WhatsApp to customer could be added here later

    return NextResponse.json({ ok: true, orderId, status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Failed to mark paid" },
      { status: 500 }
    );
  }
}
