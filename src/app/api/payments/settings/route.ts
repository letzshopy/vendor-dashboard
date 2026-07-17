import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";
import { getWpBaseUrl } from "@/lib/wpClient";

export const dynamic = "force-dynamic";

type OrderSuccessStatus = "processing" | "completed" | "on-hold" | "pending";

type SaveBody = {
  general?: {
    enabled?: boolean;
    default_status?: string;
  };
  upi?: {
    enabled?: boolean;
    upi_id?: string;
    upi_number?: string;
    payee?: string;
    qr?: "yes" | "no";
    time_min?: string;
    notes?: string;
    qr_src?: string;
    require_screenshot?: boolean;
    screenshot_upload?: boolean;
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
  cod?: {
    enabled?: boolean;
    notes?: string;
  };
  cheque?: {
    enabled?: boolean;
    notes?: string;
  };
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

type WooGateway = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  enabled?: unknown;
};

function requireInternalToken() {
  const token = process.env.LETZ_INTERNAL_TOKEN || "";
  if (!token) {
    throw new Error("Missing LETZ_INTERNAL_TOKEN in dashboard env");
  }
  return token;
}

function boolValue(value: unknown, fallback = false) {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "yes" || value === "on") {
    return true;
  }

  if (value === false || value === 0 || value === "0" || value === "false" || value === "no" || value === "off") {
    return false;
  }

  return fallback;
}

function cleanStatus(value: unknown): OrderSuccessStatus {
  const v = String(value || "").trim();

  if (v === "completed") return "completed";
  if (v === "on-hold") return "on-hold";
  if (v === "pending") return "pending";

  return "processing";
}

function normalizeBody(body: SaveBody | null | undefined): Required<SaveBody> {
  return {
    general: {
      enabled: boolValue(body?.general?.enabled, true),
      default_status: cleanStatus(body?.general?.default_status),
    },
    easebuzz: {
      enabled: boolValue(body?.easebuzz?.enabled, false),
      mode: body?.easebuzz?.mode || "test",
      merchant_key: body?.easebuzz?.merchant_key || "",
      salt: body?.easebuzz?.salt || "",
      merchant_id: body?.easebuzz?.merchant_id || "",
      webhook_secret: body?.easebuzz?.webhook_secret || "",
      hint: body?.easebuzz?.hint || "easebuzz",
    },
    upi: {
      enabled: boolValue(body?.upi?.enabled, false),
      upi_id: body?.upi?.upi_id || "",
      upi_number: body?.upi?.upi_number || "",
      payee: body?.upi?.payee || "",
      qr: body?.upi?.qr === "yes" ? "yes" : "no",
      time_min: body?.upi?.time_min || "",
      notes: body?.upi?.notes || "",
      qr_src: body?.upi?.qr_src || "",
      require_screenshot:
        body?.upi?.require_screenshot !== undefined
          ? boolValue(body.upi.require_screenshot, true)
          : body?.upi?.screenshot_upload !== undefined
          ? boolValue(body.upi.screenshot_upload, true)
          : true,
    },
    bank: {
      enabled: boolValue(body?.bank?.enabled, false),
      account_name: body?.bank?.account_name || "",
      account_number: body?.bank?.account_number || "",
      ifsc: body?.bank?.ifsc || "",
      bank: body?.bank?.bank || "",
      branch: body?.bank?.branch || "",
      notes: body?.bank?.notes || "",
    },
    cod: {
      enabled: boolValue(body?.cod?.enabled, false),
      notes: body?.cod?.notes || "",
    },
    cheque: {
      enabled: boolValue(body?.cheque?.enabled, false),
      notes: body?.cheque?.notes || "",
    },
  };
}

