// src/app/sales/shipment-details/ShipmentDetailsBulkTable.tsx

"use client";

import { useMemo, useState } from "react";
import type { WCOrder } from "@/lib/order-utils";
import Link from "next/link";

type Row = {
  id: number;
  number: string;
  customerName: string;
  status: string;
  courier: string;
  awb: string;
};

const FINAL_STATUSES = new Set([
  "completed",
  "cancelled",
  "refunded",
  "failed",
  "trash",
]);

function buildRows(orders: WCOrder[]): Row[] {
  return (orders || [])
    .filter((o) => {
      const st = String(o.status || "").toLowerCase();
      return !FINAL_STATUSES.has(st); // keep only open orders
    })
    .map((o) => {
      const billingName = [o.billing?.first_name, o.billing?.last_name]
        .filter(Boolean)
        .join(" ");

      const shippingName = [o.shipping?.first_name, o.shipping?.last_name]
        .filter(Boolean)
        .join(" ");

      const customerName = billingName || shippingName || "—";

      return {
        id: o.id,
        number: o.number?.toString() ?? String(o.id),
        customerName,
        status: String(o.status || ""),
        courier: "",
        awb: "",
      };
    });
}

function statusPill(status: string) {
  const st = status.toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium";

  if (st === "processing") {
    return (
      <span className={`${base} bg-amber-50 text-amber-700`}>
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1" />
        Processing
      </span>
    );
  }

  if (st === "pending") {
    return (
      <span className={`${base} bg-slate-100 text-slate-700`}>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 mr-1" />
        Pending
      </span>
    );
  }

  return (
    <span className={`${base} bg-slate-100 text-slate-700 capitalize`}>
      {status || "—"}
    </span>
  );
}

export default function ShipmentDetailsBulkTable({
  initialOrders,
}: {
  initialOrders: WCOrder[];
}) {
  const initialRows = useMemo(() => buildRows(initialOrders), [initialOrders]);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const handleChange = (id: number, field: "courier" | "awb", value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedMsg(null);

    try {
      const updates = rows
        .filter((r) => r.awb.trim() || r.courier.trim())
        .map((r) => ({
          orderId: r.id,
          courier: r.courier.trim(),
          awb: r.awb.trim(),
        }));

      if (!updates.length) {
        setSavedMsg("Nothing to save.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/orders/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (!res.ok) throw new Error("Failed to save shipments");

      const json = await res.json().catch(() => ({}));
      setSavedMsg(`Updated ${json.updated ?? updates.length} shipments.`);

      // simplest: reload page so fresh open orders list comes from server
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      setError("Could not update shipments.");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving;

  return (
    <section className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Open Orders – Shipment Update
          </h2>
          <p className="mt-1 text-xs text-slate-500 max-w-xl">
            Enter <span className="font-medium">Tracking Number</span> and{" "}
            <span className="font-medium">Courier Name</span> for each order
            below. When you click{" "}
            <span className="font-medium">Save &amp; Mark Completed</span>, the
            selected orders will be updated in WooCommerce and removed from this
            list.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {savedMsg && (
              <span className="text-[11px] text-slate-500">{savedMsg}</span>
            )}
            {error && (
              <span className="text-[11px] text-red-500">{error}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              ⟳ Refresh
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || !rows.length}
              className={`inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm ${
                disabled || !rows.length
                  ? "bg-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "Saving…" : "Save & Mark Completed"}
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="px-4 py-3 overflow-x-auto">
        {!rows.length && !error && (
          <p className="text-xs text-slate-500 py-3">
            No open orders currently need shipment details. 🎉
          </p>
        )}

        {!!rows.length && (
          <table className="min-w-full text-xs md:text-sm border-collapse mt-1">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left py-2.5 pl-3 pr-3 font-medium text-slate-500">
                  Order
                </th>
                <th className="text-left py-2.5 pr-3 font-medium text-slate-500">
                  Customer
                </th>
                <th className="text-left py-2.5 pr-3 font-medium text-slate-500">
                  Status
                </th>
                <th className="text-left py-2.5 pr-3 font-medium text-slate-500">
                  Tracking number
                </th>
                <th className="text-left py-2.5 pr-3 font-medium text-slate-500">
                  Courier name
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-slate-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  {/* Order */}
                  <td className="py-2.5 pl-3 pr-3 align-top whitespace-nowrap">
                    <div className="flex flex-col">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        #{row.number}
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        ID {row.id}
                      </span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-2.5 pr-3 align-top">
                    <span className="text-[13px] text-slate-800">
                      {row.customerName || "—"}
                    </span>
                  </td>

                  {/* Status pill */}
                  <td className="py-2.5 pr-3 align-top min-w-[120px]">
                    {statusPill(row.status)}
                  </td>

                  {/* Tracking input */}
                  <td className="py-2.5 pr-3 align-top min-w-[200px]">
                    <div className="relative max-w-xs">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[10px] text-slate-400">
                        #️⃣
                      </span>
                      <input
                        type="text"
                        value={row.awb}
                        disabled={disabled}
                        placeholder="Tracking number"
                        className="h-9 text-xs border border-slate-200 rounded-lg px-6 w-full bg-slate-50 text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        onChange={(e) =>
                          handleChange(row.id, "awb", e.target.value)
                        }
                      />
                    </div>
                  </td>

                  {/* Courier input */}
                  <td className="py-2.5 pr-3 align-top min-w-[200px]">
                    <div className="relative max-w-xs">
                      <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-[10px] text-slate-400">
                        🚚
                      </span>
                      <input
                        type="text"
                        value={row.courier}
                        disabled={disabled}
                        placeholder="Delhivery / Ekart / DTDC…"
                        className="h-9 text-xs border border-slate-200 rounded-lg px-6 w-full bg-slate-50 text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        onChange={(e) =>
                          handleChange(row.id, "courier", e.target.value)
                        }
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 rounded-b-2xl">
        <p className="text-[11px] text-slate-500">
          Tip: After you enter Tracking Number and Courier Name and click{" "}
          <span className="font-medium text-slate-700">
            Save &amp; Mark Completed
          </span>
          , those orders are marked <strong>Completed</strong> in WooCommerce
          and will disappear from this list.
        </p>
      </div>
    </section>
  );
}
