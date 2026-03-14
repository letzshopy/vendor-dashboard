// src/app/api/payments/settings/route.ts
import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";
import { getWpBaseUrl } from "@/lib/wpClient";

const OPTION_KEY = "letz_payments_settings";

// --- helpers to store UI state as a single JSON option via custom WP REST ---
// We ignore `name` and always use the `letz_payments_settings` option.
async function getOption(_name: string): Promise<any> {
  try {
    const wpBase = (await getWpBaseUrl()).replace(/\/$/, "");
    const res = await fetch(`${wpBase}/wp-json/letz/v2/payments/settings`, {
      method: "GET",
      cache: "no-store",
      // permission_callback in MU plugin is __return_true, so no auth needed
    });
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

async function setOption(_name: string, value: any) {
  const wpBase = (await getWpBaseUrl()).replace(/\/$/, "");

  const res = await fetch(`${wpBase}/wp-json/letz/v2/payments/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Failed to save payments settings via WP:", txt);
    throw new Error("Could not persist payments settings in WordPress");
  }
}

type SaveBody = {
  general?: { enabled?: boolean; default_status?: string };
  upi?: {
    enabled?: boolean;
    upi_id?: string;
    upi_number?: string;
    payee?: string;
    qr?: "yes" | "no";
    time_min?: string;
    notes?: string;
    qr_src?: string;
  };
  bank?: {
    enabled?: boolean;
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    bank?: string;
    branch?: string;
    notes?: string;
  };
  cod?: { enabled?: boolean; notes?: string };
  cheque?: { enabled?: boolean };
  easebuzz?: {
    enabled?: boolean;
    mode?: string;
    merchant_key?: string;
    salt?: string;
    merchant_id?: string;
    webhook_secret?: string;
    hint?: string;
  };
};

// Helper to find an Easebuzz gateway by id/title/description
function findEasebuzzGateway(gateways: any[], hint: string): any | undefined {
  const h = (hint || "").toLowerCase();
  if (!h) return undefined;

  // 1) id contains hint
  let gw = gateways.find((g) => String(g.id || "").toLowerCase().includes(h));
  if (gw) return gw;

  // 2) title/description contains hint
  gw = gateways.find((g) => {
    const title = String(g.title || "").toLowerCase();
    const desc = String(g.description || "").toLowerCase();
    return title.includes(h) || desc.includes(h);
  });
  if (gw) return gw;

  // 3) fallback: anything with "easebuzz"
  return gateways.find((g) => {
    const id = String(g.id || "").toLowerCase();
    const title = String(g.title || "").toLowerCase();
    const desc = String(g.description || "").toLowerCase();
    return (
      id.includes("easebuzz") ||
      title.includes("easebuzz") ||
      desc.includes("easebuzz")
    );
  });
}

export async function GET() {
  try {
    const state = await getOption(OPTION_KEY);
    return NextResponse.json(state || {});
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load" },
      { status: 500 }
    );
  }
}

// Shared save handler for both POST and PUT
async function handleSave(req: Request) {
  try {
    const woo = await getWooClient(); // ✅ tenant-aware
    const body = (await req.json()) as SaveBody;

    // 1) Persist dashboard JSON (for UPI / notes / bank / COD / easebuzz, etc.)
    await setOption(OPTION_KEY, body);

    // 2) Reflect enables to Woo payment gateways directly
    const enableMap = {
      letz_upi: !!body?.upi?.enabled,
      bacs: !!body?.bank?.enabled,
      cod: !!body?.cod?.enabled,
      cheque: !!body?.cheque?.enabled,
      easebuzz: !!body?.easebuzz?.enabled,
    };

    // Fetch all gateways from Woo
    const { data: gateways } = await woo.get("/payment_gateways");
    const list = Array.isArray(gateways) ? gateways : [];

    const byId: Record<string, any> = {};
    list.forEach((g: any) => {
      byId[String(g.id)] = g;
    });

    const updates: Promise<any>[] = [];

    const maybeToggle = (id: string, want?: boolean) => {
      if (typeof want !== "boolean") return;
      const gw = byId[id];
      if (!gw) return;
      const current = !!gw.enabled;
      if (current === want) return; // already correct

      updates.push(
        woo.put(`/payment_gateways/${encodeURIComponent(id)}`, {
          enabled: want,
        })
      );
    };

    // Core gateways
    maybeToggle("letz_upi", enableMap.letz_upi);
    maybeToggle("bacs", enableMap.bacs);
    maybeToggle("cod", enableMap.cod);
    maybeToggle("cheque", enableMap.cheque);

    // Easebuzz auto-detect
    if (typeof enableMap.easebuzz === "boolean") {
      const easebuzzHint = body?.easebuzz?.hint || "easebuzz";
      const easebuzzGw = findEasebuzzGateway(list, easebuzzHint);
      if (easebuzzGw && easebuzzGw.id) {
        maybeToggle(String(easebuzzGw.id), enableMap.easebuzz);
      }
    }

    if (updates.length) {
      await Promise.all(updates);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("payments/settings SAVE error", e);
    return NextResponse.json(
      { error: e?.message || "Save failed" },
      { status: 500 }
    );
  }
}

// Support both POST and PUT, so whichever the frontend uses will work
export async function POST(req: Request) {
  return handleSave(req);
}

export async function PUT(req: Request) {
  return handleSave(req);
}