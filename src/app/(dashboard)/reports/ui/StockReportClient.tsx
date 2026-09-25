"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageX,
  Warehouse,
} from "lucide-react";

import {
  Skeleton,
} from "@/components/ui/skeleton";

const ResponsiveContainer =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.ResponsiveContainer
      ),
    {
      ssr: false,
    }
  );

const BarChart =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.BarChart
      ),
    {
      ssr: false,
    }
  );

const Bar =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.Bar
      ),
    {
      ssr: false,
    }
  );

const XAxis =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.XAxis
      ),
    {
      ssr: false,
    }
  );

const YAxis =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.YAxis
      ),
    {
      ssr: false,
    }
  );

const Tooltip =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.Tooltip
      ),
    {
      ssr: false,
    }
  );

const CartesianGrid =
  dynamic(
    () =>
      import(
        "recharts"
      ).then(
        (module) =>
          module.CartesianGrid
      ),
    {
      ssr: false,
    }
  );

const COLORS = {
  bar: "#5366B7",
  grid: "#E5E7EB",
};

type StockApiRow = {
  id: number;
  name: string;
  parent:
    | number
    | null;
  stock_status:
    string;
  stock_quantity:
    | number
    | null;
};

type StockSummary = {
  low: StockApiRow[];
  out: StockApiRow[];
  most: StockApiRow[];
};

function shortLabel(
  text: string,
  max = 12
) {
  if (!text) {
    return "—";
  }

  return text.length >
    max
    ? `${text.slice(
        0,
        max
      )}...`
    : text;
}

function stockLabel(
  value: string
) {
  const status =
    String(
      value || ""
    ).toLowerCase();

  if (
    status ===
    "instock"
  ) {
    return "In stock";
  }

  if (
    status ===
    "outofstock"
  ) {
    return "Out of stock";
  }

  if (
    status ===
    "onbackorder"
  ) {
    return "Backorder";
  }

  return (
    value || "—"
  );
}

