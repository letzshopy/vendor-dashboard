"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

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

function formatINR(n?: number) {
  const num = Number.isFinite(n as number) ? (n as number) : 0;
  return `₹${num.toFixed(2)}`;
}

type OrdersTab = "date" | "product" | "category";

export default function OrdersReportClient() {
  const [tab, setTab] = useState<OrdersTab>("date");
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
            orders: r.orders,
            items: r.items,
            gross: Number(r.gross || 0),
          }))
        : [],
    [tab, data]
  );

  const barSeries = useMemo(
    () =>
      tab !== "date" && data?.rows
        ? data.rows.map((r: any) => ({
            label: tab === "product" ? r.name : r.category,
            qty: Number(r.qty || 0),
            total: Number(r.total || 0),
          }))
        : [],
    [tab, data]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Orders</h2>
        </div>

        <div className="inline-flex items-center rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setTab("date")}
            className={`rounded-full px-3 py-1.5 text-xs transition sm:text-sm ${
              tab === "date"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sales by date
          </button>
          <button
            onClick={() => setTab("product")}
            className={`rounded-full px-3 py-1.5 text-xs transition sm:text-sm ${
              tab === "product"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sales by product
          </button>
          <button
            onClick={() => setTab("category")}
            className={`rounded-full px-3 py-1.5 text-xs transition sm:text-sm ${
              tab === "category"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sales by category
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 px-3 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
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
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-slate-500">To</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
          />
        </div>

        <button
          onClick={run}
          className="ml-auto inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 sm:text-sm"
        >
          {loading ? "Loading..." : "Go"}
        </button>
      </div>

      {tab === "date" && data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Gross sales" value={formatINR(data?.totals?.gross)} />
            <Metric label="Orders placed" value={String(data?.totals?.orders ?? 0)} />
            <Metric label="Items purchased" value={String(data?.totals?.items ?? 0)} />
            <Metric label="Shipping charged" value={formatINR(data?.totals?.shipping)} />
            <Metric label="Refunds" value={formatINR(data?.totals?.refunds)} />
          </div>

          {dateSeries.length > 0 && (
            <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-2 text-sm font-medium text-slate-900">
                Gross sales over time
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dateSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(v: any, n) => (n === "gross" ? formatINR(v) : v)} />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke={COLORS.line}
                      activeDot={{ r: 4 }}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
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
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-right">Orders</th>
                  <th className="p-2 text-right">Items</th>
                  <th className="p-2 text-right">Gross</th>
                  <th className="p-2 text-right">Shipping</th>
                  <th className="p-2 text-right">Refunds</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.date} className="border-t border-slate-100">
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 text-right">{r.orders}</td>
                    <td className="p-2 text-right">{r.items}</td>
                    <td className="p-2 text-right">{formatINR(r.gross)}</td>
                    <td className="p-2 text-right">{formatINR(r.shipping)}</td>
                    <td className="p-2 text-right">{formatINR(r.refunds)}</td>
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
      )}

      {tab !== "date" && data && (
        <>
          {barSeries.length > 0 && (
            <div className="mb-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="mb-2 text-sm font-medium text-slate-900">
                {tab === "product" ? "Top products by sales" : "Sales by category"}
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barSeries.slice(0, 12)}
                    margin={{ top: 5, right: 10, left: 0, bottom: 30 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      height={50}
                    />
                    <YAxis />
                    <Tooltip formatter={(v: any, n) => (n === "total" ? formatINR(v) : v)} />
                    <Bar dataKey="total" fill={COLORS.bar} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-8/12" />
                <col className="w-2/12" />
                <col className="w-2/12" />
              </colgroup>
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="p-2 text-left">
                    {tab === "product" ? "Product" : "Category"}
                  </th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r: any, idx: number) => (
                  <tr
                    key={(tab === "product" ? r.product_id : r.category) || idx}
                    className="border-t border-slate-100"
                  >
                    <td className="p-2">{tab === "product" ? r.name : r.category}</td>
                    <td className="p-2 text-right">{r.qty}</td>
                    <td className="p-2 text-right">{formatINR(r.total)}</td>
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
                    <td className="p-2 text-right">Totals</td>
                    <td className="p-2 text-right">{data?.totals?.qty ?? 0}</td>
                    <td className="p-2 text-right">{formatINR(data?.totals?.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}