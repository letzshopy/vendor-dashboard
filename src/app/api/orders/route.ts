import { NextRequest } from "next/server";
import { getWooClient } from "@/lib/woo";
import type { WCOrder } from "@/lib/order-utils";
import {
  isRecord,
  logOrderError,
  OrderRequestError,
  parseBoundedString,
  parseOrderId,
  parseOrderStatus,
  parsePositiveInteger,
  privateJson,
  readJsonObject,
  requestErrorResponse,
} from "@/lib/orderPolicy";

const READABLE_STATUSES = new Set([
  "all",
  "pending",
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "refunded",
  "failed",
  "trash",
]);

const STATUS_ALIASES: Record<string, string> = {
  "wc-pending": "pending",
  "wc-processing": "processing",
  "on hold": "on-hold",
  on_hold: "on-hold",
  "wc-on-hold": "on-hold",
  complete: "completed",
  "wc-completed": "completed",
  canceled: "cancelled",
  "wc-cancelled": "cancelled",
  "wc-refunded": "refunded",
  "wc-failed": "failed",
  trashed: "trash",
  "wc-trash": "trash",
};

function normalized(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function canonicalStatus(value: unknown): string {
  const status = normalized(value);
  return STATUS_ALIASES[status] || status;
}

function parseDate(value: string, field: string): string {
  if (!value) return "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  const date = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new OrderRequestError(`${field} is invalid.`);
  }

  return value;
}

function dateBoundary(value: string, endOfDay = false): string {
  return new Date(
    `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
  ).toISOString();
}

function insideDateRange(
  value: string | undefined,
  after: string | undefined,
  before: string | undefined
): boolean {
  if (!value) return true;

  const timestamp = Date.parse(
    value.endsWith("Z") ? value : `${value}Z`
  );

  if (Number.isNaN(timestamp)) return false;
  if (after && timestamp < Date.parse(after)) return false;
  if (before && timestamp > Date.parse(before)) return false;
  return true;
}

async function fetchOrders(
  paramsBase: Record<string, string | number>
): Promise<WCOrder[]> {
  const woo = await getWooClient();
  const orders: WCOrder[] = [];

  for (let page = 1; page <= 5; page += 1) {
    const response = await woo.get<WCOrder[]>("/orders", {
      params: {
        ...paramsBase,
        per_page: 100,
        page,
      },
    });

    if (!Array.isArray(response.data)) {
      throw new Error("Unexpected order service response");
    }

    orders.push(...response.data);

    if (response.data.length < 100) break;
  }

  return orders;
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams;
    const page = parsePositiveInteger(
      query.get("page") || "1",
      "Page",
      100_000
    );
    const perPage = parsePositiveInteger(
      query.get("per_page") || "20",
      "Rows per page",
      100
    );
    const search = parseBoundedString(
      query.get("s") || "",
      "Search",
      120
    );
    const requestedStatus = canonicalStatus(
      parseBoundedString(
        query.get("status") || "all",
        "Order status",
        32,
        { required: true }
      )
    );
    const dateFrom = parseDate(
      query.get("date_from") || "",
      "Start date"
    );
    const dateTo = parseDate(
      query.get("date_to") || "",
      "End date"
    );

    if (!READABLE_STATUSES.has(requestedStatus)) {
      throw new OrderRequestError("Order status is invalid.");
    }

    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new OrderRequestError(
        "Start date cannot be after end date."
      );
    }

    const after = dateFrom
      ? dateBoundary(dateFrom)
      : undefined;
    const before = dateTo
      ? dateBoundary(dateTo, true)
      : undefined;
    const hints: Record<string, string | number> = {
      orderby: "date",
      order: "desc",
    };

    if (after) hints.after = after;
    if (before) hints.before = before;
    if (search) hints.search = search;

    const raw = await fetchOrders(hints);
    const searchTerm = normalized(search);
    const filtered = raw.filter((order) => {
      if (
        !insideDateRange(
          order.date_created_gmt,
          after,
          before
        )
      ) {
        return false;
      }

      if (searchTerm) {
        const id = String(order.id || "");
        const number = String(order.number || id);
        const customer = [
          order.billing?.first_name,
          order.billing?.last_name,
        ]
          .filter(Boolean)
          .join(" ");
        const fields = [
          id,
          number,
          customer,
          order.billing?.email,
          order.billing?.phone,
        ];

        return (
          fields.some((field) =>
            normalized(field).includes(searchTerm)
          ) ||
          (order.line_items || []).some(
            (item) =>
              normalized(item.sku).includes(searchTerm) ||
              normalized(item.name).includes(searchTerm)
          )
        );
      }

      return (
        requestedStatus === "all" ||
        canonicalStatus(order.status) === requestedStatus
      );
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;

    return privateJson({
      data: filtered.slice(start, start + perPage),
      page,
      per_page: perPage,
      total,
      totalPages,
    });
  } catch (error) {
    logOrderError("list", error);
    return requestErrorResponse(error, "Failed to load orders.");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await readJsonObject(request, 32 * 1024);
    const idsValue = body.ids;

    if (!Array.isArray(idsValue) || idsValue.length === 0) {
      throw new OrderRequestError(
        "At least one order must be selected."
      );
    }

    if (idsValue.length > 50) {
      throw new OrderRequestError(
        "A maximum of 50 orders can be updated at once."
      );
    }

    const ids = [...new Set(idsValue.map(parseOrderId))];
    const action = parseBoundedString(
      body.action,
      "Bulk action",
      20,
      { required: true }
    );
    const woo = await getWooClient();
    const results: Array<{
      id: number;
      status?: string;
    }> = [];

    if (action === "trash") {
      for (const id of ids) {
        const response = await woo.delete(`/orders/${id}`);
        const value: unknown = response.data;
        results.push({
          id,
          status:
            isRecord(value) && typeof value.status === "string"
              ? value.status
              : undefined,
        });
      }
    } else if (action === "status") {
      const status = parseOrderStatus(body.status);

      for (const id of ids) {
        const response = await woo.put(`/orders/${id}`, {
          status,
        });
        const value: unknown = response.data;
        results.push({
          id,
          status:
            isRecord(value) && typeof value.status === "string"
              ? value.status
              : status,
        });
      }
    } else {
      throw new OrderRequestError("Bulk action is invalid.");
    }

    return privateJson({ ok: true, results });
  } catch (error) {
    logOrderError("bulk", error);
    return requestErrorResponse(error, "Bulk order update failed.");
  }
}
