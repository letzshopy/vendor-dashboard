import { NextRequest } from "next/server";

import {
  billingRecord,
  customerErrorResponse,
  customerIdentity,
  decodeCustomerKey,
  isRecord,
  normalizedAddress,
  normalizedLineItems,
  orderRows,
  privateCustomerJson,
  responseTotalPages,
  safeMoney,
  safePositiveId,
  safeText,
  type JsonRecord,
} from "@/lib/customerPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

function customerRecord(value: unknown): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError("Invalid customer response");
  }
  return value;
}

function registeredCustomerId(decoded: string): number {
  if (!decoded.startsWith("user:")) return 0;
  return safePositiveId(decoded.slice(5));
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const decoded = decodeCustomerKey(id);
    const userId = registeredCustomerId(decoded);
    const isGuest = decoded.startsWith("guest:");
    const woo = await getWooClient();

    let registeredCustomer: JsonRecord | null = null;
    let registeredEmail = "";

    if (userId) {
      const response = await woo.get(
        `/customers/${userId}`,
      );
      registeredCustomer = customerRecord(
        response.data,
      );

      const role = safeText(
        registeredCustomer.role,
        50,
      )
        .trim()
        .toLowerCase();

      if (role && role !== "customer") {
        return privateCustomerJson(
          { error: "Customer account not found" },
          404,
        );
      }

      registeredEmail = safeText(
        registeredCustomer.email,
        254,
      )
        .trim()
        .toLowerCase();
    }

    const first = await woo.get("/orders", {
      params: {
        per_page: 100,
        page: 1,
        order: "desc",
      },
    });

    const orders = orderRows(first.data);
    const totalPages = responseTotalPages(
      first.headers,
      20,
    );

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from(
          { length: totalPages - 1 },
          (_, index) =>
            woo.get("/orders", {
              params: {
                per_page: 100,
                page: index + 2,
                order: "desc",
              },
            }),
        ),
      );

      for (const response of remaining) {
        orders.push(...orderRows(response.data));
      }
    }

    const filtered = orders.filter((order) => {
      const billing = billingRecord(order);
      const identity = customerIdentity(billing);

      if (userId) {
        const orderCustomerId = safePositiveId(
          order.customer_id,
        );
        return (
          orderCustomerId === userId ||
          Boolean(
            registeredEmail &&
              identity.email === registeredEmail,
          )
        );
      }

      return isGuest
        ? identity.key === decoded
        : identity.email === decoded;
    });

    const latest = filtered[0] || {};
    const latestBilling = billingRecord(latest);
    const latestShipping = isRecord(latest.shipping)
      ? latest.shipping
      : {};

    const profileBilling =
      registeredCustomer &&
      isRecord(registeredCustomer.billing)
        ? registeredCustomer.billing
        : latestBilling;

    const profileShipping =
      registeredCustomer &&
      isRecord(registeredCustomer.shipping)
        ? registeredCustomer.shipping
        : latestShipping;

    const totalSpent = filtered.reduce(
      (sum, order) =>
        sum + safeMoney(order.total),
      0,
    );

    const normalizedOrders = filtered.flatMap(
      (order) => {
        const orderId = safePositiveId(order.id);
        if (!orderId) return [];

        return [
          {
            id: orderId,
            number: safeText(order.number, 100),
            status: safeText(order.status, 50),
            date_created_gmt: safeText(
              order.date_created_gmt ||
                order.date_created,
              40,
            ),
            total: safeText(order.total, 50),
            payment_method_title: safeText(
              order.payment_method_title,
              200,
            ),
            line_items: normalizedLineItems(
              order.line_items,
            ),
          },
        ];
      },
    );

    const oldest =
      filtered[filtered.length - 1];

    const email = registeredCustomer
      ? safeText(
          registeredCustomer.email,
          254,
        )
      : safeText(latestBilling.email, 254);

    const firstName = registeredCustomer
      ? safeText(
          registeredCustomer.first_name,
          100,
        )
      : safeText(
          latestBilling.first_name,
          100,
        );

    const lastName = registeredCustomer
      ? safeText(
          registeredCustomer.last_name,
          100,
        )
      : safeText(
          latestBilling.last_name,
          100,
        );

    const dateCreated = registeredCustomer
      ? safeText(
          registeredCustomer.date_created_gmt ||
            registeredCustomer.date_created,
          40,
        ) || null
      : oldest
        ? safeText(
            oldest.date_created_gmt ||
              oldest.date_created,
            40,
          ) || null
        : null;

    return privateCustomerJson({
      customer: {
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        billing: normalizedAddress(
          profileBilling,
          true,
        ),
        shipping: normalizedAddress(
          profileShipping,
        ),
        total_spent: Number(
          totalSpent.toFixed(2),
        ),
        date_created: dateCreated,
      },
      orders: normalizedOrders,
      order_total: normalizedOrders.length,
    });
  } catch (error: unknown) {
    return customerErrorResponse(
      error,
      "Failed to load customer details",
    );
  }
}
