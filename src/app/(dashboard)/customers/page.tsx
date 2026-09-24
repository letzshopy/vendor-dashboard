import {
  ArrowRight,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  headers,
} from "next/headers";

import CustomersSearch from "./CustomersSearch";
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
  formatOrderDate,
} from "@/lib/datetime";

type CustRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  total_spent: number;
  order_count: number;
  date_created?: string;
  first_order?: string;
  last_order?: string;
};

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

async function getCustomers(
  params: URLSearchParams
) {
  const requestHeaders =
    await headers();
  const cookieHeader =
    requestHeaders.get("cookie");
  const base =
    await getBaseUrl();

  const res = await fetch(
    `${base}/api/customers?${params.toString()}`,
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
      "Failed to load customers"
    );
  }

  return res.json() as Promise<{
    items: CustRow[];
    total: number;
    pages: number;
    page: number;
    per_page: number;
    search?: string;
  }>;
}

function initialsFor(
  name: string
): string {
  return (
    name
      .split(" ")
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2) || "?"
  );
}

function customerLocation(
  customer: CustRow
): string {
  return [
    customer.city,
    customer.state,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function pageHref(
  page: number,
  search: string
): string {
  const params =
    new URLSearchParams({
      page: String(page),
    });

  if (search) {
    params.set(
      "search",
      search
    );
  }

  return `/customers?${params.toString()}`;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<
    Record<
      string,
      | string
      | string[]
      | undefined
    >
  >;
}) {
  const sp =
    (await searchParams) ?? {};

  const page = Math.max(
    1,
    parseInt(
      String(sp.page ?? "1"),
      10
    ) || 1
  );

  const search =
    String(
      sp.search ?? ""
    ).trim();

  const perPage = 20;

  const data =
    await getCustomers(
      new URLSearchParams({
        page: String(page),
        per_page:
          String(perPage),
        search,
      })
    );

  const totalPages =
    Math.max(
      1,
      data.pages
    );

  return (
    <main className="ls-page mx-auto max-w-[1440px] pb-28 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Sales"
          icon={Users}
          title="Customers"
          description="Customer contacts and purchase activity."
          actions={
            <div className="text-right">
              <div className="text-2xl font-extrabold tracking-tight text-heading">
                {data.total}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Total customers
              </div>
            </div>
          }
        />
      </div>

      <div className="flex items-baseline gap-1.5 px-0.5 py-0.5 md:hidden">
        <span className="text-[21px] font-extrabold tracking-tight text-heading">
          {data.total}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">
          customer{data.total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 md:mt-5">
        <CustomersSearch
          initialSearch={search}
        />
      </div>

      {search ? (
        <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <span className="shrink-0">
            Results for
          </span>
          <span className="truncate font-semibold text-foreground">
            “{search}”
          </span>
        </div>
      ) : null}

      <Section
        surface="card"
        className="mt-5 overflow-hidden !p-0"
        contentClassName="min-w-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <h2 className="text-sm font-bold text-heading">
            Customer list
          </h2>

          <span className="text-xs font-semibold text-muted-foreground">
            Page {data.page} of{" "}
            {totalPages}
          </span>
        </div>

        {data.items.length ===
        0 ? (
          <EmptyState
            icon={Users}
            title="No customers found"
            description={
              search
                ? "Try a different name, email or phone number."
                : "Customers will appear here after they create an account or place an order."
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {data.items.map(
                (customer) => {
                  const location =
                    customerLocation(
                      customer
                    );

                  return (
                    <Link
                      key={
                        customer.id
                      }
                      href={
                        `/customers/${customer.id}`
                      }
                      className="flex min-h-[92px] min-w-0 items-center gap-3 px-4 py-3 transition hover:bg-muted/70 active:bg-muted"
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-extrabold text-secondary-foreground">
                        {initialsFor(
                          customer.name
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-[15px] font-bold text-heading">
                            {customer.name ||
                              "(guest)"}
                          </span>

                          {customer.order_count >
                          0 ? (
                            <span className="shrink-0 rounded-full bg-surface-soft px-2 py-1 text-[10px] font-bold text-muted-foreground">
                              {
                                customer.order_count
                              }{" "}
                              order
                              {customer.order_count ===
                              1
                                ? ""
                                : "s"}
                            </span>
                          ) : null}
                        </span>

                        <span className="mt-1 block truncate text-sm text-muted-foreground">
                          {customer.email ||
                            customer.phone ||
                            "No contact details"}
                        </span>

                        <span className="mt-1.5 flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
                          {location ? (
                            <span className="flex min-w-0 items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {
                                  location
                                }
                              </span>
                            </span>
                          ) : null}

                          <span className="shrink-0 font-bold text-heading">
                            ₹
                            {customer.total_spent.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </span>
                      </span>

                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </Link>
                  );
                }
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">
                      Customer
                    </th>
                    <th className="px-3 py-3">
                      Phone
                    </th>
                    <th className="px-3 py-3">
                      Location
                    </th>
                    <th className="px-3 py-3 text-right">
                      Orders
                    </th>
                    <th className="px-3 py-3 text-right">
                      Total spent
                    </th>
                    <th className="px-5 py-3">
                      Last activity
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {data.items.map(
                    (
                      customer
                    ) => {
                      const location =
                        customerLocation(
                          customer
                        );

                      return (
                        <tr
                          key={
                            customer.id
                          }
                          className="bg-card transition hover:bg-muted/50"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-extrabold text-secondary-foreground">
                                {initialsFor(
                                  customer.name
                                )}
                              </span>

                              <div className="min-w-0">
                                <Link
                                  href={
                                    `/customers/${customer.id}`
                                  }
                                  className="block truncate font-bold text-heading hover:text-primary"
                                >
                                  {customer.name ||
                                    "(guest)"}
                                </Link>

                                <div className="mt-0.5 max-w-[18rem] truncate text-xs text-muted-foreground">
                                  {customer.email ||
                                    "No email"}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="whitespace-nowrap px-3 py-3.5 text-foreground">
                            {customer.phone ||
                              "—"}
                          </td>

                          <td className="max-w-[18rem] px-3 py-3.5 text-muted-foreground">
                            <span className="block truncate">
                              {location ||
                                "—"}
                            </span>
                          </td>

                          <td className="px-3 py-3.5 text-right font-semibold text-foreground">
                            {
                              customer.order_count
                            }
                          </td>

                          <td className="whitespace-nowrap px-3 py-3.5 text-right font-bold text-heading">
                            ₹
                            {customer.total_spent.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </td>

                          <td
                            className="whitespace-nowrap px-5 py-3.5 text-muted-foreground"
                            suppressHydrationWarning
                          >
                            {customer.last_order
                              ? formatOrderDate(
                                  customer.last_order
                                )
                              : customer.date_created
                                ? `Registered ${formatOrderDate(
                                    customer.date_created
                                  )}`
                                : "No orders yet"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-5">
          <span>
            {data.total} customer
            {data.total === 1
              ? ""
              : "s"}
          </span>

          <div className="flex items-center gap-2">
            {data.page > 1 ? (
              <Link
                href={pageHref(
                  data.page - 1,
                  search
                )}
                className="ls-focus-ring inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-3 font-semibold text-foreground hover:bg-muted"
              >
                Previous
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-muted px-3 font-semibold text-slate-400">
                Previous
              </span>
            )}

            {data.page <
            data.pages ? (
              <Link
                href={pageHref(
                  data.page + 1,
                  search
                )}
                className="ls-focus-ring inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-card px-3 font-semibold text-foreground hover:bg-muted"
              >
                Next
              </Link>
            ) : (
              <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-muted px-3 font-semibold text-slate-400">
                Next
              </span>
            )}
          </div>
        </div>
      </Section>
    </main>
  );
}