async function getPaymentsOption(): Promise<unknown> {
  const wpBase = (await getWpBaseUrl()).replace(/\/$/, "");
  const token = requireInternalToken();

  const res = await fetch(`${wpBase}/wp-json/letz/v2/payments/settings?_ts=${Date.now()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Letz-Auth": token,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to load payments settings from WordPress");
  }

  return res.json();
}

async function setPaymentsOption(
  value: Required<SaveBody>
): Promise<Required<SaveBody>> {
  const wpBase = (await getWpBaseUrl()).replace(/\/$/, "");
  const token = requireInternalToken();

  const res = await fetch(`${wpBase}/wp-json/letz/v2/payments/settings`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Letz-Auth": token,
    },
    body: JSON.stringify(value),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("Failed to save payments settings via WP:", txt);
    throw new Error(txt || "Could not persist payments settings");
  }

  const payload = await res.json().catch(() => null) as {
    ok?: unknown;
    settings?: SaveBody;
  } | null;

  if (!payload || payload.ok !== true || !payload.settings) {
    throw new Error("WordPress did not confirm the payments settings save");
  }

  return normalizeBody(payload.settings);
}

function settingsMatch(
  expected: Required<SaveBody>,
  actual: Required<SaveBody>
): boolean {
  return JSON.stringify(expected) === JSON.stringify(actual);
}

function findEasebuzzGateway(
  gateways: WooGateway[],
  hint: string
): WooGateway | undefined {
  const h = (hint || "easebuzz").toLowerCase();

  let gw = gateways.find((g) => String(g.id || "").toLowerCase().includes(h));
  if (gw) return gw;

  gw = gateways.find((g) => {
    const title = String(g.title || "").toLowerCase();
    const desc = String(g.description || "").toLowerCase();
    return title.includes(h) || desc.includes(h);
  });
  if (gw) return gw;

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
    const state = await getPaymentsOption();
    const safe = normalizeBody((state || {}) as SaveBody);

    return NextResponse.json(safe);
  } catch (e: unknown) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Failed to load payments settings",
      },
      { status: 500 }
    );
  }
}

async function handleSave(req: Request) {
  try {
    const woo = await getWooClient();

    const rawBody = (await req.json().catch(() => null)) as SaveBody | null;
    const body = normalizeBody(rawBody);

    /*
     * Save dashboard settings first.
     * Important: method toggles stay stored even when global payments are off.
     */
    const savedByWordPress = await setPaymentsOption(body);

    if (!settingsMatch(body, savedByWordPress)) {
      throw new Error("WordPress returned different payments settings after save");
    }

    /*
     * Checkout visibility should respect global Accept Payments.
     * If general.enabled = false, all Woo checkout gateways are disabled.
     */
    const acceptPayments = !!body.general.enabled;

    const enableMap = {
      letz_upi: acceptPayments && !!body.upi.enabled,
      bacs: acceptPayments && !!body.bank.enabled,
      cod: acceptPayments && !!body.cod.enabled,
      cheque: acceptPayments && !!body.cheque.enabled,
      easebuzz: acceptPayments && !!body.easebuzz.enabled,
    };

    const { data: gateways } = await woo.get("/payment_gateways");
    const list: WooGateway[] = Array.isArray(gateways)
      ? gateways.filter(
          (gateway): gateway is WooGateway =>
            typeof gateway === "object" && gateway !== null
        )
      : [];

    const byId: Record<string, WooGateway> = {};
    list.forEach((g) => {
      byId[String(g.id)] = g;
    });

    const updates: Promise<unknown>[] = [];

    const maybeToggle = (id: string, want: boolean) => {
      const gw = byId[id];
      if (!gw) return;

      const current =
        gw.enabled === true ||
        gw.enabled === "yes" ||
        gw.enabled === "true" ||
        gw.enabled === 1;

      if (current === want) return;

      updates.push(
        woo.put(`/payment_gateways/${encodeURIComponent(id)}`, {
          enabled: want,
        })
      );
    };

    maybeToggle("letz_upi", enableMap.letz_upi);
    maybeToggle("bacs", enableMap.bacs);
    maybeToggle("cod", enableMap.cod);
    maybeToggle("cheque", enableMap.cheque);

    const easebuzzGw = findEasebuzzGateway(list, body.easebuzz.hint || "easebuzz");
    if (easebuzzGw?.id) {
      maybeToggle(String(easebuzzGw.id), enableMap.easebuzz);
    }

    if (updates.length) {
      await Promise.all(updates);
    }

    const verified = normalizeBody(
      (await getPaymentsOption()) as SaveBody
    );

    if (!settingsMatch(body, verified)) {
      throw new Error("Payments settings verification failed after save");
    }

    return NextResponse.json({
      ok: true,
      settings: verified,
      effectiveGateways: enableMap,
    });
  } catch (e: unknown) {
    console.error("payments/settings SAVE error", e);

    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Save failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handleSave(req);
}

export async function PUT(req: Request) {
  return handleSave(req);
}
