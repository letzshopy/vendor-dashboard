"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  CalendarDays,
  ChartColumn,
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
    await fetchReport({ rf: dateFrom, rt: dateTo, rs: status });
  }

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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
        </div>

        <div className="inline-flex w-full flex-wrap items-center rounded-[20px] bg-slate-100 p-1 sm:w-fit">
          <button
            onClick={() => setTab("date")}
            className={`rounded-[16px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === "date"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            By date
          </button>
          <button
            onClick={() => setTab("product")}
            className={`rounded-[16px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === "product"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            By product
          </button>
          <button
            onClick={() => setTab("category")}
            className={`rounded-[16px] px-3 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === "category"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            By category
          </button>
        </div>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All statuses</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="on-hold">On hold</option>
              <option value="pending">Pending payment</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-500">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={run}
              className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Loading..." : "Apply"}
            </button>
          </div>
        </div>
      </div>

      {tab === "date" && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric
              icon={<Wallet className="h-4 w-4" />}
              label="Gross sales"
              value={formatINR(data?.totals?.gross)}
            />
            <Metric
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Orders"
              value={String(data?.totals?.orders ?? 0)}
            />
            <Metric
              icon={<Package2 className="h-4 w-4" />}
              label="Items"
              value={String(data?.totals?.items ?? 0)}
            />
            <Metric
              icon={<Truck className="h-4 w-4" />}
              label="Shipping"
              value={formatINR(data?.totals?.shipping)}
            />
            <Metric
              icon={<ChartColumn className="h-4 w-4" />}
              label="Refunds"
              value={formatINR(data?.totals?.refunds)}
            />
          </div>

          {dateSeries.length > 0 && (
            <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Gross sales trend
              </div>
              <div className="h-60 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dateSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      minTickGap={24}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: any, n) => (n === "gross" ? formatINR(v) : v)} />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke={COLORS.line}
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">Sales by date</div>
            </div>

            <div className="block md:hidden">
              {data.rows.length > 0 ? (
                <div className="space-y-2 p-3">
                  {data.rows.map((r: any) => (
                    <div
                      key={r.date}
                      className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-slate-500" />
                          <div className="text-sm font-semibold text-slate-900">
                            {r.date}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatINR(r.gross)}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <MiniInfo label="Orders" value={String(r.orders)} />
                        <MiniInfo label="Items" value={String(r.items)} />
                        <MiniInfo label="Shipping" value={formatINR(r.shipping)} />
                        <MiniInfo label="Refunds" value={formatINR(r.refunds)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center text-sm text-slate-500">
                  No data for this range.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-right">Orders</th>
                    <th className="p-3 text-right">Items</th>
                    <th className="p-3 text-right">Gross</th>
                    <th className="p-3 text-right">Shipping</th>
                    <th className="p-3 text-right">Refunds</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any) => (
                    <tr key={r.date} className="border-t border-slate-100">
                      <td className="p-3">{r.date}</td>
                      <td className="p-3 text-right">{r.orders}</td>
                      <td className="p-3 text-right">{r.items}</td>
                      <td className="p-3 text-right">{formatINR(r.gross)}</td>
                      <td className="p-3 text-right">{formatINR(r.shipping)}</td>
                      <td className="p-3 text-right">{formatINR(r.refunds)}</td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-500">
                        No data for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab !== "date" && data && (
        <div className="space-y-4">
          {barSeries.length > 0 && (
            <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                {tab === "product" ? "Top products by sales" : "Sales by category"}
              </div>
              <div className="h-60 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barSeries.slice(0, 8)}
                    margin={{ top: 5, right: 10, left: 0, bottom: 18 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: any, n: any, item: any) =>
                        n === "total"
                          ? [formatINR(v), item?.payload?.fullLabel || "Total"]
                          : [v, "Qty"]
                      }
                    />
                    <Bar dataKey="total" fill={COLORS.bar} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">
                {tab === "product" ? "Sales by product" : "Sales by category"}
              </div>
            </div>

            <div className="block md:hidden">
              {data.rows.length > 0 ? (
                <div className="space-y-2 p-3">
                  {data.rows.map((r: any, idx: number) => {
                    const label =
                      tab === "product" ? String(r.name || "—") : String(r.category || "—");

                    return (
                      <div
                        key={(tab === "product" ? r.product_id : r.category) || idx}
                        className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="text-sm font-semibold text-slate-900">
                          {label}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <MiniInfo label="Qty" value={String(r.qty || 0)} />
                          <MiniInfo label="Total" value={formatINR(r.total)} />
                        </div>
                      </div>
                    );
                  })}

                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      <span>Totals</span>
                      <span>{formatINR(data?.totals?.total)}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Qty: {data?.totals?.qty ?? 0}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center text-sm text-slate-500">
                  No data for this range.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-8/12" />
                  <col className="w-2/12" />
                  <col className="w-2/12" />
                </colgroup>
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-3 text-left">
                      {tab === "product" ? "Product" : "Category"}
                    </th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any, idx: number) => (
                    <tr
                      key={(tab === "product" ? r.product_id : r.category) || idx}
                      className="border-t border-slate-100"
                    >
                      <td className="p-3">
                        {tab === "product" ? r.name : r.category}
                      </td>
                      <td className="p-3 text-right">{r.qty}</td>
                      <td className="p-3 text-right">{formatINR(r.total)}</td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500">
                        No data for this range.
                      </td>
                    </tr>
                  )}
                </tbody>
                {data.rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-slate-100 font-medium">
                      <td className="p-3 text-right">Totals</td>
                      <td className="p-3 text-right">{data?.totals?.qty ?? 0}</td>
                      <td className="p-3 text-right">{formatINR(data?.totals?.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <div className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </div>
      </div>
      <div className="mt-3 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}