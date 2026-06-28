import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type TaxSettings = {
  enable: boolean;
  prices_include_tax: "yes" | "no";
  display_shop: "incl" | "excl";
  display_cart: "incl" | "excl";
  round_subtotal: "yes" | "no";
  based_on: "shipping" | "billing" | "base";
  store_state: string;
  gst_number: string;
  legal_name: string;
  trade_name: string;
  gst_slab: 0 | 5 | 12 | 18;
};

function pick<T = string>(arr: any[], id: string, def?: T): T {
  const found = (arr || []).find((x: any) => x?.id === id);
  return (found?.value ?? def) as T;
}

function normState(s: any, fallback = "KA") {
  const v = String(s || "").toUpperCase().trim().replace(/[^A-Z]/g, "");
  return v.length === 2 ? v : fallback;
}

function toSlab(v: any): 0 | 5 | 12 | 18 {
  const n = Number(v);
  return n === 0 || n === 5 || n === 12 || n === 18 ? (n as 0 | 5 | 12 | 18) : 18;
}

function toMaybeSlab(v: any): 0 | 5 | 12 | 18 | null {
  const n = Number(v);
  if (n === 0 || n === 5 || n === 12 || n === 18) {
    return n as 0 | 5 | 12 | 18;
  }
  return null;
}

async function findStandardIndiaRate(woo: any, state = "") {
  const PER_PAGE = 100;
  const MAX_PAGES = 10;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data } = await woo.get("/taxes", {
      params: { per_page: PER_PAGE, page, class: "standard" },
    });

    const rows = Array.isArray(data) ? data : [];

    const match = rows.find((r: any) => {
      const country = String(r?.country || "");
      const rateState = String(r?.state || "");
      const taxClass = String(r?.class || "standard");

      return country === "IN" && rateState === state && taxClass === "standard";
    });

    if (match) return match;

    if (rows.length < PER_PAGE) break;
  }

  return null;
}

async function readStandardGstSlab(woo: any): Promise<0 | 5 | 12 | 18 | null> {
  const match = await findStandardIndiaRate(woo, "");

  if (!match) return null;

  return toMaybeSlab(Number(match?.rate));
}

async function upsertStandardGstRate(
  woo: any,
  ratePercent: 0 | 5 | 12 | 18
) {
  const payload: any = {
    country: "IN",
    state: "",
    postcode: "",
    city: "",
    rate: Number(ratePercent).toFixed(4),
    name: `GST ${ratePercent}%`,
    priority: 1,
    compound: false,
    shipping: true,
    order: 0,
    class: "standard",
  };

  const match = await findStandardIndiaRate(woo, "");

  if (match?.id) {
    await woo.put(`/taxes/${match.id}`, payload);
    return;
  }

  await woo.post("/taxes", payload);
}

export async function GET() {
  try {
    const woo = await getWooClient();

    const [{ data: gen }, { data: tax }] = await Promise.all([
      woo.get("/settings/general"),
      woo.get("/settings/tax"),
    ]);

    const defaultCountry = pick<string>(gen, "woocommerce_default_country", "IN:KA");
    const state = normState(defaultCountry.split(":")[1] || "KA", "KA");

    const customStoredSlab = toSlab(pick<any>(gen, "letz_gst_slab", 18));

    /*
     * Important:
     * Dashboard must show the real rate from WooCommerce Standard tax table.
     * If custom letz_gst_slab setting is not registered/returned by Woo,
     * it may always fall back to 18. So Standard tax rate is the source of truth.
     */
    const actualRateSlab = await readStandardGstSlab(woo);

    const res: TaxSettings = {
      enable: pick<string>(gen, "woocommerce_calc_taxes", "no") === "yes",

      prices_include_tax:
        pick<string>(tax, "woocommerce_prices_include_tax", "yes") === "no"
          ? "no"
          : "yes",

      display_shop:
        pick<string>(tax, "woocommerce_tax_display_shop", "incl") === "excl"
          ? "excl"
          : "incl",

      display_cart:
        pick<string>(tax, "woocommerce_tax_display_cart", "incl") === "excl"
          ? "excl"
          : "incl",

      round_subtotal:
        pick<string>(tax, "woocommerce_tax_round_at_subtotal", "yes") === "no"
          ? "no"
          : "yes",

      based_on:
        pick<string>(tax, "woocommerce_tax_based_on", "shipping") === "billing"
          ? "billing"
          : pick<string>(tax, "woocommerce_tax_based_on", "shipping") === "base"
          ? "base"
          : "shipping",

      store_state: state,

      gst_number: String(pick<string>(gen, "letz_gst_number", "")),
      legal_name: String(pick<string>(gen, "letz_gst_legal_name", "")),
      trade_name: String(pick<string>(gen, "letz_gst_trade_name", "")),

      gst_slab: actualRateSlab ?? customStoredSlab,
    };

    return NextResponse.json(res);
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to load tax settings";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const woo = await getWooClient();

    const body = (await req.json().catch(() => null)) as TaxSettings | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const store_state = normState(body.store_state, "KA");
    const defaultCountry = `IN:${store_state}`;
    const selectedSlab = toSlab(body.gst_slab);

    await woo.put("/settings/tax/batch", {
      update: [
        { id: "woocommerce_prices_include_tax", value: body.prices_include_tax },
        { id: "woocommerce_tax_display_shop", value: body.display_shop },
        { id: "woocommerce_tax_display_cart", value: body.display_cart },
        { id: "woocommerce_tax_round_at_subtotal", value: body.round_subtotal },
        { id: "woocommerce_tax_based_on", value: body.based_on },
      ],
    });

    await woo.put("/settings/general/batch", {
      update: [
        { id: "woocommerce_calc_taxes", value: body.enable ? "yes" : "no" },
        { id: "woocommerce_default_country", value: defaultCountry },

        /*
         * These custom values will save only if registered on WP/Woo side.
         * We still send them, but GST slab display will not depend only on this.
         */
        { id: "letz_gst_number", value: String(body.gst_number || "") },
        { id: "letz_gst_legal_name", value: String(body.legal_name || "") },
        { id: "letz_gst_trade_name", value: String(body.trade_name || "") },
        { id: "letz_gst_slab", value: String(selectedSlab) },
      ],
    });

    /*
     * Important fix:
     * Sync Standard GST rate here itself before read-after-write.
     * Otherwise GET may return old rate and dashboard rolls back to 18%.
     */
    await upsertStandardGstRate(woo, selectedSlab);

    return await GET();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to save tax settings";

    return NextResponse.json(
      { error: msg },
      { status: e?.response?.status || 500 }
    );
  }
}