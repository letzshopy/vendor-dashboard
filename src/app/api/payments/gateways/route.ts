// src/app/api/payments/gateways/route.ts
import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";

type EnableMap = Record<string, boolean>;

type Body = {
  enable?: EnableMap;
  /**
   * String to help us find the Easebuzz gateway ID.
   * e.g. "easebuzz" or "easebuzz_checkout"
   */
  easebuzzHint?: string;
};

async function fetchGateways() {
  const { data } = await woo.get("/payment_gateways");
  return Array.isArray(data) ? data : [];
}

/**
 * Optional helper – list gateways (for debugging)
 */
export async function GET() {
  try {
    const gateways = await fetchGateways();
    return NextResponse.json(
      gateways.map((g: any) => ({
        id: g.id,
        title: g.title,
        enabled: g.enabled,
      }))
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load gateways" },
      { status: 500 }
    );
  }
}

/**
 * PUT: batch enable/disable gateways.
 * Expects body:
 * {
 *   "enable": {
 *      "letz_upi": true,
 *      "bacs": false,
 *      "cod": true,
 *      "cheque": false,
 *      "easebuzz": true
 *   },
 *   "easebuzzHint": "easebuzz"
 * }
 */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const enable = body.enable || {};
    const easebuzzHint = (body.easebuzzHint || "easebuzz").toLowerCase();

    const gateways = await fetchGateways();

    // Build a map of existing gateway IDs for safety
    const knownIds = new Set<string>();
    let easebuzzRealId: string | null = null;

    for (const gw of gateways) {
      const id = String(gw.id || "");
      const title = String(gw.title || "").toLowerCase();

      knownIds.add(id);

      // Try to detect Easebuzz gateway
      if (
        !easebuzzRealId &&
        (id.toLowerCase().includes(easebuzzHint) ||
          title.includes("easebuzz"))
      ) {
        easebuzzRealId = id;
      }
    }

    const tasks: Promise<any>[] = [];

    // Helper to push a PUT call if gateway exists
    const queueToggle = (gatewayId: string, flag: boolean) => {
      if (!knownIds.has(gatewayId)) return;
      tasks.push(
        woo.put(`/payment_gateways/${encodeURIComponent(gatewayId)}`, {
          enabled: !!flag,
        })
      );
    };

    // 1) Direct mappings (Woo IDs are the same)
    if ("letz_upi" in enable) {
      queueToggle("letz_upi", enable.letz_upi);
    }
    if ("bacs" in enable) {
      queueToggle("bacs", enable.bacs);
    }
    if ("cod" in enable) {
      queueToggle("cod", enable.cod);
    }
    if ("cheque" in enable) {
      queueToggle("cheque", enable.cheque);
    }

    // 2) Easebuzz (lookup real id)
    if ("easebuzz" in enable && easebuzzRealId) {
      queueToggle(easebuzzRealId, enable.easebuzz);
    }

    if (tasks.length) {
      await Promise.all(tasks);
    }

    return NextResponse.json({
      ok: true,
      easebuzzId: easebuzzRealId,
      toggled: Object.keys(enable),
    });
  } catch (e: any) {
    console.error("payments/gateways PUT error", e);
    return NextResponse.json(
      { error: e?.message || "Failed to update gateways" },
      { status: 500 }
    );
  }
}
