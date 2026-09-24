import {
  ArrowLeft,
  CalendarDays,
  Mail,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import {
  headers,
} from "next/headers";

import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  PageHeader,
} from "@/components/ui/page-header";
import {
  Section,
} from "@/components/ui/section";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  formatOrderDate,
} from "@/lib/datetime";

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const proto =
    h.get("x-forwarded-proto") ??
    "http";
  const host =
    h.get("x-forwarded-host") ??
    h.get("host");

  return (
    process.env
      .NEXT_PUBLIC_BASE_URL ||
    (
      host
        ? `${proto}://${host}`
        : "http://localhost:3000"
    )
  );
}

type Address = {
  first_name?: string;
  last_name?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
};

type Customer = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  billing?: Address;
  shipping?: Address;
  total_spent: number;
  date_created?: string | null;
};

type Order = {
  id: number;
  number?: string;
  status: string;
  date_created_gmt?: string;
  total: string;
  payment_method_title?: string;
  line_items?: {
    id: number;
    name: string;
    sku?: string;
    quantity: number;
  }[];
};

async function getCustomer(
  id: string
) {
  const requestHeaders =
    await headers();
  const cookieHeader =
    requestHeaders.get("cookie");
  const base =
    await getBaseUrl();

  const res = await fetch(
    `${base}/api/customers/${id}`,
    {
      cache: "no-store",
      headers: cookieHeader
        ? {
            cookie:
              cookieHeader,
          }
        : undefined,
    }
  );

  if (!res.ok) {
    throw new Error(
      "Failed to load customer"
    );
  }

  return res.json() as Promise<{
    customer: Customer;
    orders: Order[];
    order_total: number;
  }>;
}

