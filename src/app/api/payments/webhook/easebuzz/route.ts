// src/app/api/payments/webhook/easebuzz/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { resolveSuccessStatus } from "@/lib/payments";

// Minimal local shape – only what this file actually uses
type LocalPaymentsSettings = {
  success_status?: string;
  easebuzz?: {
    webhook_secret?: string;
  };
};

// Load saved settings
const STORE = path.join(process.cwd(), "tmp_payments_settings.json");

async function readSettings(): Promise<Partial<LocalPaymentsSettings>> {
  try {
    const raw = await fs.readFile(STORE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Verify payload signature if you set webhook_secret in settings
function verifySignature(
  bodyText: string,
  secret: string | undefined,
  received: string | undefined
) {
  if (!secret || !received) return true; // skip when no secret configured
  const h = crypto.createHmac("sha256", secret).update(bodyText).digest("hex");
  return h === received;
}

export async function POST(req: Request) {
  try {
    const woo = await getWooClient();
    const raw = await req.text(); // keep raw for signature
    const payload = JSON.parse(raw || "{}");

    const headers = Object.fromEntries(req.headers.entries());
    const sig =
      (headers["x-signature"] as string | undefined) ||
      (headers["x-easebuzz-signature"] as string | undefined) ||
      "";

    const settings = await readSettings();
    const secret = settings?.easebuzz?.webhook_secret || "";

    if (!verifySignature(raw, secret, sig)) {
      return NextResponse.json(
        { ok: false, error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Map Easebuzz payload → Woo order id + status
    // Adjust depending on actual payload fields.
    const orderId = Number(
      payload?.udf1 || payload?.order_id || payload?.txnid || 0
    );
    const success = String(payload?.status || "").toLowerCase() === "success";

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Missing order id" },
        { status: 400 }
      );
    }

    if (success) {
      const target = resolveSuccessStatus(settings?.success_status as any);
      await woo.put(`/orders/${orderId}`, { status: target });
      return NextResponse.json({ ok: true, orderId, status: target });
    } else {
      // Non-success: you can choose what to do; for now, mark as failed.
      await woo.put(`/orders/${orderId}`, { status: "failed" });
      return NextResponse.json({ ok: true, orderId, status: "failed" });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Webhook error" },
      { status: 500 }
    );
  }
}
