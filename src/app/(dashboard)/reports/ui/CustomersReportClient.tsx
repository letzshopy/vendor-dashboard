"use client";

import { useEffect, useState } from "react";

export default function CustomersReportClient() {
  const [data, setData] = useState<{
    registered: number;
    guest: number;
    totalOrders: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports/customers/summary", {
          cache: "no-store",
        });
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Customers</h2>
          <p className="mt-1 text-xs text-slate-500">
            Quick snapshot of your customer base and total orders placed.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Registered customers"
          value={String(data?.registered ?? 0)}
        />
        <Metric label="Guest orders" value={String(data?.guest ?? 0)} />
        <Metric
          label="Total orders"
          value={String(data?.totalOrders ?? 0)}
          accent
        />
      </div>

      {loading && (
        <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          Loading…
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm px-3 py-3 sm:px-4 ${
        accent ? "ring-1 ring-blue-100" : ""
      }`}
    >
      {accent && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400" />
      )}
      <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
