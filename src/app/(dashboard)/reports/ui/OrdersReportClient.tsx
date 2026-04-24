"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Boxes, PackageCheck, PackageX } from "lucide-react";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const BarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
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

const COLORS = {
  bar: "#60A5FA",
  grid: "#E5E7EB",
};

type StockRow = {
  id: number;
  name: string;
  sku?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
};

export default function StockReportClient() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products/all", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        const list = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];
        setRows(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    let total = 0;
    let inStock = 0;
    let outOfStock = 0;
    let lowStock = 0;

    rows.forEach((r) => {
      total += 1;

      const qty =
        typeof r.stock_quantity === "number" ? r.stock_quantity : null;
      const status = String(r.stock_status || "").toLowerCase();

      if (status === "instock") inStock += 1;
      if (status === "outofstock") outOfStock += 1;
      if (qty !== null && qty > 0 && qty <= 5) lowStock += 1;
    });

    return { total, inStock, outOfStock, lowStock };
  }, [rows]);

  const topLowStock = useMemo(() => {
    return rows
      .filter(
        (r) =>
          typeof r.stock_quantity === "number" &&
          r.stock_quantity >= 0 &&
          r.stock_quantity <= 10
      )
      .sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0))
      .slice(0, 12);
  }, [rows]);

  const chartData = useMemo(
    () =>
      topLowStock.map((r) => ({
        label: r.name.length > 18 ? `${r.name.slice(0, 18)}...` : r.name,
        qty: Number(r.stock_quantity || 0),
      })),
    [topLowStock]
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Stock</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Boxes className="h-4 w-4" />}
          label="Total products"
          value={String(metrics.total)}
        />
        <Metric
          icon={<PackageCheck className="h-4 w-4" />}
          label="In stock"
          value={String(metrics.inStock)}
        />
        <Metric
          icon={<PackageX className="h-4 w-4" />}
          label="Out of stock"
          value={String(metrics.outOfStock)}
        />
        <Metric
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Low stock"
          value={String(metrics.lowStock)}
          accent
        />
      </div>

      {chartData.length > 0 && (
        <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-2 text-sm font-medium text-slate-900">
            Low stock products
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
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
                <Tooltip />
                <Bar dataKey="qty" fill={COLORS.bar} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-6/12" />
            <col className="w-2/12" />
            <col className="w-2/12" />
            <col className="w-2/12" />
          </colgroup>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-right">Qty</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {topLowStock.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2 text-slate-900">{r.name}</td>
                <td className="p-2 text-slate-600">{r.sku || "—"}</td>
                <td className="p-2 text-right font-medium text-slate-900">
                  {typeof r.stock_quantity === "number" ? r.stock_quantity : "—"}
                </td>
                <td className="p-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                      String(r.stock_status || "").toLowerCase() === "instock"
                        ? "bg-emerald-50 text-emerald-700"
                        : String(r.stock_status || "").toLowerCase() === "outofstock"
                        ? "bg-rose-50 text-rose-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {r.stock_status || "—"}
                  </span>
                </td>
              </tr>
            ))}

            {!loading && topLowStock.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  No stock data available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Loading...
        </div>
      )}
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-sm ${
        accent ? "ring-1 ring-blue-100" : ""
      }`}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />
      )}

      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <div className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </div>
      </div>

      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}