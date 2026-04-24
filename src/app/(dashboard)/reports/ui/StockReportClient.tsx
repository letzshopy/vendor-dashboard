"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  PackageX,
  Warehouse,
} from "lucide-react";

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

type StockApiRow = {
  id: number;
  name: string;
  parent: number | null;
  stock_status: string;
  stock_quantity: number | null;
};

type StockSummary = {
  low: StockApiRow[];
  out: StockApiRow[];
  most: StockApiRow[];
};

function shortLabel(text: string, max = 14) {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function StockReportClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StockSummary>({
    low: [],
    out: [],
    most: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const [lowRes, outRes, mostRes] = await Promise.all([
          fetch("/api/reports/stock/low", { cache: "no-store" }),
          fetch("/api/reports/stock/out", { cache: "no-store" }),
          fetch("/api/reports/stock/most", { cache: "no-store" }),
        ]);

        const lowJson = await lowRes.json().catch(() => ({}));
        const outJson = await outRes.json().catch(() => ({}));
        const mostJson = await mostRes.json().catch(() => ({}));

        setData({
          low: Array.isArray(lowJson?.items) ? lowJson.items : [],
          out: Array.isArray(outJson?.items) ? outJson.items : [],
          most: Array.isArray(mostJson?.items) ? mostJson.items : [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const total = data.most.length;
    const inStock = data.most.filter(
      (r) => String(r.stock_status || "").toLowerCase() === "instock"
    ).length;
    const outOfStock = data.out.length;
    const lowStock = data.low.length;

    return { total, inStock, outOfStock, lowStock };
  }, [data]);

  const chartData = useMemo(
    () =>
      data.low.slice(0, 8).map((r) => ({
        label: shortLabel(r.name),
        fullLabel: r.name,
        qty: Number(r.stock_quantity || 0),
      })),
    [data.low]
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Stock</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
          <div className="mb-3 text-sm font-semibold text-slate-900">
            Low stock products
          </div>
          <div className="h-60 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 18 }}>
                <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any, _n: any, item: any) => [
                    v,
                    item?.payload?.fullLabel || "Qty",
                  ]}
                />
                <Bar dataKey="qty" fill={COLORS.bar} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">
            Low stock list
          </div>
        </div>

        <div className="block md:hidden">
          {data.low.length > 0 ? (
            <div className="space-y-2 p-3">
              {data.low.slice(0, 20).map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {r.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Product ID: {r.id}
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                      {r.stock_quantity ?? 0} qty
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Warehouse className="h-4 w-4 text-slate-500" />
                    <span className="text-xs text-slate-600 capitalize">
                      {r.stock_status || "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !loading && (
              <div className="p-5 text-center text-sm text-slate-500">
                No low stock products found.
              </div>
            )
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-7/12" />
              <col className="w-2/12" />
              <col className="w-3/12" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.low.slice(0, 20).map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-3 text-slate-900">{r.name}</td>
                  <td className="p-3 text-right font-medium text-slate-900">
                    {typeof r.stock_quantity === "number" ? r.stock_quantity : "—"}
                  </td>
                  <td className="p-3">
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

              {!loading && data.low.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-500">
                    No low stock products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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