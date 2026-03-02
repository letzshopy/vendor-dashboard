"use client";

import { useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  parent: number | null;
  stock_status: string;
  stock_quantity: number | null;
};

export default function StockReportClient() {
  const [tab, setTab] = useState<"low" | "out" | "most">("low");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(type: "low" | "out" | "most") {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/stock/${type}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setItems(json.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
  }, [tab]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Stock</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            Quickly find items that are low, out of stock, or heavily stocked
            so you can plan purchases and promotions.
          </p>
        </div>

        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            onClick={() => setTab("low")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "low"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Low in stock
          </button>
          <button
            onClick={() => setTab("out")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "out"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Out of stock
          </button>
          <button
            onClick={() => setTab("most")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "most"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Most stocked
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-x-auto">
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
              <th className="p-2 text-left">Parent</th>
              <th className="p-2 text-right">Units in stock</th>
              <th className="p-2 text-left">Stock status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.parent || "-"}</td>
                <td className="p-2 text-right">
                  {r.stock_quantity ?? "-"}
                </td>
                <td className="p-2 capitalize text-xs sm:text-sm">
                  {r.stock_status.replace("_", " ")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-4 text-center text-slate-500"
                >
                  {loading ? "Loading..." : "No products in this view."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
