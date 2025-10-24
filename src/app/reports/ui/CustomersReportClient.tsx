"use client";

import { useEffect, useState } from "react";

export default function CustomersReportClient() {
  const [data, setData] = useState<{ registered: number; guest: number; totalOrders: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports/customers/summary", { cache: "no-store" });
        const json = await res.json();
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Customers</h2>
      <div className="grid sm:grid-cols-3 gap-2">
        <Metric label="Registered customers" value={String(data?.registered ?? 0)} />
        <Metric label="Guest orders" value={String(data?.guest ?? 0)} />
        <Metric label="Total orders" value={String(data?.totalOrders ?? 0)} />
      </div>
      {loading && <div className="mt-2 text-sm text-slate-500">Loading...</div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border p-3">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
