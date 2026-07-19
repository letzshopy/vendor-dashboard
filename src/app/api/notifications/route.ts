import { getWooClient } from "@/lib/woo";
import {
  isRecord,
  logOrderError,
  privateJson,
  type JsonRecord,
} from "@/lib/orderPolicy";

export const dynamic = "force-dynamic";

type NotificationItem = {
  id: string;
  type: "new_order" | "upi_pending";
  order_id: number;
  order_number: string;
  total: string;
  customer?: string;
  created_at?: string;
  message: string;
};

const OPEN_STATUSES = new Set([
  "pending",
  "pending-payment",
  "processing",
  "on-hold",
]);

function boundedText(value: unknown, maxLength: number): string {
  if (typeof value !== "string" && typeof value !== "number") return "";

  return String(value)
    .replace(/[\x00-\x1F\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function orderId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function orderTotal(value: unknown): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000) {
    return "0.00";
  }

  return parsed.toFixed(2);
}

function orderDate(order: JsonRecord): string | undefined {
  const raw = boundedText(
    order.date_created_gmt || order.date_created,
    40
  );

  if (!raw) return undefined;

  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
}

function customerName(order: JsonRecord): string {
  const billing = isRecord(order.billing) ? order.billing : {};

  return [billing.first_name, billing.last_name]
    .map((value) => boundedText(value, 80))
    .filter(Boolean)
    .join(" ")
    .slice(0, 160);
}

function isUpiVerified(order: JsonRecord): boolean {
  if (!Array.isArray(order.meta_data)) return false;

  return order.meta_data.some((entry: unknown) => {
    if (!isRecord(entry)) return false;

    const key = boundedText(entry.key, 80);
    return (
      (key === "_letz_upi_verified" || key === "letz_upi_verified") &&
      boundedText(entry.value, 20).toLowerCase() === "yes"
    );
  });
}

function usesUpi(order: JsonRecord): boolean {
  const payment = boundedText(
    order.payment_method_title || order.payment_method,
    120
  ).toLowerCase();

  return ["upi", "qr", "gpay"].some((term) => payment.includes(term));
}

export async function GET() {
  try {
    const woo = await getWooClient();
    const response = await woo.get<unknown>("/orders", {
      params: {
        per_page: 50,
        orderby: "date",
        order: "desc",
        _fields:
          "id,number,total,status,billing,date_created,date_created_gmt,meta_data,payment_method,payment_method_title",
      },
    });

    const orders = Array.isArray(response.data) ? response.data : [];
    const items: NotificationItem[] = [];

    for (const value of orders) {
      if (!isRecord(value)) continue;

      const status = boundedText(value.status, 40).toLowerCase();
      const id = orderId(value.id);
      if (!id || !OPEN_STATUSES.has(status)) continue;

      const number = boundedText(value.number, 64) || String(id);
      const total = orderTotal(value.total);
      const customer = customerName(value);
      const createdAt = orderDate(value);

      items.push({
        id: `new_order_${id}`,
        type: "new_order",
        order_id: id,
        order_number: number,
        total,
        customer: customer || undefined,
        created_at: createdAt,
        message: customer
          ? `New order placed by ${customer}.`
          : "New order placed.",
      });

      if (usesUpi(value) && !isUpiVerified(value)) {
        items.push({
          id: `upi_pending_${id}`,
          type: "upi_pending",
          order_id: id,
          order_number: number,
          total,
          customer: customer || undefined,
          created_at: createdAt,
          message:
            "UPI payment needs manual verification in the order details.",
        });
      }
    }

    return privateJson({ items });
  } catch (error: unknown) {
    logOrderError("notifications", error);
    return privateJson(
      { items: [], error: "Failed to load notifications." },
      502
    );
  }
}
