// src/lib/payments.ts
import { woo } from "@/lib/woo";

// Local success status type for our helper
export type SuccessStatus = "processing" | "completed";

/**
 * Load payments config for Settings → Payments tab.
 * This talks to our Next.js API route:
 *   src/app/api/payments/settings/route.ts
 */
export async function fetchPaymentsSettings(): Promise<any> {
  const res = await fetch("/api/payments/settings", {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = "Failed to load payments settings";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Save payments config from the Payments tab.
 * We use POST /api/payments/settings so our route.ts (POST handler) catches it.
 */
export async function savePaymentsSettings(values: any): Promise<void> {
  const res = await fetch("/api/payments/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  if (!res.ok) {
    let msg = "Failed to save payments settings";
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(msg);
  }
}

// Infer a boolean from Woo gateways (any enabled => payments enabled)
export async function inferEnabledFromGateways(): Promise<boolean> {
  try {
    const { data } = await woo.get("/payment_gateways");
    const arr = Array.isArray(data) ? data : [];
    return arr.some((g: any) => !!g.enabled);
  } catch {
    return true;
  }
}

export async function setAllGatewaysEnabled(enabled: boolean) {
  // Batch if possible, fallback per-gateway
  try {
    const { data } = await woo.get("/payment_gateways");
    const arr = Array.isArray(data) ? data : [];
    const update = arr.map((g: any) => ({ id: g.id, enabled }));
    try {
      await woo.put("/payment_gateways/batch", { update });
    } catch {
      for (const g of arr) {
        try {
          await woo.put(`/payment_gateways/${g.id}`, { enabled });
        } catch {}
      }
    }
  } catch {}
}

// Basic UPI URI generator
export function buildUpiUri(
  upi_id: string,
  payeeName?: string,
  amount?: string
) {
  const params = new URLSearchParams();
  params.set("pa", upi_id);
  if (payeeName) params.set("pn", payeeName);
  if (amount) params.set("am", amount);
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

// WhatsApp notify (stub). Provide env:
//   WHATSAPP_PHONE_ID, WHATSAPP_TOKEN, WHATSAPP_FROM_NUMBER
export async function notifyVendorOnWhatsapp(
  toNumber: string,
  text: string
) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    // Not configured—no-op
    return { ok: false, reason: "WhatsApp env not set" };
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toNumber, // e.g. vendor mobile with country code
        type: "text",
        text: { body: text },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, reason: t };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "WA send failed" };
  }
}

// Use on webhook/manual mark paid to compute final status
export function resolveSuccessStatus(
  pref: SuccessStatus | undefined
): SuccessStatus {
  return pref === "completed" ? "completed" : "processing";
}
