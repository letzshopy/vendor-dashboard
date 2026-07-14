import { NextRequest } from "next/server";

import {
  billingRecord,
  customerErrorResponse,
  customerIdentity,
  customerSearch,
  encodeCustomerKey,
  orderRows,
  positiveQueryInteger,
  privateCustomerJson,
  responseTotalPages,
  safeMoney,
  safeText,
  type JsonRecord,
} from "@/lib/customerPolicy";
import { getWooClient } from "@/lib/woo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  total_spent: number;
  order_count: number;
  first_order?: string;
  last_order?: string;
};

export async function GET(request: NextRequest) {
  try {
    const page = positiveQueryInteger(request.nextUrl.searchParams.get("page"), 1, 100_000);
    const perPage = positiveQueryInteger(request.nextUrl.searchParams.get("per_page"), 20, 50);
    const search = customerSearch(request.nextUrl.searchParams.get("search"));
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

    const customersByKey = new Map<string, Customer>();

    for (const order of orders) {
      const billing = billingRecord(order);
      const identity = customerIdentity(billing);
      const previous = customersByKey.get(identity.key);
      const amount = safeMoney(order.total);
      const date = safeText(order.date_created_gmt || order.date_created, 40) || undefined;

      if (!previous) {
        customersByKey.set(identity.key, {
          id: encodeCustomerKey(identity.key),
          name: identity.name,
          email: identity.email,
          phone: identity.phone,
          city: safeText(billing.city, 150),
          state: safeText(billing.state, 100),
          country: safeText(billing.country, 10),
          total_spent: amount,
          order_count: 1,
          first_order: date,
          last_order: date,
        });
        continue;
      }

      previous.total_spent += amount;
      previous.order_count += 1;

      if (date) {
        if (!previous.first_order || date < previous.first_order) previous.first_order = date;
        if (!previous.last_order || date > previous.last_order) previous.last_order = date;
      }
    }

    let customers = Array.from(customersByKey.values());

    if (search) {
      customers = customers.filter((customer) =>
        customer.name.toLowerCase().includes(search) ||
        customer.email.toLowerCase().includes(search) ||
        customer.phone.toLowerCase().includes(search),
      );
    }

    customers.sort((left, right) => {
      const dateComparison = (right.last_order || "").localeCompare(left.last_order || "");
      return dateComparison || right.total_spent - left.total_spent;
    });

    const total = customers.length;
    const pages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const items: JsonRecord[] = customers.slice(start, start + perPage).map((customer) => ({
      ...customer,
      total_spent: Number(customer.total_spent.toFixed(2)),
    }));

    return privateCustomerJson({
      items,
      total,
      pages,
      page,
      per_page: perPage,
      search,
    });
  } catch (error: unknown) {
    return customerErrorResponse(error, "Failed to load customers");
  }
}
