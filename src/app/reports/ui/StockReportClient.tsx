"use client";

import { useEffect, useState } from "react";

type Item = { id: number; name: string; parent: number | null; stock_status: string; stock_quantity: number | null };

export default function StockReportClient() {
  const [tab, setTab] = useState<"low" | "out" | "most">("low");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(type: "low" | "out" | "most") {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/stock/${type}`, { cache: "no-store" });
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
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-xl font-semibold">Stock</h2>
        <div className="ml-4 inline-flex rounded border overflow-hidden">
          <button onClick={() => setTab("low")} className={`px-3 py-1 text-sm ${tab === "low" ? "bg-slate-100" : ""}`}>
            Low in stock
          </button>
          <button onClick={() => setTab("out")} className={`px-3 py-1 text-sm ${tab === "out" ? "bg-slate-100" : ""}`}>
            Out of stock
          </button>
          <button onClick={() => setTab("most")} className={`px-3 py-1 text-sm ${tab === "most" ? "bg-slate-100" : ""}`}>
            Most stocked
          </button>
        </div>
      </div>

      <div className="bg-white rounded border overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-6/12" />
            <col className="w-2/12" />
            <col className="w-2/12" />
            <col className="w-2/12" />
          </colgroup>
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Parent</th>
              <th className="p-2 text-right">Units in stock</th>
              <th className="p-2 text-left">Stock status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.parent || "-"}</td>
                <td className="p-2 text-right">{r.stock_quantity ?? "-"}</td>
                <td className="p-2">{r.stock_status}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
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
