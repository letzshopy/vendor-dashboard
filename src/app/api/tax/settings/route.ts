import { NextResponse } from "next/server";
import { woo } from "@/lib/woo";
import fs from "node:fs/promises";
import path from "node:path";

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

const DATA_FILE = path.join(process.cwd(), "tmp_letz_gst_settings.json");

async function readGstExtras() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, "utf8")); }
  catch { return {}; }
}
async function writeGstExtras(extras: Partial<TaxSettings>) {
  try { await fs.writeFile(DATA_FILE, JSON.stringify(extras), "utf8"); }
  catch {}
}

function pick<T=string>(arr: any[], id: string, def?: T): T {
  const found = (arr || []).find((x: any) => x?.id === id);
  return (found?.value ?? def) as T;
}

export async function GET() {
  try {
    // Correct groups:
    //  - GENERAL: woocommerce_calc_taxes, woocommerce_default_country
    //  - TAX:     prices/display/rounding/based_on
    const [{ data: gen }, { data: tax }] = await Promise.all([
      woo.get("/settings/general"),
      woo.get("/settings/tax"),
    ]);

    const extras = await readGstExtras();

    const defaultCountry = pick<string>(gen, "woocommerce_default_country", "IN:KA");
    const state = defaultCountry.split(":")[1] || "KA";

    const res: TaxSettings = {
      // ✅ enable is from GENERAL
      enable: pick<string>(gen, "woocommerce_calc_taxes", "no") === "yes",
      // the rest from TAX
      prices_include_tax: pick(tax, "woocommerce_prices_include_tax", "yes"),
      display_shop:        pick(tax, "woocommerce_tax_display_shop", "incl"),
      display_cart:        pick(tax, "woocommerce_tax_display_cart", "incl"),
      round_subtotal:      pick(tax, "woocommerce_tax_round_at_subtotal", "yes"),
      based_on:            pick(tax, "woocommerce_tax_based_on", "shipping"),

      store_state: state,

      gst_number: String(extras.gst_number || ""),
      legal_name: String(extras.legal_name || ""),
      trade_name: String(extras.trade_name || ""),
      gst_slab: (extras.gst_slab as 0|5|12|18) ?? 18,
    };

    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load tax settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as TaxSettings;

    // Batch update TAX group (everything EXCEPT enable)
    await woo.put("/settings/tax/batch", {
      update: [
        { id: "woocommerce_prices_include_tax",     value: body.prices_include_tax },
        { id: "woocommerce_tax_display_shop",      value: body.display_shop },
        { id: "woocommerce_tax_display_cart",      value: body.display_cart },
        { id: "woocommerce_tax_round_at_subtotal", value: body.round_subtotal },
        { id: "woocommerce_tax_based_on",          value: body.based_on },
      ],
    });

    // Batch update GENERAL group (✅ enable + base location)
    const defaultCountry = `IN:${body.store_state || "KA"}`;
    await woo.put("/settings/general/batch", {
      update: [
        { id: "woocommerce_calc_taxes",     value: body.enable ? "yes" : "no" },
        { id: "woocommerce_default_country", value: defaultCountry },
      ],
    });

    // Persist GST extras (temporary local store)
    await writeGstExtras({
      gst_number: body.gst_number || "",
      legal_name: body.legal_name || "",
      trade_name: body.trade_name || "",
      gst_slab: body.gst_slab ?? 18,
    });

    // Read-after-write
    const resp = await GET();
    const json = await resp.json();
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save tax settings" }, { status: 500 });
  }
}
