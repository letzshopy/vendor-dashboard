"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  CalendarDays,
  ChartColumn,
  Filter,
  Package2,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart),
  { ssr: false }
);
const Line = dynamic(() => import("recharts").then((m) => m.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});

const COLORS = {
  line: "#6366F1",
  bar: "#60A5FA",
  grid: "#E5E7EB",
};

type OrdersSubTab = "date" | "product" | "category";

function formatINR(n?: number) {
  const num = Number.isFinite(n as number) ? (n as number) : 0;
  return `₹${num.toFixed(2)}`;
}

function shortLabel(text: string, max = 16) {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function OrdersReportClient() {
  const [tab, setTab] = useState<OrdersSubTab>("date");
  const params = useSearchParams();
  const router = useRouter();

  const [dateFrom, setDateFrom] = useState<string>(String(params.get("rf") || ""));
  const [dateTo, setDateTo] = useState<string>(String(params.get("rtf") || ""));
  const [status, setStatus] = useState<string>(String(params.get("rs") || "all"));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  async function fetchReport(opts: { rf: string; rt: string; rs: string }) {
    setLoading(true);
    try {
      const usp = new URLSearchParams({
        date_from: opts.rf,
        date_to: opts.rt,
        status: opts.rs,
      });

      const path =
        tab === "date"
          ? "/api/reports/orders/sales-by-date"
          : tab === "product"
          ? "/api/reports/orders/sales-by-product"
          : "/api/reports/orders/sales-by-category";

      const res = await fetch(`${path}?${usp.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setData(json);

      const keep = new URLSearchParams(window.location.search);
      keep.set("rt", "orders");

      if (opts.rf) keep.set("rf", opts.rf);
      else keep.delete("rf");

      if (opts.rt) keep.set("rtf", opts.rt);
      else keep.delete("rtf");

      keep.set("rs", opts.rs || "all");
      router.replace(`/reports?${keep.toString()}`);
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    await fetchReport({
      rf: dateFrom,
      rt: dateTo,
      rs: status,
    });
    setFilterOpen(false);
  }

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const defaults = { rf: "", rt: "", rs: "all" };
    setStatus(defaults.rs);
    setDateFrom(defaults.rf);
    setDateTo(defaults.rt);
    setData(null);

    const url = new URL(window.location.href);
    url.searchParams.set("rt", "orders");
    url.searchParams.delete("rf");
    url.searchParams.delete("rtf");
    url.searchParams.set("rs", "all");
    window.history.replaceState({}, "", url.toString());

    fetchReport(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const dateSeries = useMemo(
    () =>
      tab === "date" && data?.rows
        ? data.rows.map((r: any) => ({
            date: r.date,
            orders: Number(r.orders || 0),
            items: Number(r.items || 0),
            gross: Number(r.gross || 0),
          }))
        : [],
    [tab, data]
  );

  const barSeries = useMemo(
    () =>
      tab !== "date" && data?.rows
        ? data.rows.map((r: any) => ({
            label:
              tab === "product"
                ? shortLabel(String(r.name || ""))
                : shortLabel(String(r.category || "")),
            fullLabel:
              tab === "product" ? String(r.name || "") : String(r.category || ""),
            qty: Number(r.qty || 0),
            total: Number(r.total || 0),
          }))
        : [],
    [tab, data]
  );

  if (
    loading &&
    !data
  ) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {Array.from({
            length: 4,
          }).map(
            (
              _,
              index
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-24 rounded-xl md:h-28 md:rounded-2xl"
              />
            )
          )}
        </div>

        <Skeleton className="h-72 rounded-xl md:rounded-2xl" />
      </div>
    );
  }

  return (
    <section className="space-y-3 md:space-y-4">
      <div className="space-y-2 md:flex md:items-center md:justify-between md:gap-2 md:space-y-0">
        <div className="grid w-full grid-cols-3 rounded-xl bg-surface-soft p-1 md:inline-flex md:w-auto md:flex-none md:rounded-2xl">
          {(
            [
              [
                "date",
                "By date",
              ],
              [
                "product",
                "By product",
              ],
              [
                "category",
                "By category",
              ],
            ] as const
          ).map(
            ([
              key,
              label,
            ]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setTab(key)
                }
                className={[
                  "ls-focus-ring min-h-9 whitespace-nowrap rounded-lg px-1.5 text-[11px] font-bold transition md:min-h-10 md:rounded-xl md:px-4 md:text-sm",
                  tab === key
                    ? "bg-card text-heading shadow-sm"
                    : "text-muted-foreground hover:text-heading",
                ].join(
                  " "
                )}
              >
                {label}
              </button>
            )
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-center md:hidden"
          onClick={() =>
            setFilterOpen(
              true
            )
          }
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
        </Button>
      </div>

      <div className="hidden rounded-2xl border border-border bg-card p-3 md:block">
        <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value
              )
            }
            className="ls-focus-ring h-11 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="all">
              All statuses
            </option>
            <option value="processing">
              Processing
            </option>
            <option value="completed">
              Completed
            </option>
            <option value="cancelled">
              Cancelled
            </option>
            <option value="refunded">
              Refunded
            </option>
            <option value="on-hold">
              On hold
            </option>
            <option value="pending">
              Pending payment
            </option>
          </select>

          <Input
            type="date"
            value={
              dateFrom
            }
            onChange={(
              event
            ) =>
              setDateFrom(
                event.target
                  .value
              )
            }
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(
              event
            ) =>
              setDateTo(
                event.target
                  .value
              )
            }
          />

          <AsyncButton
            type="button"
            loading={loading}
            loadingLabel="Loading…"
            onClick={() =>
              void run()
            }
          >
            Apply
          </AsyncButton>
        </div>
      </div>

      {tab ===
        "date" &&
      data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-5">
            <Metric
              className="col-span-2 md:col-span-1"
              icon={
                <Wallet className="h-4 w-4" />
              }
              label="Gross sales"
              value={formatINR(
                data?.totals
                  ?.gross
              )}
            />
            <Metric
              icon={
                <ShoppingCart className="h-4 w-4" />
              }
              label="Orders"
              value={String(
                data?.totals
                  ?.orders ??
                  0
              )}
            />
            <Metric
              icon={
                <Package2 className="h-4 w-4" />
              }
              label="Items"
              value={String(
                data?.totals
                  ?.items ??
                  0
              )}
            />
            <Metric
              icon={
                <Truck className="h-4 w-4" />
              }
              label="Shipping"
              value={formatINR(
                data?.totals
                  ?.shipping
              )}
            />
            <Metric
              icon={
                <ChartColumn className="h-4 w-4" />
              }
              label="Refunds"
              value={formatINR(
                data?.totals
                  ?.refunds
              )}
            />
          </div>

          {dateSeries.length >
          0 && isDesktop ? (
            <div className="hidden rounded-2xl border border-border bg-card p-4 md:block">
              <div className="mb-3 text-sm font-extrabold text-heading">
                Gross sales trend
              </div>

              <div className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <LineChart
                    data={
                      dateSeries
                    }
                    margin={{
                      top: 5,
                      right: 10,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke={
                        COLORS.grid
                      }
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                      }}
                      minTickGap={
                        24
                      }
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      formatter={(
                        value: any,
                        name
                      ) =>
                        name ===
                        "gross"
                          ? formatINR(
                              value
                            )
                          : value
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke={
                        COLORS.line
                      }
                      strokeWidth={
                        2
                      }
                      activeDot={{
                        r: 4,
                      }}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
            <div className="border-b border-border px-3 py-3 md:px-4">
              <div className="text-sm font-extrabold text-heading">
                Sales by date
              </div>
            </div>

            <div className="divide-y divide-border md:hidden">
              {data.rows.length >
              0 ? (
                data.rows.map(
                  (
                    row: any
                  ) => (
                    <div
                      key={
                        row.date
                      }
                      className="p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div className="text-sm font-bold text-heading">
                            {
                              row.date
                            }
                          </div>
                        </div>

                        <div className="text-sm font-extrabold text-heading">
                          {formatINR(
                            row.gross
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <MiniInfo
                          label="Orders"
                          value={String(
                            row.orders
                          )}
                        />
                        <MiniInfo
                          label="Items"
                          value={String(
                            row.items
                          )}
                        />
                        <MiniInfo
                          label="Shipping"
                          value={formatINR(
                            row.shipping
                          )}
                        />
                        <MiniInfo
                          label="Refunds"
                          value={formatINR(
                            row.refunds
                          )}
                        />
                      </div>
                    </div>
                  )
                )
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No data for this range.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-surface-soft text-xs font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">
                      Date
                    </th>
                    <th className="p-3 text-right">
                      Orders
                    </th>
                    <th className="p-3 text-right">
                      Items
                    </th>
                    <th className="p-3 text-right">
                      Gross
                    </th>
                    <th className="p-3 text-right">
                      Shipping
                    </th>
                    <th className="p-3 text-right">
                      Refunds
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map(
                    (
                      row: any
                    ) => (
                      <tr
                        key={
                          row.date
                        }
                        className="border-t border-border"
                      >
                        <td className="p-3 text-foreground">
                          {
                            row.date
                          }
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {
                            row.orders
                          }
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {
                            row.items
                          }
                        </td>
                        <td className="p-3 text-right font-bold text-heading">
                          {formatINR(
                            row.gross
                          )}
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {formatINR(
                            row.shipping
                          )}
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {formatINR(
                            row.refunds
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {data.rows.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-5 text-center text-muted-foreground"
                      >
                        No data for this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab !==
        "date" &&
      data ? (
        <div className="space-y-4">
          {barSeries.length >
          0 && isDesktop ? (
            <div className="hidden rounded-2xl border border-border bg-card p-4 md:block">
              <div className="mb-3 text-sm font-extrabold text-heading">
                {tab ===
                "product"
                  ? "Top products by sales"
                  : "Sales by category"}
              </div>

              <div className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={barSeries.slice(
                      0,
                      8
                    )}
                    margin={{
                      top: 5,
                      right: 10,
                      left: 0,
                      bottom: 18,
                    }}
                  >
                    <CartesianGrid
                      stroke={
                        COLORS.grid
                      }
                      strokeDasharray="3 3"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{
                        fontSize: 11,
                      }}
                      interval={
                        0
                      }
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      formatter={(
                        value: any,
                        name: any,
                        item: any
                      ) =>
                        name ===
                        "total"
                          ? [
                              formatINR(
                                value
                              ),
                              item
                                ?.payload
                                ?.fullLabel ||
                                "Total",
                            ]
                          : [
                              value,
                              "Qty",
                            ]
                      }
                    />
                    <Bar
                      dataKey="total"
                      fill={
                        COLORS.bar
                      }
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
            <div className="border-b border-border px-3 py-3 md:px-4">
              <div className="text-sm font-extrabold text-heading">
                {tab ===
                "product"
                  ? "Sales by product"
                  : "Sales by category"}
              </div>
            </div>

            <div className="divide-y divide-border md:hidden">
              {data.rows.length >
              0 ? (
                data.rows.map(
                  (
                    row: any,
                    index: number
                  ) => {
                    const label =
                      tab ===
                      "product"
                        ? String(
                            row.name ||
                              "—"
                          )
                        : String(
                            row.category ||
                              "—"
                          );

                    return (
                      <div
                        key={
                          (
                            tab ===
                            "product"
                              ? row.product_id
                              : row.category
                          ) ||
                          index
                        }
                        className="p-3"
                      >
                        <div className="text-sm font-bold text-heading">
                          {
                            label
                          }
                        </div>

                        <div className="mt-2.5 grid grid-cols-2 gap-2">
                          <MiniInfo
                            label="Qty"
                            value={String(
                              row.qty ||
                                0
                            )}
                          />
                          <MiniInfo
                            label="Total"
                            value={formatINR(
                              row.total
                            )}
                          />
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No data for this range.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-surface-soft text-xs font-bold text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">
                      {tab ===
                      "product"
                        ? "Product"
                        : "Category"}
                    </th>
                    <th className="p-3 text-right">
                      Qty
                    </th>
                    <th className="p-3 text-right">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map(
                    (
                      row: any,
                      index: number
                    ) => (
                      <tr
                        key={
                          (
                            tab ===
                            "product"
                              ? row.product_id
                              : row.category
                          ) ||
                          index
                        }
                        className="border-t border-border"
                      >
                        <td className="p-3 text-foreground">
                          {tab ===
                          "product"
                            ? row.name
                            : row.category}
                        </td>
                        <td className="p-3 text-right text-foreground">
                          {
                            row.qty
                          }
                        </td>
                        <td className="p-3 text-right font-bold text-heading">
                          {formatINR(
                            row.total
                          )}
                        </td>
                      </tr>
                    )
                  )}

                  {data.rows.length ===
                  0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="p-5 text-center text-muted-foreground"
                      >
                        No data for this range.
                      </td>
                    </tr>
                  ) : null}
                </tbody>

                {data.rows.length >
                0 ? (
                  <tfoot>
                    <tr className="border-t border-border font-bold text-heading">
                      <td className="p-3 text-right">
                        Totals
                      </td>
                      <td className="p-3 text-right">
                        {data
                          ?.totals
                          ?.qty ??
                          0}
                      </td>
                      <td className="p-3 text-right">
                        {formatINR(
                          data
                            ?.totals
                            ?.total
                        )}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          </div>
        </div>
      ) : null}

      <BottomSheet
        open={filterOpen}
        onOpenChange={
          setFilterOpen
        }
        title="Report filters"
        description="Choose order status and date range."
        popupClassName="md:mx-auto md:max-w-lg"
      >
        <div className="space-y-3">
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value
              )
            }
            className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
          >
            <option value="all">
              All statuses
            </option>
            <option value="processing">
              Processing
            </option>
            <option value="completed">
              Completed
            </option>
            <option value="cancelled">
              Cancelled
            </option>
            <option value="refunded">
              Refunded
            </option>
            <option value="on-hold">
              On hold
            </option>
            <option value="pending">
              Pending payment
            </option>
          </select>

          <Input
            type="date"
            value={
              dateFrom
            }
            onChange={(
              event
            ) =>
              setDateFrom(
                event.target
                  .value
              )
            }
          />

          <Input
            type="date"
            value={dateTo}
            onChange={(
              event
            ) =>
              setDateTo(
                event.target
                  .value
              )
            }
          />

          <AsyncButton
            type="button"
            loading={loading}
            loadingLabel="Loading…"
            className="w-full"
            onClick={() =>
              void run()
            }
          >
            Apply Filters
          </AsyncButton>
        </div>
      </BottomSheet>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4 ${className}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <div className="text-[10px] font-bold uppercase tracking-wide md:text-[11px]">
          {label}
        </div>
      </div>
      <div className="mt-2 text-lg font-extrabold text-heading md:mt-3 md:text-xl">
        {value}
      </div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-soft px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-heading">
        {value}
      </div>
    </div>
  );
}

