"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { WCOrder, statusPillClass } from "@/lib/order-utils";
import { formatOrderDate } from "@/lib/datetime";

export default function OrdersClient({ orders }: { orders: WCOrder[] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<string>("");

  const allIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allSelected = selected.length === allIds.length && selected.length > 0;

  function toggleAll(checked: boolean) {
    setSelected(checked ? allIds : []);
  }
  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  async function applyBulk() {
    if (!action || selected.length === 0) return;
    const body: any = { ids: selected, action: "" };
    if (action === "trash") {
      body.action = "trash";
    } else if (action.startsWith("status:")) {
      body.action = "status";
      body.status = action.split(":")[1];
    } else {
      return;
    }
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Bulk action failed");
      return;
    }
    location.reload();
  }

  function printPackSlips() {
    if (selected.length === 0) {
      alert("Select at least one order to print pack slips.");
      return;
    }
    const ids = selected.join(",");
    window.open(`/orders/packslips?ids=${encodeURIComponent(ids)}`, "_blank");
  }

  return (
    <>
      {/* Bulk bar */}
      <div className="bg-white rounded-lg shadow p-3 mb-3 flex flex-wrap items-center gap-2">
        <select value={action} onChange={(e) => setAction(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Bulk actions…</option>
          <option value="trash">Move to trash</option>
          <option value="status:processing">Change status → Processing</option>
          <option value="status:completed">Change status → Completed</option>
          <option value="status:on-hold">Change status → On hold</option>
          <option value="status:cancelled">Change status → Cancelled</option>
        </select>
        <button onClick={applyBulk} className="border rounded px-3 py-1">Apply</button>

        <div className="h-6 w-px bg-slate-300 mx-1" />

        <button onClick={printPackSlips} className="border rounded px-3 py-1">
          Print Pack Slips
        </button>

        <div className="text-sm text-slate-500 ml-auto">{selected.length} selected</div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 w-8">
                <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.currentTarget.checked)} />
              </th>
              <th className="p-2">#</th>
              <th className="p-2">Thumbnail</th>
              <th className="p-2">Date</th>
              <th className="p-2">Product</th>
              <th className="p-2">Customer</th>
              <th className="p-2">Status</th>
              <th className="p-2">Total</th>
              <th className="p-2">Payment</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const first = o.line_items?.[0];
              const isChecked = selected.includes(o.id);
              return (
                <tr key={o.id} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleOne(o.id, e.currentTarget.checked)}
                    />
                  </td>
                  <td className="p-2">
                    <Link className="text-blue-600 hover:underline" href={`/orders/${o.id}`}>
                      {o.number || o.id}
                    </Link>
                  </td>
                  <td className="p-2">
                    {first?.image?.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.image.src} alt="" className="w-10 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-slate-100 rounded" />
                    )}
                  </td>
                  {/* Deterministic UTC string to avoid hydration mismatch */}
                  <td className="p-2" suppressHydrationWarning>
                    {formatOrderDate(o.date_created_gmt)}
                  </td>
                  <td className="p-2">
                    {(o.line_items || []).map((li) => (
                      <div key={li.id}>
                        {li.name}
                        {li.sku ? ` (${li.sku})` : ""}
                      </div>
                    ))}
                  </td>
                  <td className="p-2">
                    {o.billing?.first_name} {o.billing?.last_name}
                  </td>
                  <td className="p-2">
                    <span className={statusPillClass(o.status)}>{o.status.replace("_", " ")}</span>
                  </td>
                  <td className="p-2 font-medium">₹{o.total}</td>
                  <td className="p-2">{o.payment_method_title || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
