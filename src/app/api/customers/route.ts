import { NextRequest } from "next/server";

import {
  billingRecord,
  customerErrorResponse,
  customerSearch,
  encodeCustomerKey,
  isRecord,
  orderRows,
  positiveQueryInteger,
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

type Customer = {
  id: string;
  user_id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: string;
  total_spent: number;
  order_count: number;
  date_created?: string;
  first_order?: string;
  last_order?: string;
};

function customerRows(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function recordBilling(customer: JsonRecord): JsonRecord {
  return isRecord(customer.billing) ? customer.billing : {};
}

function customerDisplayName(
  customer: JsonRecord,
  billing: JsonRecord,
): string {
  const firstName =
    safeText(customer.first_name, 100).trim() ||
    safeText(billing.first_name, 100).trim();
  const lastName =
    safeText(customer.last_name, 100).trim() ||
    safeText(billing.last_name, 100).trim();

  return (
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    safeText(customer.username, 100).trim() ||
    safeText(customer.email, 254).trim() ||
    "Customer"
  );
}

export async function GET(request: NextRequest) {
  try {
    const page = positiveQueryInteger(
      request.nextUrl.searchParams.get("page"),
      1,
      100_000,
    );
    const perPage = positiveQueryInteger(
      request.nextUrl.searchParams.get("per_page"),
      20,
      50,
    );
    const search = customerSearch(
      request.nextUrl.searchParams.get("search"),
    );
    const woo = await getWooClient();

    const [firstCustomersResponse, firstOrdersResponse] =
      await Promise.all([
        woo.get("/customers", {
          params: {
            per_page: 100,
            page: 1,
            role: "customer",
            order: "desc",
            orderby: "registered_date",
          },
        }),
        woo.get("/orders", {
          params: {
            per_page: 100,
            page: 1,
            order: "desc",
          },
        }),
      ]);

    const registeredCustomers = customerRows(
      firstCustomersResponse.data,
    );
    const orders = orderRows(firstOrdersResponse.data);

    const customerPages = responseTotalPages(
      firstCustomersResponse.headers,
      100,
    );
    const orderPages = responseTotalPages(
      firstOrdersResponse.headers,
      20,
    );

    if (customerPages > 1) {
      const remainingCustomers = await Promise.all(
        Array.from(
          { length: customerPages - 1 },
          (_, index) =>
            woo.get("/customers", {
              params: {
                per_page: 100,
                page: index + 2,
                role: "customer",
                order: "desc",
                orderby: "registered_date",
              },
            }),
        ),
      );

      for (const response of remainingCustomers) {
        registeredCustomers.push(
          ...customerRows(response.data),
        );
      }
    }

    if (orderPages > 1) {
      const remainingOrders = await Promise.all(
        Array.from({ length: orderPages - 1 }, (_, index) =>
          woo.get("/orders", {
            params: {
              per_page: 100,
              page: index + 2,
              order: "desc",
            },
          }),
        ),
      );

      for (const response of remainingOrders) {
        orders.push(...orderRows(response.data));
      }
    }

    const customersByUserId = new Map<number, Customer>();
    const customerByEmail = new Map<string, Customer>();

    for (const customerRecord of registeredCustomers) {
      const userId = safePositiveId(customerRecord.id);
      if (!userId) continue;

      const role = safeText(customerRecord.role, 50)
        .trim()
        .toLowerCase();
      if (role && role !== "customer") continue;

      const billing = recordBilling(customerRecord);
      const email = safeText(customerRecord.email, 254)
        .trim()
        .toLowerCase();

      const customer: Customer = {
        id: encodeCustomerKey(`user:${userId}`),
        user_id: userId,
        name: customerDisplayName(customerRecord, billing),
        email,
        phone: safeText(billing.phone, 50).trim(),
        city: safeText(billing.city, 150).trim(),
        state: safeText(billing.state, 100).trim(),
        country: safeText(billing.country, 10).trim(),
        total_spent: 0,
        order_count: 0,
        date_created:
          safeText(
            customerRecord.date_created_gmt ||
              customerRecord.date_created,
            40,
          ) || undefined,
      };

      customersByUserId.set(userId, customer);
      if (email) customerByEmail.set(email, customer);
    }

    for (const order of orders) {
      const billing = billingRecord(order);
      const orderCustomerId = safePositiveId(
        order.customer_id,
      );
      const billingEmail = safeText(billing.email, 254)
        .trim()
        .toLowerCase();

      const customer =
        customersByUserId.get(orderCustomerId) ||
        (billingEmail
          ? customerByEmail.get(billingEmail)
          : undefined);

      // Guest-only orders remain in Orders. Customers mirrors
      // registered WordPress/WooCommerce customer accounts.
      if (!customer) continue;

      const amount = safeMoney(order.total);
      const date =
        safeText(
          order.date_created_gmt || order.date_created,
          40,
        ) || undefined;

      customer.total_spent += amount;
      customer.order_count += 1;

      if (date) {
        if (
          !customer.first_order ||
          date < customer.first_order
        ) {
          customer.first_order = date;
        }
        if (
          !customer.last_order ||
          date > customer.last_order
        ) {
          customer.last_order = date;
        }
      }

      if (!customer.phone) {
        customer.phone = safeText(
          billing.phone,
          50,
        ).trim();
      }
      if (!customer.city) {
        customer.city = safeText(
          billing.city,
          150,
        ).trim();
      }
      if (!customer.state) {
        customer.state = safeText(
          billing.state,
          100,
        ).trim();
      }
      if (!customer.country) {
        customer.country = safeText(
          billing.country,
          10,
        ).trim();
      }
    }

    let customers = Array.from(
      customersByUserId.values(),
    );

    if (search) {
      customers = customers.filter(
        (customer) =>
          customer.name
            .toLowerCase()
            .includes(search) ||
          customer.email
            .toLowerCase()
            .includes(search) ||
          customer.phone
            .toLowerCase()
            .includes(search),
      );
    }

    customers.sort((left, right) => {
      const leftActivity =
        left.last_order || left.date_created || "";
      const rightActivity =
        right.last_order || right.date_created || "";

      return (
        rightActivity.localeCompare(leftActivity) ||
        left.name.localeCompare(right.name)
      );
    });

    const total = customers.length;
    const pages = Math.max(
      1,
      Math.ceil(total / perPage),
    );
    const start = (page - 1) * perPage;
    const items: JsonRecord[] = customers
      .slice(start, start + perPage)
      .map((customer) => ({
        ...customer,
        total_spent: Number(
          customer.total_spent.toFixed(2),
        ),
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
    return customerErrorResponse(
      error,
      "Failed to load registered customers",
    );
  }
}
