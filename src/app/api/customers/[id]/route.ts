import { NextRequest } from "next/server";

import {
  billingRecord,
  customerErrorResponse,
  customerIdentity,
  decodeCustomerKey,
  normalizedAddress,
  normalizedLineItems,
  orderRows,
  privateCustomerJson,
  responseTotalPages,
  safeMoney,
  safePositiveId,
  safeText,
} from "@/lib/customerPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const decoded = decodeCustomerKey(id);
    const isGuest = decoded.startsWith("guest:");
    const woo = await getWooClient();
    const first = await woo.get("/orders", {
      params: { per_page: 100, page: 1, order: "desc" },
    });

    const orders = orderRows(first.data);
    const totalPages = responseTotalPages(first.headers, 20);

    if (totalPages > 1) {
      const remaining = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          woo.get("/orders", {
            params: { per_page: 100, page: index + 2, order: "desc" },
          }),
        ),
      );
      for (const response of remaining) orders.push(...orderRows(response.data));
    }

    const filtered = orders.filter((order) => {
      const identity = customerIdentity(billingRecord(order));
      return isGuest ? identity.key === decoded : identity.email === decoded;
    });

    const latest = filtered[0] || {};
    const billing = billingRecord(latest);
    const shipping = normalizedAddress(latest.shipping);
    const normalizedBilling = normalizedAddress(billing, true);
    const totalSpent = filtered.reduce((sum, order) => sum + safeMoney(order.total), 0);

    const normalizedOrders = filtered.flatMap((order) => {
      const orderId = safePositiveId(order.id);
      if (!orderId) return [];

      return [{
        id: orderId,
        number: safeText(order.number, 100),
        status: safeText(order.status, 50),
        date_created_gmt: safeText(order.date_created_gmt || order.date_created, 40),
        total: safeText(order.total, 50),
        payment_method_title: safeText(order.payment_method_title, 200),
        line_items: normalizedLineItems(order.line_items),
      }];
    });

    const oldest = filtered[filtered.length - 1];

    return privateCustomerJson({
      customer: {
        id,
        email: safeText(billing.email, 254),
        first_name: safeText(billing.first_name, 100),
        last_name: safeText(billing.last_name, 100),
        billing: normalizedBilling,
        shipping,
        total_spent: Number(totalSpent.toFixed(2)),
        date_created: oldest
          ? safeText(oldest.date_created_gmt || oldest.date_created, 40) || null
          : null,
      },
      orders: normalizedOrders,
      order_total: normalizedOrders.length,
    });
  } catch (error: unknown) {
    return customerErrorResponse(error, "Failed to load customer details");
  }
}
