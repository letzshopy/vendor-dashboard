"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InvoicePdfClient from "../orders/ui/InvoicePdfClient";

type OrderRow = {
  id: number;
  number: string;
  date_created: string;
  status: string;
  payment_method_title?: string;
  total: string;
  billing?: { first_name?: string; last_name?: string; email?: string };
  line_items?: Array<{ id: number; name: string; quantity: number; total: string; subtotal: string; price: number }>;
};

export default function OrderInvoicesPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // selection
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );

  async function fetchOrders() {
    setLoading(true);
    try {
      const usp = new URLSearchParams({
        page: "1",
        per_page: "50",
        status,
        search,
        date_from: from,
        date_to: to,
      });
      // same orders API you already use
      const res = await fetch(`/api/orders?${usp.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setOrders(json?.data || json || []);
      setSelected({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const next: Record<number, boolean> = {};
    if (e.target.checked) orders.forEach((o) => (next[o.id] = true));
    setSelected(next);
  }
  function toggleOne(id: number, v: boolean) {
    setSelected((s) => ({ ...s, [id]: v }));
  }

  async function createInvoices() {
    if (selectedIds.length === 0) return;
    await InvoicePdfClient.generateForOrders(selectedIds);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order Invoices</h1>
        <Link href="/orders" className="text-sm underline">Back to Orders</Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded border p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-end">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded px-3 py-2">
            <option value="all">All statuses</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="on-hold">On hold</option>
            <option value="pending">Pending payment</option>
          </select>
          <input
            className="border rounded px-3 py-2 min-w-[280px]"
            placeholder="Search order # / name / email / SKU / product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2" />
          <button onClick={fetchOrders} className="border rounded px-4 py-2">Search</button>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={createInvoices}
              className={`px-4 py-2 rounded ${selectedIds.length ? "bg-black text-white" : "bg-slate-200 text-slate-600"}`}
              disabled={!selectedIds.length}
              title={selectedIds.length ? "Create PDF invoices for selected orders" : "Select orders first"}
            >
              Create PDF Invoice ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-10" />
            <col className="w-20" />
            <col className="w-40" />
            <col className="w-[28%]" />
            <col className="w-[18%]" />
            <col className="w-28" />
            <col className="w-36" />
            <col className="w-36" />
          </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <th className="p-2">
              <input type="checkbox" onChange={toggleAll} />
            </th>
            <th className="p-2 text-left">#</th>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Customer</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2 text-left">Payment</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={!!selected[o.id]}
                  onChange={(e) => toggleOne(o.id, e.target.checked)}
                />
              </td>
              <td className="p-2">
                <Link className="text-blue-600 underline" href={`/orders/${o.id}`}>{o.number || o.id}</Link>
              </td>
              <td className="p-2" suppressHydrationWarning>{new Date(o.date_created).toLocaleString()}</td>
              <td className="p-2">
                {o.billing?.first_name || o.billing?.last_name
                  ? `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim()
                  : o.billing?.email || "-"}
              </td>
              <td className="p-2 capitalize">{o.status}</td>
              <td className="p-2 text-right">₹{Number(o.total || 0).toFixed(2)}</td>
              <td className="p-2">{o.payment_method_title || "-"}</td>
              <td className="p-2 text-right">
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => InvoicePdfClient.generateForOrders([o.id])}
                >
                  Create PDF Invoice
                </button>
              </td>
            </tr>
          ))}
          {orders.length === 0 && !loading && (
            <tr><td colSpan={8} className="p-6 text-center text-slate-500">No orders found.</td></tr>
          )}
        </tbody>
        </table>
      </div>
      {loading && <div className="text-sm text-slate-500">Loading…</div>}
    </div>
  );
}
