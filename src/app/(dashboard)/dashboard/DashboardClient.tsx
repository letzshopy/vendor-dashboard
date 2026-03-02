// src/app/dashboard/DashboardClient.tsx
"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { statusPillClass } from "@/lib/order-utils";

type SalesPoint = { date: string; amount: number };
type Slice = { label: string; value: number };

type RecentOrder = {
  id: number;
  number: string;
  customer: string;
  total: number;
  status: string;
  date: string;
};

type Props = {
  todaySales: number;
  monthSales: number;
  ordersCount: number;
  pendingUpi: number;

  totalProducts: number;
  inStock: number;
  outOfStock: number;

  stockPie: Slice[];
  statusPie: Slice[];
  salesSeries: SalesPoint[];
  recentOrders: RecentOrder[];
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const COLORS = ["#2563eb", "#f97316", "#22c55e", "#e11d48", "#a855f7"];

export default function DashboardClient(props: Props) {
  const {
    todaySales,
    monthSales,
    ordersCount,
    pendingUpi,
    totalProducts,
    inStock,
    outOfStock,
    stockPie,
    statusPie,
    salesSeries,
    recentOrders,
  } = props;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-2xl font-semibold mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-4">
        Snapshot of your store – sales, orders, and products.
      </p>

      {/* Top metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          label="Today's sales"
          value={currency.format(todaySales)}
          helper="Completed & processing orders created today"
        />
        <MetricCard
          label="This month's sales"
          value={currency.format(monthSales)}
          helper="From processing & completed orders"
        />
        <MetricCard
          label="Orders"
          value={ordersCount.toString()}
          helper="Last 30 days (all statuses)"
        />
        <MetricCard
          label="Pending UPI verification"
          value={pendingUpi.toString()}
          helper="On-hold orders paid via Letz UPI"
          highlight={pendingUpi > 0}
        />
      </div>

      {/* Middle row: products + pies */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Products overview + stock donut */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Products overview</h2>
            <a
              href="/products"
              className="text-xs text-blue-600 hover:underline"
            >
              Manage products
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 flex-1">
            {/* Stats */}
            <div className="space-y-3 sm:w-1/2">
              <StatRow label="Total products" value={totalProducts} />
              <StatRow label="In stock" value={inStock} />
              <StatRow
                label="Out of stock"
                value={outOfStock}
                tone={outOfStock > 0 ? "bad" : "ok"}
              />
            </div>

            {/* Donut chart */}
            <div className="sm:w-1/2 h-48">
              {stockPie.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  No products yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockPie}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="55%"
                      outerRadius="80%"
                      paddingAngle={2}
                    >
                      {stockPie.map((entry, idx) => (
                        <Cell
                          key={`stock-${idx}`}
                          fill={COLORS[idx % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [`${value}`, "Products"]}
                    />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Order status donut */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">
              Orders by status (last 30 days)
            </h2>
          </div>
          <div className="h-56">
            {statusPie.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No orders yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="label"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={2}
                  >
                    {statusPie.map((entry, idx) => (
                      <Cell
                        key={`status-${idx}`}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value}`, "Orders"]}
                  />
                  <Legend verticalAlign="bottom" height={24} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Getting started / tips */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col">
          <h2 className="font-semibold text-slate-800 mb-3">
            Getting started checklist
          </h2>
          <ul className="space-y-2 text-sm text-slate-700 flex-1">
            <ChecklistItem text="Set up your store profile (logo, address, contact details)." />
            <ChecklistItem text="Configure shipping zones & rates." />
            <ChecklistItem text="Choose your payment methods (Easebuzz, UPI, bank transfer, COD)." />
            <ChecklistItem text="Add your first products and organize them into categories." />
            <ChecklistItem text="Use Orders to print pack slips and track fulfilment." />
          </ul>
        </div>
      </div>

      {/* Bottom row: sales chart + recent orders + Support card */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Sales chart */}
        <div className="bg-white rounded-lg shadow p-4 xl:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">
              Revenue from completed & processing orders (last 30 days)
            </h2>
          </div>
          <div className="h-64">
            {salesSeries.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesSeries}>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)} // show MM-DD
                    fontSize={10}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      currency.format(v as number).replace("₹", "")
                    }
                    fontSize={10}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      currency.format(value as number),
                      "Revenue",
                    ]}
                    labelFormatter={(d) => `Date: ${d}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Recent orders</h2>
            <a
              href="/orders"
              className="text-xs text-blue-600 hover:underline"
            >
              View all
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-xs text-slate-400">No orders yet.</div>
          ) : (
            <div className="space-y-2 text-xs">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0"
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      #{o.number} – {o.customer}
                    </div>
                    <div className="text-slate-500">
                      {o.date} ·{" "}
                      <span className={statusPillClass(o.status)}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="font-semibold">
                    {currency.format(o.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support card */}
        <div className="bg-white rounded-lg shadow p-4 flex flex-col justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 mb-2">Support</h2>
            <p className="text-xs text-slate-600 mb-3">
              Need help with your store setup, billing or technical issues?
              Open a ticket with the LetzShopy team and we&apos;ll get back to
              you.
            </p>
            <ul className="text-xs text-slate-600 space-y-1 mb-3">
              <li>• Ask questions about products, orders or shipping.</li>
              <li>• Report bugs or dashboard issues.</li>
              <li>• Request tweaks to your storefront.</li>
            </ul>
          </div>
          <div>
            <a
              href="https://letzshopy.in/vendor-support/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition"
            >
              Open Support Portal
            </a>
            <p className="text-[11px] text-slate-400 mt-2">
              The portal opens on letzshopy.in and shows your tickets and
              replies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg shadow p-4 border ${
        highlight ? "border-amber-400" : "border-transparent"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
        {label}
      </div>
      <div className="text-xl font-semibold mb-1">{value}</div>
      {helper && (
        <div className="text-xs text-slate-500 leading-snug">{helper}</div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "bad" | "ok";
}) {
  const color =
    tone === "bad"
      ? "text-red-600"
      : tone === "ok"
      ? "text-emerald-600"
      : "text-slate-900";
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-600">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
      <span>{text}</span>
    </li>
  );
}
