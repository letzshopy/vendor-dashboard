import { getWooClient } from "@/lib/woo";
import {
  extractShipmentFromMeta,
  mergeShipmentMeta,
} from "@/lib/shipment-meta";
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

type ShipmentRow = {
  id: number;
  number: string;
  customerName: string;
  status: string;
  courier: string;
  awb: string;
  trackingUrl: string;
};

type ValidUpdate = {
  orderId: number;
  courier: string;
  awb: string;
  trackingUrl: string;
};

type OrderSnapshot = {
  id: number;
  number: string;
  status: string;
  metaData: unknown[];
};

function optionalText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseOrderSnapshot(value: unknown): OrderSnapshot {
  if (!isRecord(value)) {
    throw new Error("Unexpected order service response");
  }

  const id = parseOrderId(value.id);
  const status = optionalText(value.status).toLowerCase();

  return {
    id,
    number: optionalText(value.number) || String(id),
    status,
    metaData: Array.isArray(value.meta_data)
      ? value.meta_data
      : [],
  };
}

function validatedTrackingUrl(value: unknown, label: string): string {
  const parsed = parseBoundedString(
    value,
    label,
    2048
  );

  if (!parsed) return "";

  let url: URL;
  try {
    url = new URL(parsed);
  } catch {
    throw new OrderRequestError(`${label} must be a valid URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new OrderRequestError(
      `${label} must use http or https.`
    );
  }

  return url.toString();
}

function parseUpdates(value: unknown): ValidUpdate[] {
  if (!Array.isArray(value)) {
    throw new OrderRequestError("Shipment updates are required.");
  }

  if (value.length === 0) return [];

  if (value.length > 50) {
    throw new OrderRequestError(
      "A maximum of 50 shipments can be updated at once."
    );
  }

  const seen = new Set<number>();

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new OrderRequestError(
        `Shipment ${index + 1} is invalid.`
      );
    }

    const orderId = parseOrderId(entry.orderId);

    if (seen.has(orderId)) {
      throw new OrderRequestError(
        `Order ${orderId} appears more than once.`
      );
    }

    seen.add(orderId);

    return {
      orderId,
      courier: parseBoundedString(
        entry.courier,
        `Shipment ${index + 1} courier`,
        100,
        { required: true }
      ),
      awb: parseBoundedString(
        entry.awb,
        `Shipment ${index + 1} AWB`,
        120,
        { required: true }
      ),
      trackingUrl: validatedTrackingUrl(
        entry.trackingUrl,
        `Shipment ${index + 1} tracking URL`
      ),
    };
  });
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const response = await woo.get("/orders", {
      params: {
        status: "processing",
        per_page: 100,
        page: 1,
        orderby: "date",
        order: "desc",
      },
    });
    const values: unknown = response.data;

    if (!Array.isArray(values)) {
      throw new Error("Unexpected order service response");
    }

    const rows: ShipmentRow[] = values.flatMap((value) => {
      if (!isRecord(value)) return [];

      const id = Number(value.id);
      const status = optionalText(value.status).toLowerCase();

      if (!Number.isSafeInteger(id) || id < 1 || status !== "processing") {
        return [];
      }

      const billing = isRecord(value.billing) ? value.billing : {};
      const shipping = isRecord(value.shipping) ? value.shipping : {};
      const billingName = [
        optionalText(billing.first_name),
        optionalText(billing.last_name),
      ]
        .filter(Boolean)
        .join(" ");
      const shippingName = [
        optionalText(shipping.first_name),
        optionalText(shipping.last_name),
      ]
        .filter(Boolean)
        .join(" ");
      const shipment = extractShipmentFromMeta(
        Array.isArray(value.meta_data) ? value.meta_data : []
      );

      return [
        {
          id,
          number: optionalText(value.number) || String(id),
          customerName: billingName || shippingName || "—",
          status,
          courier: shipment.courier,
          awb: shipment.awb,
          trackingUrl: shipment.trackingUrl,
        },
      ];
    });

    return privateJson(rows);
  } catch (error) {
    logOrderError("shipments-list", error);
    return requestErrorResponse(
      error,
      "Failed to load shipments."
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJsonObject(request, 64 * 1024);
    const updates = parseUpdates(body.updates);

    if (updates.length === 0) {
      return privateJson({ ok: true, updated: 0, results: [] });
    }

    const woo = await getWooClient();
    const orders = new Map<number, OrderSnapshot>();

    for (const update of updates) {
      const response = await woo.get(
        `/orders/${update.orderId}`
      );
      const order = parseOrderSnapshot(response.data);

      if (order.status !== "processing") {
        throw new OrderRequestError(
          `Order ${order.number} is no longer ready for shipment.`,
          409
        );
      }

      orders.set(update.orderId, order);
    }

    const shippedAt = new Date().toISOString();
    const results: Array<{ id: number; number: string }> = [];

    for (const update of updates) {
      const order = orders.get(update.orderId);

      if (!order) {
        throw new Error("Validated shipment order is missing");
      }

      const metaData = mergeShipmentMeta(order.metaData, {
        courier: update.courier,
        awb: update.awb,
        trackingUrl: update.trackingUrl,
        status: "shipped",
        shippedDate: shippedAt,
      });

      // Save shipment metadata while the order is still Processing.
      // This guarantees the Completed email reads the persisted values.
      await woo.put(`/orders/${update.orderId}`, {
        meta_data: metaData,
      });

      const verifyResponse = await woo.get(
        `/orders/${update.orderId}`
      );
      const verifiedOrder = parseOrderSnapshot(
        verifyResponse.data
      );
      const verifiedShipment = extractShipmentFromMeta(
        verifiedOrder.metaData as any[]
      );

      if (
        verifiedOrder.status !== "processing" ||
        verifiedShipment.courier !== update.courier ||
        verifiedShipment.awb !== update.awb ||
        verifiedShipment.trackingUrl !== update.trackingUrl ||
        verifiedShipment.status !== "shipped" ||
        !verifiedShipment.shippedDate
      ) {
        throw new Error(
          `Shipment metadata verification failed for order ${order.number}`
        );
      }

      // Only after successful metadata verification do we trigger
      // WooCommerce's customer Completed Order email.
      const response = await woo.put(
        `/orders/${update.orderId}`,
        {
          status: "completed",
        }
      );
      const updated = parseOrderSnapshot(response.data);

      results.push({
        id: updated.id,
        number: updated.number,
      });
    }

    return privateJson({
      ok: true,
      updated: results.length,
      results,
    });
  } catch (error) {
    logOrderError("shipments-update", error);
    return requestErrorResponse(
      error,
      "Failed to update shipments."
    );
  }
}
