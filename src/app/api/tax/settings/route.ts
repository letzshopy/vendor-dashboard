import { NextResponse } from "next/server";

import { getWooClient } from "@/lib/woo";

const MAX_REQUEST_BYTES = 32_768;
const PER_PAGE = 100;
const MAX_PAGES = 10;

type WooClient = Awaited<
  ReturnType<typeof getWooClient>
>;
type JsonRecord = Record<string, unknown>;
type GstSlab = 0 | 5 | 12 | 18;

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
  gst_slab: GstSlab;
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function boundedText(
  value: unknown,
  maxLength: number
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
    },
  });
}

function pickSetting(
  value: unknown,
  id: string,
  fallback: string
): string {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const setting = value.find(
    (item) =>
      isRecord(item) && item.id === id
  );

  if (
    !isRecord(setting) ||
    typeof setting.value !== "string"
  ) {
    return fallback;
  }

  return setting.value;
}

function normalizeState(
  value: unknown,
  fallback = "KA"
): string {
  const state = boundedText(
    value,
    2
  ).toUpperCase();

  return /^[A-Z]{2}$/.test(state)
    ? state
    : fallback;
}

function toGstSlab(
  value: unknown,
  fallback: GstSlab = 18
): GstSlab {
  const slab = Number(value);

  return slab === 0 ||
    slab === 5 ||
    slab === 12 ||
    slab === 18
    ? slab
    : fallback;
}

function optionalGstSlab(
  value: unknown
): GstSlab | null {
  const slab = Number(value);

  return slab === 0 ||
    slab === 5 ||
    slab === 12 ||
    slab === 18
    ? slab
    : null;
}

async function findStandardIndiaRate(
  woo: WooClient
): Promise<JsonRecord | null> {
  for (
    let page = 1;
    page <= MAX_PAGES;
    page += 1
  ) {
    const response = await woo.get(
      "/taxes",
      {
        params: {
          per_page: PER_PAGE,
          page,
          class: "standard",
        },
      }
    );

    const rows: unknown[] =
      Array.isArray(response.data)
        ? response.data
        : [];

    const match = rows.find(
      (row) =>
        isRecord(row) &&
        String(row.country || "") ===
          "IN" &&
        String(row.state || "") === "" &&
        String(row.class || "standard") ===
          "standard"
    );

    if (isRecord(match)) {
      return match;
    }

    if (rows.length < PER_PAGE) {
      break;
    }
  }

  return null;
}

async function readStandardGstSlab(
  woo: WooClient
): Promise<GstSlab | null> {
  const rate =
    await findStandardIndiaRate(woo);

  return rate
    ? optionalGstSlab(rate.rate)
    : null;
}

async function upsertStandardGstRate(
  woo: WooClient,
  ratePercent: GstSlab
) {
  const payload = {
    country: "IN",
    state: "",
    postcode: "",
    city: "",
    rate: ratePercent.toFixed(4),
    name: `GST ${ratePercent}%`,
    priority: 1,
    compound: false,
    shipping: true,
    order: 0,
    class: "standard",
  };

  const match =
    await findStandardIndiaRate(woo);
  const id = match
    ? Number(match.id)
    : 0;

  if (
    Number.isInteger(id) &&
    id > 0
  ) {
    await woo.put(
      `/taxes/${id}`,
      payload
    );
    return;
  }

  await woo.post("/taxes", payload);
}

async function loadTaxSettings(
  woo: WooClient
): Promise<TaxSettings> {
  const [generalResponse, taxResponse] =
    await Promise.all([
      woo.get("/settings/general"),
      woo.get("/settings/tax"),
    ]);

  const general = generalResponse.data;
  const tax = taxResponse.data;
  const defaultCountry = pickSetting(
    general,
    "woocommerce_default_country",
    "IN:KA"
  );
  const basedOn = pickSetting(
    tax,
    "woocommerce_tax_based_on",
    "shipping"
  );
  const storedSlab = toGstSlab(
    pickSetting(
      general,
      "letz_gst_slab",
      "18"
    )
  );
  const actualSlab =
    await readStandardGstSlab(woo);

  return {
    enable:
      pickSetting(
        general,
        "woocommerce_calc_taxes",
        "no"
      ) === "yes",
    prices_include_tax:
      pickSetting(
        tax,
        "woocommerce_prices_include_tax",
        "yes"
      ) === "no"
        ? "no"
        : "yes",
    display_shop:
      pickSetting(
        tax,
        "woocommerce_tax_display_shop",
        "incl"
      ) === "excl"
        ? "excl"
        : "incl",
    display_cart:
      pickSetting(
        tax,
        "woocommerce_tax_display_cart",
        "incl"
      ) === "excl"
        ? "excl"
        : "incl",
    round_subtotal:
      pickSetting(
        tax,
        "woocommerce_tax_round_at_subtotal",
        "yes"
      ) === "no"
        ? "no"
        : "yes",
    based_on:
      basedOn === "billing"
        ? "billing"
        : basedOn === "base"
          ? "base"
          : "shipping",
    store_state: normalizeState(
      defaultCountry.split(":")[1],
      "KA"
    ),
    gst_number: boundedText(
      pickSetting(
        general,
        "letz_gst_number",
        ""
      ),
      15
    ),
    legal_name: boundedText(
      pickSetting(
        general,
        "letz_gst_legal_name",
        ""
      ),
      200
    ),
    trade_name: boundedText(
      pickSetting(
        general,
        "letz_gst_trade_name",
        ""
      ),
      200
    ),
    gst_slab: actualSlab ?? storedSlab,
  };
}