export default function StockReportClient() {
  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    data,
    setData,
  ] =
    useState<StockSummary>({
      low: [],
      out: [],
      most: [],
    });

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      try {
        const [
          lowResponse,
          outResponse,
          mostResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/reports/stock/low",
              {
                cache:
                  "no-store",
              }
            ),
            fetch(
              "/api/reports/stock/out",
              {
                cache:
                  "no-store",
              }
            ),
            fetch(
              "/api/reports/stock/most",
              {
                cache:
                  "no-store",
              }
            ),
          ]);

        const lowJson =
          await lowResponse
            .json()
            .catch(
              () => ({})
            );

        const outJson =
          await outResponse
            .json()
            .catch(
              () => ({})
            );

        const mostJson =
          await mostResponse
            .json()
            .catch(
              () => ({})
            );

        if (
          !cancelled
        ) {
          setData({
            low: Array.isArray(
              lowJson?.items
            )
              ? lowJson.items
              : [],
            out: Array.isArray(
              outJson?.items
            )
              ? outJson.items
              : [],
            most:
              Array.isArray(
                mostJson?.items
              )
                ? mostJson.items
                : [],
          });
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics =
    useMemo(() => {
      const total =
        data.most
          .length;

      const inStock =
        data.most.filter(
          (row) =>
            String(
              row.stock_status ||
                ""
            ).toLowerCase() ===
            "instock"
        ).length;

      return {
        total,
        inStock,
        outOfStock:
          data.out
            .length,
        lowStock:
          data.low
            .length,
      };
    }, [data]);

  const chartData =
    useMemo(
      () =>
        data.low
          .slice(0, 8)
          .map(
            (row) => ({
              label:
                shortLabel(
                  row.name
                ),
              fullLabel:
                row.name,
              qty: Number(
                row.stock_quantity ||
                  0
              ),
            })
          ),
      [data.low]
    );

  if (loading) {
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
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        <Metric
          icon={
            <Boxes className="h-4 w-4" />
          }
          label="Products"
          value={String(
            metrics.total
          )}
        />

        <Metric
          icon={
            <PackageCheck className="h-4 w-4" />
          }
          label="In stock"
          value={String(
            metrics.inStock
          )}
        />

        <Metric
          icon={
            <PackageX className="h-4 w-4" />
          }
          label="Out"
          value={String(
            metrics.outOfStock
          )}
        />

        <Metric
          icon={
            <AlertTriangle className="h-4 w-4" />
          }
          label="Low stock"
          value={String(
            metrics.lowStock
          )}
        />
      </div>

      {chartData.length >
      0 ? (
        <section className="hidden rounded-2xl border border-border bg-card p-4 md:block">
          <div className="mb-3 text-sm font-extrabold text-heading">
            Low stock products
          </div>

          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  chartData
                }
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
                  interval={0}
                />
                <YAxis
                  tick={{
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  formatter={(
                    value: any,
                    _name: any,
                    item: any
                  ) => [
                    value,
                    item?.payload
                      ?.fullLabel ||
                      "Qty",
                  ]}
                />
                <Bar
                  dataKey="qty"
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
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
          <div className="text-sm font-extrabold text-heading">
            Low stock list
          </div>

          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            {
              data.low
                .length
            }{" "}
            items
          </span>
        </div>

        <div className="divide-y divide-border md:hidden">
          {data.low.length >
          0 ? (
            data.low
              .slice(0, 20)
              .map(
                (row) => (
                  <article
                    key={
                      row.id
                    }
                    className="p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-heading">
                          {
                            row.name
                          }
                        </div>

                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          Product #
                          {
                            row.id
                          }
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                        {row.stock_quantity ??
                          0}{" "}
                        qty
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Warehouse className="h-3.5 w-3.5" />
                      {stockLabel(
                        row.stock_status
                      )}
                    </div>
                  </article>
                )
              )
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No low stock products.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-7/12" />
              <col className="w-2/12" />
              <col className="w-3/12" />
            </colgroup>

            <thead className="bg-surface-soft text-xs font-bold text-muted-foreground">
              <tr>
                <th className="p-3 text-left">
                  Product
                </th>
                <th className="p-3 text-right">
                  Qty
                </th>
                <th className="p-3 text-left">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {data.low
                .slice(
                  0,
                  20
                )
                .map(
                  (row) => (
                    <tr
                      key={
                        row.id
                      }
                      className="border-t border-border"
                    >
                      <td className="p-3 font-semibold text-heading">
                        {
                          row.name
                        }
                      </td>

                      <td className="p-3 text-right font-bold text-heading">
                        {typeof row.stock_quantity ===
                        "number"
                          ? row.stock_quantity
                          : "—"}
                      </td>

                      <td className="p-3 text-foreground">
                        {stockLabel(
                          row.stock_status
                        )}
                      </td>
                    </tr>
                  )
                )}

              {data.low.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="p-5 text-center text-muted-foreground"
                  >
                    No low stock products.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {data.out.length >
      0 ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
            <div className="text-sm font-extrabold text-heading">
              Out of stock
            </div>

            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
              {
                data.out
                  .length
              }
            </span>
          </div>

          <div className="grid gap-0 divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
            {data.out
              .slice(0, 8)
              .map(
                (row) => (
                  <div
                    key={
                      row.id
                    }
                    className="flex items-center justify-between gap-3 px-3 py-3 md:px-4"
                  >
                    <div className="min-w-0 truncate text-sm font-semibold text-foreground">
                      {
                        row.name
                      }
                    </div>

                    <span className="shrink-0 text-[11px] font-bold text-rose-700">
                      Out
                    </span>
                  </div>
                )
              )}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon:
    React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-3 md:rounded-2xl md:p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span className="hidden sm:inline-flex">
          {icon}
        </span>

        <div className="truncate text-[10px] font-bold uppercase tracking-wide md:text-[11px]">
          {label}
        </div>
      </div>

      <div className="mt-2 text-lg font-extrabold text-heading md:text-2xl">
        {value}
      </div>
    </div>
  );
}
