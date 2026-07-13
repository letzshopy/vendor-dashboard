import { NextResponse } from "next/server";

import { fetchInternalWp } from "@/lib/wpClient";
import { getWooClient } from "@/lib/woo";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 65_536;
const UPSTREAM_TIMEOUT_MS = 20_000;

type JsonRecord = Record<string, unknown>;
type OrderSuccessStatus =
  | "processing"
  | "completed"
  | "on-hold"
  | "pending";

type PaymentSettings = {
  general: {
    enabled: boolean;
    default_status: OrderSuccessStatus;
  };
  upi: {
    enabled: boolean;
    upi_id: string;
    upi_number: string;
    payee: string;
    qr: "yes" | "no";
    time_min: string;
    notes: string;
    qr_src: string;
    require_screenshot: boolean;
  };
  bank: {
    enabled: boolean;
    account_name: string;
    account_number: string;
    ifsc: string;
    bank: string;
    branch: string;
    notes: string;
  };
  cod: {
    enabled: boolean;
    notes: string;
  };
  cheque: {
    enabled: boolean;
    notes: string;
  };
  easebuzz: {
    enabled: boolean;
    mode: string;
    merchant_key: string;
    salt: string;
    merchant_id: string;
    webhook_secret: string;
    hint: string;
  };
};

type WooGateway = {
  id: string;
  title: string;
  description: string;
  enabled: unknown;
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

function section(
  value: JsonRecord,
  key: string
): JsonRecord {
  return isRecord(value[key])
    ? value[key]
    : {};
}

function boundedText(
  value: unknown,
  maxLength = 500
): string {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function boolValue(
  value: unknown,
  fallback = false
): boolean {
  if (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "yes" ||
    value === "on"
  ) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0" ||
    value === "false" ||
    value === "no" ||
    value === "off"
  ) {
    return false;
  }

  return fallback;
}

function cleanStatus(
  value: unknown
): OrderSuccessStatus {
  const status = boundedText(value, 20);

  if (
    status === "completed" ||
    status === "on-hold" ||
    status === "pending"
  ) {
    return status;
  }

  return "processing";
}

function normalizeSettings(
  value: unknown
): PaymentSettings {
  const root = isRecord(value) ? value : {};
  const general = section(root, "general");
  const easebuzz = section(root, "easebuzz");
  const upi = section(root, "upi");
  const bank = section(root, "bank");
  const cod = section(root, "cod");
  const cheque = section(root, "cheque");

  return {
    general: {
      enabled: boolValue(
        general.enabled,
        true
      ),
      default_status: cleanStatus(
        general.default_status
      ),
    },
    easebuzz: {
      enabled: boolValue(
        easebuzz.enabled
      ),
      mode:
        boundedText(easebuzz.mode, 20) ||
        "test",
      merchant_key: boundedText(
        easebuzz.merchant_key,
        300
      ),
      salt: boundedText(
        easebuzz.salt,
        300
      ),
      merchant_id: boundedText(
        easebuzz.merchant_id,
        300
      ),
      webhook_secret: boundedText(
        easebuzz.webhook_secret,
        300
      ),
      hint:
        boundedText(easebuzz.hint, 80) ||
        "easebuzz",
    },
    upi: {
      enabled: boolValue(upi.enabled),
      upi_id: boundedText(
        upi.upi_id,
        160
      ),
      upi_number: boundedText(
        upi.upi_number,
        40
      ),
      payee: boundedText(
        upi.payee,
        160
      ),
      qr: upi.qr === "yes" ? "yes" : "no",
      time_min: boundedText(
        upi.time_min,
        20
      ),
      notes: boundedText(
        upi.notes,
        2_000
      ),
      qr_src: boundedText(
        upi.qr_src,
        2_048
      ),
      require_screenshot:
        upi.require_screenshot !==
        undefined
          ? boolValue(
              upi.require_screenshot,
              true
            )
          : boolValue(
              upi.screenshot_upload,
              true
            ),
    },
    bank: {
      enabled: boolValue(bank.enabled),
      account_name: boundedText(
        bank.account_name,
        160
      ),
      account_number: boundedText(
        bank.account_number,
        80
      ),
      ifsc: boundedText(bank.ifsc, 40),
      bank: boundedText(bank.bank, 160),
      branch: boundedText(
        bank.branch,
        160
      ),
      notes: boundedText(
        bank.notes,
        2_000
      ),
    },
    cod: {
      enabled: boolValue(cod.enabled),
      notes: boundedText(
        cod.notes,
        2_000
      ),
    },
    cheque: {
      enabled: boolValue(
        cheque.enabled
      ),
      notes: boundedText(
        cheque.notes,
        2_000
      ),
    },
  };
}

function privateJson(
  body: unknown,
  status = 200
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function readJson(
  response: Response
): Promise<unknown> {
  return response
    .json()
    .catch(() => null);
}

async function getPaymentsOption():
  Promise<unknown> {
  const response = await fetchInternalWp(
    "/wp-json/letz/v2/payments/settings",
    { method: "GET" },
    UPSTREAM_TIMEOUT_MS
  );

  const payload = await readJson(response);

  if (!response.ok || payload === null) {
    throw new Error(
      `Payments settings load failed with status ${response.status}`
    );
  }

  return payload;
}

async function setPaymentsOption(
  value: PaymentSettings
): Promise<void> {
  const response = await fetchInternalWp(
    "/wp-json/letz/v2/payments/settings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(value),
    },
    UPSTREAM_TIMEOUT_MS
  );

  if (!response.ok) {
    throw new Error(
      `Payments settings save failed with status ${response.status}`
    );
  }
}

function asWooGateway(
  value: unknown
): WooGateway | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = boundedText(value.id, 160);

  if (!id) {
    return null;
  }

  return {
    id,
    title: boundedText(
      value.title,
      300
    ),
    description: boundedText(
      value.description,
      1_000
    ),
    enabled: value.enabled,
  };
}

