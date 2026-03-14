import { NextResponse } from "next/server";
import { getWooClient } from "@/lib/woo";

type TaxSettings = {
  enable: boolean;
  prices_include_tax: "yes" | "no";
  display_shop: "incl" | "excl";
  display_cart: "incl" | "excl";
  round_subtotal: "yes" | "no";
  based_on: "shipping" | "billing" | "base";
  store_state: string; // e.g. "KA"
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
  return n === 0 || n === 5 || n === 12 || n === 18 ? (n as any) : 18;
}

export async function GET() {
  try {
    const woo = await getWooClient();

    // Correct groups:
    //  - GENERAL: woocommerce_calc_taxes, woocommerce_default_country + our custom letz_* settings
    //  - TAX:     prices/display/rounding/based_on
    const [{ data: gen }, { data: tax }] = await Promise.all([
      woo.get("/settings/general"),
      woo.get("/settings/tax"),
    ]);

    const defaultCountry = pick<string>(gen, "woocommerce_default_country", "IN:KA");
    const state = normState(defaultCountry.split(":")[1] || "KA", "KA");

    const res: TaxSettings = {
      // enable is from GENERAL
      enable: pick<string>(gen, "woocommerce_calc_taxes", "no") === "yes",

      // rest from TAX
      prices_include_tax: pick(tax, "woocommerce_prices_include_tax", "yes"),
      display_shop: pick(tax, "woocommerce_tax_display_shop", "incl"),
      display_cart: pick(tax, "woocommerce_tax_display_cart", "incl"),
      round_subtotal: pick(tax, "woocommerce_tax_round_at_subtotal", "yes"),
      based_on: pick(tax, "woocommerce_tax_based_on", "shipping"),

      store_state: state,

      // GST extras (stored as WP options exposed via settings/general)
      gst_number: String(pick<string>(gen, "letz_gst_number", "")),
      legal_name: String(pick<string>(gen, "letz_gst_legal_name", "")),
      trade_name: String(pick<string>(gen, "letz_gst_trade_name", "")),
      gst_slab: toSlab(pick<any>(gen, "letz_gst_slab", 18)),
    };

    return NextResponse.json(res);
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to load tax settings";
    return NextResponse.json({ error: msg }, { status: e?.response?.status || 500 });
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

    // 1) Update TAX group (everything EXCEPT enable)
    await woo.put("/settings/tax/batch", {
      update: [
        { id: "woocommerce_prices_include_tax", value: body.prices_include_tax },
        { id: "woocommerce_tax_display_shop", value: body.display_shop },
        { id: "woocommerce_tax_display_cart", value: body.display_cart },
        { id: "woocommerce_tax_round_at_subtotal", value: body.round_subtotal },
        { id: "woocommerce_tax_based_on", value: body.based_on },
      ],
    });

    // 2) Update GENERAL group (enable + base location + GST extras)
    await woo.put("/settings/general/batch", {
      update: [
        { id: "woocommerce_calc_taxes", value: body.enable ? "yes" : "no" },
        { id: "woocommerce_default_country", value: defaultCountry },

        // GST extras (must be registered on WP side)
        { id: "letz_gst_number", value: String(body.gst_number || "") },
        { id: "letz_gst_legal_name", value: String(body.legal_name || "") },
        { id: "letz_gst_trade_name", value: String(body.trade_name || "") },
        { id: "letz_gst_slab", value: String(toSlab(body.gst_slab)) },
      ],
    });

    // Read-after-write
    return await GET();
  } catch (e: any) {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "Failed to save tax settings";
    return NextResponse.json({ error: msg }, { status: e?.response?.status || 500 });
  }
}