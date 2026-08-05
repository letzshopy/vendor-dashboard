import { getWooClient } from "@/lib/woo";
import { SHIPMENT_META_KEYS } from "@/lib/shipment-meta";
import {
  isRecord,
  logOrderError,
  OrderRequestError,
  parseBoundedString,
  parseOrderId,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MetaEntry = {
  id?: number;
  key: string;
  value: string;
};

const SHIPMENT_KEYS = new Set<string>(
  Object.values(SHIPMENT_META_KEYS)
);
const SHIPMENT_STATUSES = new Set([
  "",
  "pending",
  "packed",
  "shipped",
  "delivered",
  "returned",
]);
const SHIPMENT_MODES = new Set(["", "shift", "self"]);

function parseShipmentValue(key: string, value: unknown): string {
  const limits: Record<string, number> = {
    [SHIPMENT_META_KEYS.mode]: 20,
    [SHIPMENT_META_KEYS.courier]: 100,
    [SHIPMENT_META_KEYS.awb]: 120,
    [SHIPMENT_META_KEYS.trackingUrl]: 2048,
    [SHIPMENT_META_KEYS.status]: 20,
    [SHIPMENT_META_KEYS.shippedDate]: 40,
    [SHIPMENT_META_KEYS.weight]: 32,
    [SHIPMENT_META_KEYS.boxes]: 12,
    [SHIPMENT_META_KEYS.notes]: 1_000,
  };
  const parsed = parseBoundedString(
    value,
    "Shipment value",
    limits[key] || 120,
    { allowNewlines: key === SHIPMENT_META_KEYS.notes }
  );

  if (
    key === SHIPMENT_META_KEYS.mode &&
    !SHIPMENT_MODES.has(parsed)
  ) {
    throw new OrderRequestError("Shipment mode is invalid.");
  }

  if (
    key === SHIPMENT_META_KEYS.status &&
    !SHIPMENT_STATUSES.has(parsed)
  ) {
    throw new OrderRequestError("Shipment status is invalid.");
  }

  if (
    key === SHIPMENT_META_KEYS.shippedDate &&
    parsed &&
    Number.isNaN(Date.parse(parsed))
  ) {
    throw new OrderRequestError("Shipment date is invalid.");
  }

  if (
    key === SHIPMENT_META_KEYS.trackingUrl &&
    parsed
  ) {
    let url: URL;
    try {
      url = new URL(parsed);
    } catch {
      throw new OrderRequestError(
        "Shipment tracking URL is invalid."
      );
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new OrderRequestError(
        "Shipment tracking URL must use http or https."
      );
    }

    return url.toString();
  }

  if (
    key === SHIPMENT_META_KEYS.weight &&
    parsed &&
    !/^\d{1,8}(?:\.\d{1,3})?$/.test(parsed)
  ) {
    throw new OrderRequestError("Shipment weight is invalid.");
  }

  if (
    key === SHIPMENT_META_KEYS.boxes &&
    parsed &&
    !/^\d{1,6}$/.test(parsed)
  ) {
    throw new OrderRequestError("Shipment box count is invalid.");
  }

  return parsed;
}

function readExistingMeta(value: unknown): MetaEntry[] {
  if (!isRecord(value) || !Array.isArray(value.meta_data)) {
    return [];
  }

  return value.meta_data.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.key !== "string" ||
      !SHIPMENT_KEYS.has(entry.key)
    ) {
      return [];
    }

    const id = Number(entry.id);
    return [
      {
        ...(Number.isSafeInteger(id) && id > 0 ? { id } : {}),
        key: entry.key,
        value:
          typeof entry.value === "string"
            ? entry.value
            : String(entry.value ?? ""),
      },
    ];
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const orderId = parseOrderId(id);
    const body = await readJsonObject(request, 32 * 1024);

    if (!Array.isArray(body.meta_data)) {
      throw new OrderRequestError(
        "Shipment metadata is required."
      );
    }

    if (body.meta_data.length > 40) {
      throw new OrderRequestError(
        "Too many shipment metadata entries were provided."
      );
    }

    const requested = new Map<string, string>();

    for (const entry of body.meta_data) {
      if (!isRecord(entry) || typeof entry.key !== "string") {
        continue;
      }

      if (!SHIPMENT_KEYS.has(entry.key)) continue;
      requested.set(
        entry.key,
        parseShipmentValue(entry.key, entry.value)
      );
    }

    if (requested.size === 0) {
      throw new OrderRequestError(
        "No valid shipment fields were provided."
      );
    }

    const woo = await getWooClient();
    const currentResponse = await woo.get(`/orders/${orderId}`);
    const existing = readExistingMeta(currentResponse.data);
    const byKey = new Map(existing.map((entry) => [entry.key, entry]));
    const metaData: MetaEntry[] = [];

    for (const [key, value] of requested) {
      const previous = byKey.get(key);
      metaData.push({
        ...(previous?.id ? { id: previous.id } : {}),
        key,
        value,
      });
    }

    const { data } = await woo.put(`/orders/${orderId}`, {
      meta_data: metaData,
    });

    return privateJson(data);
  } catch (error) {
    logOrderError("shipment-detail", error);
    return requestErrorResponse(
      error,
      "Failed to update shipment details."
    );
  }
}