function findEasebuzzGateway(
  gateways: WooGateway[],
  hint: string
): WooGateway | undefined {
  const needle = (
    hint || "easebuzz"
  ).toLowerCase();

  return (
    gateways.find((gateway) =>
      gateway.id
        .toLowerCase()
        .includes(needle)
    ) ||
    gateways.find((gateway) => {
      const text =
        `${gateway.title} ${gateway.description}`
          .toLowerCase();

      return text.includes(needle);
    }) ||
    gateways.find((gateway) => {
      const text =
        `${gateway.id} ${gateway.title} ${gateway.description}`
          .toLowerCase();

      return text.includes("easebuzz");
    })
  );
}

function gatewayEnabled(
  value: unknown
): boolean {
  return (
    value === true ||
    value === "yes" ||
    value === "true" ||
    value === 1
  );
}

export async function GET() {
  try {
    const state =
      await getPaymentsOption();

    return privateJson(
      normalizeSettings(state)
    );
  } catch (error: unknown) {
    console.error(
      "Payments settings load failed:",
      error instanceof Error
        ? error.message
        : "Unknown payments error"
    );

    return privateJson(
      {
        error:
          "Failed to load payments settings.",
      },
      502
    );
  }
}

async function handleSave(
  request: Request
): Promise<NextResponse> {
  const contentLength = Number(
    request.headers.get("content-length") ||
      "0"
  );

  if (
    !Number.isFinite(contentLength) ||
    contentLength < 0 ||
    contentLength > MAX_REQUEST_BYTES
  ) {
    return privateJson(
      {
        error:
          "Invalid payments settings request.",
      },
      400
    );
  }

  let rawBody: unknown;

  try {
    const text = await request.text();

    if (
      !text ||
      Buffer.byteLength(text, "utf8") >
        MAX_REQUEST_BYTES
    ) {
      throw new Error("Invalid body size");
    }

    rawBody = JSON.parse(text) as unknown;
  } catch {
    return privateJson(
      {
        error:
          "Invalid payments settings request.",
      },
      400
    );
  }

  if (!isRecord(rawBody)) {
    return privateJson(
      {
        error:
          "Invalid payments settings request.",
      },
      400
    );
  }

  const body = normalizeSettings(rawBody);

  try {
    const woo = await getWooClient();

    await setPaymentsOption(body);

    const acceptPayments =
      body.general.enabled;

    const enableMap = {
      letz_upi:
        acceptPayments &&
        body.upi.enabled,
      bacs:
        acceptPayments &&
        body.bank.enabled,
      cod:
        acceptPayments &&
        body.cod.enabled,
      cheque:
        acceptPayments &&
        body.cheque.enabled,
      easebuzz:
        acceptPayments &&
        body.easebuzz.enabled,
    };

    const response =
      await woo.get("/payment_gateways");

    const gateways = (
      Array.isArray(response.data)
        ? response.data
        : []
    )
      .map(asWooGateway)
      .filter(
        (
          gateway
        ): gateway is WooGateway =>
          gateway !== null
      );

    const byId = new Map(
      gateways.map((gateway) => [
        gateway.id,
        gateway,
      ])
    );

    const updates:
      Array<Promise<unknown>> = [];

    const queueToggle = (
      id: string,
      enabled: boolean
    ) => {
      const gateway = byId.get(id);

      if (
        !gateway ||
        gatewayEnabled(
          gateway.enabled
        ) === enabled
      ) {
        return;
      }

      updates.push(
        woo.put(
          `/payment_gateways/${encodeURIComponent(
            id
          )}`,
          { enabled }
        )
      );
    };

    queueToggle(
      "letz_upi",
      enableMap.letz_upi
    );
    queueToggle("bacs", enableMap.bacs);
    queueToggle("cod", enableMap.cod);
    queueToggle(
      "cheque",
      enableMap.cheque
    );

    const easebuzzGateway =
      findEasebuzzGateway(
        gateways,
        body.easebuzz.hint
      );

    if (easebuzzGateway) {
      queueToggle(
        easebuzzGateway.id,
        enableMap.easebuzz
      );
    }

    await Promise.all(updates);

    return privateJson({
      ok: true,
      settings: body,
      effectiveGateways: enableMap,
    });
  } catch (error: unknown) {
    console.error(
      "Payments settings save failed:",
      error instanceof Error
        ? error.message
        : "Unknown payments error"
    );

    return privateJson(
      { error: "Save failed." },
      502
    );
  }
}

export async function POST(
  request: Request
) {
  return handleSave(request);
}

export async function PUT(
  request: Request
) {
  return handleSave(request);
}
