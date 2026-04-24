"use client";

import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, UserCheck, Users } from "lucide-react";

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

  const totalCustomers = useMemo(() => {
    return Number(data?.registered || 0) + Number(data?.guest || 0);
  }, [data]);

  const registeredPercent = useMemo(() => {
    if (!totalCustomers) return 0;
    return Math.round((Number(data?.registered || 0) / totalCustomers) * 100);
  }, [data, totalCustomers]);

  const guestPercent = useMemo(() => {
    if (!totalCustomers) return 0;
    return Math.round((Number(data?.guest || 0) / totalCustomers) * 100);
  }, [data, totalCustomers]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Customers</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">Customer mix</div>
          </div>

          <div className="space-y-4 p-4">
            <MixRow
              label="Registered customers"
              count={Number(data?.registered ?? 0)}
              percent={registeredPercent}
              barClass="bg-indigo-500"
            />

            <MixRow
              label="Guest orders"
              count={Number(data?.guest ?? 0)}
              percent={guestPercent}
              barClass="bg-sky-500"
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-sm font-semibold text-slate-900">Total customer activity</div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{totalCustomers}</div>
              <div className="mt-1 text-xs text-slate-500">
                Registered customers + guest order activity
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">Customer summary</div>
          </div>

          <div className="grid gap-3 p-4">
            <InfoCard
              title="Registered customers"
              value={String(data?.registered ?? 0)}
              note="Customers with account-based orders"
            />
            <InfoCard
              title="Guest orders"
              value={String(data?.guest ?? 0)}
              note="Orders placed without registration"
            />
            <InfoCard
              title="Total orders"
              value={String(data?.totalOrders ?? 0)}
              note="All customer orders counted together"
            />
          </div>
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
        <div className="text-[11px] font-medium uppercase tracking-wide">{label}</div>
      </div>

      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function MixRow({
  label,
  count,
  percent,
  barClass,
}: {
  label: string;
  count: number;
  percent: number;
  barClass: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-900">{label}</div>
        <div className="text-sm font-semibold text-slate-900">
          {count} <span className="text-xs font-medium text-slate-500">({percent}%)</span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}