"use client";

import { useEffect, useState } from "react";
import { Users, ShoppingBag, UserCheck } from "lucide-react";

type CustomersSummary = {
  registered: number;
  guest: number;
  totalOrders: number;
};

export default function CustomersReportClient() {
  const [data, setData] = useState<CustomersSummary | null>(null);
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
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Customers</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<UserCheck className="h-4 w-4" />}
          label="Registered customers"
          value={String(data?.registered ?? 0)}
        />
        <Metric
          icon={<Users className="h-4 w-4" />}
          label="Guest orders"
          value={String(data?.guest ?? 0)}
        />
        <Metric
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Total orders"
          value={String(data?.totalOrders ?? 0)}
          accent
        />
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