async function readRequestJson(
  request: Request
): Promise<unknown> {
  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    throw new Error("Invalid body size");
  }

  const text = await request.text();

  if (
    !text ||
    Buffer.byteLength(text, "utf8") >
      MAX_REQUEST_BYTES
  ) {
    throw new Error("Invalid body size");
  }

  return JSON.parse(text) as unknown;
}

function normalizeTaxSettings(
  value: unknown
): TaxSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawStoreState =
    typeof value.store_state === "string"
      ? value.store_state.trim().toUpperCase()
      : "";
  const rawGstNumber =
    typeof value.gst_number === "string"
      ? value.gst_number.trim().toUpperCase()
      : "";
  const rawLegalName =
    typeof value.legal_name === "string"
      ? value.legal_name.trim()
      : "";
  const rawTradeName =
    typeof value.trade_name === "string"
      ? value.trade_name.trim()
      : "";
  const slab = optionalGstSlab(
    value.gst_slab
  );

  if (
    !/^[A-Z]{2}$/.test(rawStoreState) ||
    rawGstNumber.length > 15 ||
    rawLegalName.length > 200 ||
    rawTradeName.length > 200 ||
    /[\u0000-\u001F\u007F]/.test(
      `${rawGstNumber}${rawLegalName}${rawTradeName}`
    ) ||
    slab === null ||
    (rawGstNumber &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(
        rawGstNumber
      )) ||
    typeof value.enable !== "boolean" ||
    !["yes", "no"].includes(
      String(value.prices_include_tax)
    ) ||
    !["incl", "excl"].includes(
      String(value.display_shop)
    ) ||
    !["incl", "excl"].includes(
      String(value.display_cart)
    ) ||
    !["yes", "no"].includes(
      String(value.round_subtotal)
    ) ||
    !["shipping", "billing", "base"].includes(
      String(value.based_on)
    )
  ) {
    return null;
  }

  return {
    enable: value.enable,
    prices_include_tax:
      value.prices_include_tax as
        "yes" | "no",
    display_shop:
      value.display_shop as
        "incl" | "excl",
    display_cart:
      value.display_cart as
        "incl" | "excl",
    round_subtotal:
      value.round_subtotal as
        "yes" | "no",
    based_on:
      value.based_on as
        "shipping" | "billing" | "base",
    store_state: rawStoreState,
    gst_number: rawGstNumber,
    legal_name: rawLegalName,
    trade_name: rawTradeName,
    gst_slab: slab,
  };
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const settings =
      await loadTaxSettings(woo);

    return privateJson(settings);
  } catch (error: unknown) {
    console.error(
      "Tax settings load failed:",
      error instanceof Error
        ? error.message
        : "Unknown tax error"
    );

    return privateJson(
      {
        error:
          "Failed to load tax settings.",
      },
      502
    );
  }
}

export async function PUT(
  request: Request
) {
  let requestPayload: unknown;

  try {
    requestPayload = await readRequestJson(
      request
    );
  } catch {
    return privateJson(
      { error: "Invalid tax settings." },
      400
    );
  }

  const settings = normalizeTaxSettings(
    requestPayload
  );

  if (!settings) {
    return privateJson(
      { error: "Invalid tax settings." },
      400
    );
  }

  try {
    const woo = await getWooClient();

    await woo.put(
      "/settings/tax/batch",
      {
        update: [
          {
            id: "woocommerce_prices_include_tax",
            value:
              settings.prices_include_tax,
          },
          {
            id: "woocommerce_tax_display_shop",
            value: settings.display_shop,
          },
          {
            id: "woocommerce_tax_display_cart",
            value: settings.display_cart,
          },
          {
            id: "woocommerce_tax_round_at_subtotal",
            value:
              settings.round_subtotal,
          },
          {
            id: "woocommerce_tax_based_on",
            value: settings.based_on,
          },
        ],
      }
    );

    await woo.put(
      "/settings/general/batch",
      {
        update: [
          {
            id: "woocommerce_calc_taxes",
            value: settings.enable
              ? "yes"
              : "no",
          },
          {
            id: "woocommerce_default_country",
            value:
              `IN:${settings.store_state}`,
          },
          {
            id: "letz_gst_number",
            value: settings.gst_number,
          },
          {
            id: "letz_gst_legal_name",
            value: settings.legal_name,
          },
          {
            id: "letz_gst_trade_name",
            value: settings.trade_name,
          },
          {
            id: "letz_gst_slab",
            value: String(
              settings.gst_slab
            ),
          },
        ],
      }
    );

    await upsertStandardGstRate(
      woo,
      settings.gst_slab
    );

    return privateJson(
      await loadTaxSettings(woo)
    );
  } catch (error: unknown) {
    console.error(
      "Tax settings save failed:",
      error instanceof Error
        ? error.message
        : "Unknown tax error"
    );

    return privateJson(
      {
        error:
          "Failed to save tax settings.",
      },
      502
    );
  }
}
