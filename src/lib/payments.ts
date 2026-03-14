// src/lib/payments.ts

// Local success status type for our helper
export type SuccessStatus = "processing" | "completed";

/**
 * Load payments config for Settings → Payments tab.
 * Uses Next.js API route: /api/payments/settings
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
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

/**
 * Save payments config from the Payments tab.
 * Uses POST /api/payments/settings
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
    } catch {}
    throw new Error(msg);
  }
}

/**
 * Infer a boolean from Woo gateways (any enabled => payments enabled)
 * NOTE: Client-safe: calls our server API which talks to Woo.
 *
 * Requires an API route:
 *   GET /api/payments/gateways/infer  -> { enabled: boolean }
 */
export async function inferEnabledFromGateways(): Promise<boolean> {
  try {
    const res = await fetch("/api/payments/gateways/infer", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return true;
    const j = await res.json().catch(() => ({}));
    return typeof j?.enabled === "boolean" ? j.enabled : true;
  } catch {
    return true;
  }
}

/**
 * Enable/disable all gateways.
 * NOTE: Client-safe: calls our server API which talks to Woo.
 *
 * Requires an API route:
 *   POST /api/payments/gateways/set-all  body: { enabled: boolean }
 */
export async function setAllGatewaysEnabled(enabled: boolean): Promise<void> {
  try {
    await fetch("/api/payments/gateways/set-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !!enabled }),
    });
  } catch {
    // no-op (UI can still proceed; gateway sync is best-effort)
  }
}

/** Basic UPI URI generator */
export function buildUpiUri(upi_id: string, payeeName?: string, amount?: string) {
  const params = new URLSearchParams();
  params.set("pa", upi_id);
  if (payeeName) params.set("pn", payeeName);
  if (amount) params.set("am", amount);
  params.set("cu", "INR");
  return `upi://pay?${params.toString()}`;
}

/**
 * WhatsApp notify (SERVER-ONLY helper).
 * If called in browser, it becomes a safe no-op.
 *
 * Prefer: expose a Next API route and call it from client instead.
 */
export async function notifyVendorOnWhatsapp(toNumber: string, text: string) {
  if (typeof window !== "undefined") {
    return { ok: false, reason: "Client-side call blocked" };
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
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
        to: toNumber,
        type: "text",
        text: { body: text },
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, reason: t || "WA send failed" };
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "WA send failed" };
  }
}

/** Use on webhook/manual mark paid to compute final status */
export function resolveSuccessStatus(pref: SuccessStatus | undefined): SuccessStatus {
  return pref === "completed" ? "completed" : "processing";
}