function formatMoney(
  value: number | string
): string {
  const amount =
    typeof value === "number"
      ? value
      : Number(value || 0);

  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function readableStatus(
  status: string
): string {
  return status
    .replace(/[-_]+/g, " ")
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function AddressSection({
  title,
  address,
}: {
  title: string;
  address?: Address;
}) {
  const fullName = [
    address?.first_name,
    address?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const locality = [
    address?.city,
    address?.state,
    address?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const hasAddress =
    Boolean(
      address &&
        (
          fullName ||
          address.address_1 ||
          address.address_2 ||
          locality ||
          address.country ||
          address.phone
        )
    );

  return (
    <Section
      title={title}
      surface="card"
      className="h-full"
    >
      {hasAddress ? (
        <div className="space-y-1.5 text-sm leading-6 text-foreground">
          {fullName ? (
            <div className="font-bold text-heading">
              {fullName}
            </div>
          ) : null}

          {address?.address_1 ? (
            <div>
              {address.address_1}
            </div>
          ) : null}

          {address?.address_2 ? (
            <div>
              {address.address_2}
            </div>
          ) : null}

          {locality ? (
            <div className="text-muted-foreground">
              {locality}
            </div>
          ) : null}

          {address?.country ? (
            <div className="text-muted-foreground">
              {address.country}
            </div>
          ) : null}

          {address?.phone ? (
            <div className="pt-2 font-semibold text-heading">
              {address.phone}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No address saved.
        </p>
      )}
    </Section>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } =
    await params;

  const {
    customer,
    orders,
    order_total,
  } =
    await getCustomer(id);

  const name =
    [
      customer.first_name,
      customer.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "(guest)";

  const initials =
    name
      .split(" ")
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2) || "?";

  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <PageHeader
        eyebrow="Customer"
        title={name}
        description={
          customer.email ||
          "Customer profile and order history."
        }
        actions={
          <Link
            href="/customers"
            className="ls-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Customers
          </Link>
        }
      />

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 md:px-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
            {initials}
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-heading">
              {name}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {customer.email ? (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {customer.email}
                  </span>
                </span>
              ) : null}

              {customer.date_created ? (
                <span
                  className="flex items-center gap-1.5"
                  suppressHydrationWarning
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Joined{" "}
                  {formatOrderDate(
                    customer.date_created
                  )}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-border md:grid-cols-4">
          <div className="px-4 py-3 md:px-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Orders
            </div>
            <div className="mt-1 text-lg font-extrabold text-heading">
              {order_total}
            </div>
          </div>

          <div className="border-l border-border px-4 py-3 md:px-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Total spent
            </div>
            <div className="mt-1 text-lg font-extrabold text-heading">
              ₹
              {formatMoney(
                customer.total_spent
              )}
            </div>
          </div>

          <div className="border-t border-border px-4 py-3 md:border-l md:border-t-0 md:px-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Billing
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
              {customer.billing?.city ||
                customer.billing?.state ||
                "Not added"}
            </div>
          </div>

          <div className="border-l border-t border-border px-4 py-3 md:border-t-0 md:px-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Shipping
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-foreground">
              {customer.shipping?.city ||
                customer.shipping?.state ||
                "Not added"}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <AddressSection
          title="Billing address"
          address={customer.billing}
        />

        <AddressSection
          title="Shipping address"
          address={customer.shipping}
        />
      </div>

      <Section
        title="Orders"
        description="Purchase history for this customer."
        surface="card"
        className="mt-5 overflow-hidden !p-0"
        contentClassName="min-w-0"
        action={
          orders.length > 0 ? (
            <span className="text-xs font-semibold text-muted-foreground">
              {orders.length} order
              {orders.length === 1
                ? ""
                : "s"}
            </span>
          ) : null
        }
      >
        {orders.length ===
        0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="This customer has not placed an order yet."
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {orders.map(
                (order) => (
                  <Link
                    key={
                      order.id
                    }
                    href={
                      `/orders/${order.id}`
                    }
                    className="block px-4 py-3 transition hover:bg-muted/60 active:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-heading">
                          #
                          {order.number ||
                            order.id}
                        </div>

                        <div
                          className="mt-1 text-xs text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {order.date_created_gmt
                            ? formatOrderDate(
                                order.date_created_gmt
                              )
                            : "—"}
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          order.status
                        }
                        label={readableStatus(
                          order.status
                        )}
                      />
                    </div>

                    {(order.line_items ||
                      []).length >
                    0 ? (
                      <div className="mt-3 space-y-1 text-sm text-foreground">
                        {(
                          order.line_items ||
                          []
                        )
                          .slice(0, 2)
                          .map(
                            (
                              item
                            ) => (
                              <div
                                key={
                                  item.id
                                }
                                className="truncate"
                              >
                                {
                                  item.name
                                }{" "}
                                ×{" "}
                                {
                                  item.quantity
                                }
                              </div>
                            )
                          )}

                        {(order.line_items ||
                          []).length >
                        2 ? (
                          <div className="text-xs text-muted-foreground">
                            +
                            {(order.line_items ||
                              []).length -
                              2}{" "}
                            more
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-muted-foreground">
                        {order.payment_method_title ||
                          "Payment method unavailable"}
                      </span>

                      <span className="shrink-0 font-extrabold text-heading">
                        ₹
                        {formatMoney(
                          order.total
                        )}
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">
                      Order
                    </th>
                    <th className="px-3 py-3">
                      Date
                    </th>
                    <th className="px-3 py-3">
                      Items
                    </th>
                    <th className="px-3 py-3">
                      Status
                    </th>
                    <th className="px-3 py-3 text-right">
                      Total
                    </th>
                    <th className="px-5 py-3">
                      Payment
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {orders.map(
                    (
                      order
                    ) => (
                      <tr
                        key={
                          order.id
                        }
                        className="transition hover:bg-muted/50"
                      >
                        <td className="px-5 py-3.5">
                          <Link
                            href={
                              `/orders/${order.id}`
                            }
                            className="font-bold text-heading hover:text-primary"
                          >
                            #
                            {order.number ||
                              order.id}
                          </Link>
                        </td>

                        <td
                          className="whitespace-nowrap px-3 py-3.5 text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {order.date_created_gmt
                            ? formatOrderDate(
                                order.date_created_gmt
                              )
                            : "—"}
                        </td>

                        <td className="max-w-[28rem] px-3 py-3.5">
                          <div className="space-y-1">
                            {(order.line_items ||
                              []).map(
                                (
                                  item
                                ) => (
                                  <div
                                    key={
                                      item.id
                                    }
                                    className="truncate text-foreground"
                                  >
                                    {
                                      item.name
                                    }
                                    {item.sku
                                      ? ` (${item.sku})`
                                      : ""}{" "}
                                    ×{" "}
                                    {
                                      item.quantity
                                    }
                                  </div>
                                )
                              )}
                          </div>
                        </td>

                        <td className="px-3 py-3.5">
                          <StatusBadge
                            status={
                              order.status
                            }
                            label={readableStatus(
                              order.status
                            )}
                          />
                        </td>

                        <td className="whitespace-nowrap px-3 py-3.5 text-right font-extrabold text-heading">
                          ₹
                          {formatMoney(
                            order.total
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground">
                          {order.payment_method_title ||
                            "—"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>
    </main>
  );
}
