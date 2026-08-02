"use client";

import { useMemo, useState } from "react";
import type { WCOrder } from "@/lib/order-utils";
import { extractShipmentFromMeta } from "@/lib/shipment-meta";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical, Package2, RefreshCcw, Truck } from "lucide-react";

type Row = {
  id: number;
  number: string;
  customerName: string;
  status: string;
  courier: string;
  awb: string;
  trackingUrl: string;
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
      return !FINAL_STATUSES.has(st);
    })
    .map((o) => {
      const billingName = [o.billing?.first_name, o.billing?.last_name]
        .filter(Boolean)
        .join(" ");

      const shippingName = [o.shipping?.first_name, o.shipping?.last_name]
        .filter(Boolean)
        .join(" ");

      const customerName = billingName || shippingName || "—";
      const shipment = extractShipmentFromMeta(
        (o as any).meta_data || []
      );

      return {
        id: o.id,
        number: o.number?.toString() ?? String(o.id),
        customerName,
        status: String(o.status || ""),
        courier: shipment.courier || "",
        awb: shipment.awb || "",
        trackingUrl: shipment.trackingUrl || "",
      };
    });
}

function statusPill(status: string) {
  const st = status.toLowerCase();
  const base =
    "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap";

  if (st === "processing") {
    return (
      <span className={`${base} bg-amber-50 text-amber-700`}>
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
        Processing
      </span>
    );
  }

  if (st === "pending") {
    return (
      <span className={`${base} bg-slate-100 text-slate-700`}>
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-slate-500" />
        Pending
      </span>
    );
  }

  if (st === "on-hold") {
    return (
      <span className={`${base} bg-orange-50 text-orange-700`}>
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
        On hold
      </span>
    );
  }

  return (
    <span className={`${base} bg-slate-100 text-slate-700 capitalize`}>
      {status || "—"}
    </span>
  );
}

function RowMenu({ orderId }: { orderId: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[150px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <Link
            href={`/orders/${orderId}`}
            className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            View order
          </Link>
        </div>
      )}
    </div>
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

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const pageCount = Math.max(1, Math.ceil(rows.length / rowsPerPage));
  const currentPage = Math.min(page, pageCount);

  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return rows.slice(start, start + rowsPerPage);
  }, [rows, currentPage, rowsPerPage]);

  const startIndex = rows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = rows.length === 0 ? 0 : Math.min(currentPage * rowsPerPage, rows.length);

  const handleChange = (
    id: number,
    field: "courier" | "awb" | "trackingUrl",
    value: string
  ) => {
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
        .filter(
          (r) =>
            r.awb.trim() ||
            r.courier.trim() ||
            r.trackingUrl.trim()
        )
        .map((r) => ({
          orderId: r.id,
          courier: r.courier.trim(),
          awb: r.awb.trim(),
          trackingUrl: r.trackingUrl.trim(),
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
    <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-slate-900">
            Open Orders
          </h2>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {rows.length} orders
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || !rows.length}
            className={`inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-semibold text-white shadow-sm ${
              disabled || !rows.length
                ? "cursor-not-allowed bg-slate-300"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            <Truck className="h-4 w-4" />
            {saving ? "Saving..." : "Save & Mark Completed"}
          </button>

          {savedMsg && (
            <span className="text-xs text-slate-500">{savedMsg}</span>
          )}

          {error && (
            <span className="text-xs text-rose-600">{error}</span>
          )}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="block md:hidden">
        {pageRows.length > 0 ? (
          <div className="space-y-2 p-3">
            {pageRows.map((row) => (
              <div
                key={row.id}
                className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${row.id}`}
                      className="block text-[15px] font-semibold text-indigo-700 hover:underline"
                    >
                      #{row.number}
                    </Link>
                    <div className="mt-0.5 text-[14px] font-medium text-slate-800">
                      {row.customerName || "—"}
                    </div>
                  </div>

                  <RowMenu orderId={row.id} />
                </div>

                <div className="mt-2">{statusPill(row.status)}</div>

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Tracking number
                    </label>
                    <input
                      type="text"
                      value={row.awb}
                      disabled={disabled}
                      placeholder="Tracking number"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(row.id, "awb", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Courier name
                    </label>
                    <input
                      type="text"
                      value={row.courier}
                      disabled={disabled}
                      placeholder="Delhivery / Ekart / DTDC"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(row.id, "courier", e.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Tracking link (optional)
                    </label>
                    <input
                      type="url"
                      value={row.trackingUrl}
                      disabled={disabled}
                      placeholder="https://courier.example/track/..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(
                          row.id,
                          "trackingUrl",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Package2 className="h-6 w-6" />
            </div>
            <div className="mt-4 text-sm font-semibold text-slate-700">
              No open orders need shipment details.
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        {rows.length > 0 ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-violet-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tracking number</th>
                <th className="px-4 py-3">Courier name</th>
                <th className="px-4 py-3">Tracking link</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 bg-white/70 align-top hover:bg-violet-50/40"
                >
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-[15px] font-semibold text-indigo-700 hover:underline"
                      >
                        #{row.number}
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        ID {row.id}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-sm text-slate-800">
                    {row.customerName || "—"}
                  </td>

                  <td className="px-4 py-4">{statusPill(row.status)}</td>

                  <td className="px-4 py-4 min-w-[220px]">
                    <input
                      type="text"
                      value={row.awb}
                      disabled={disabled}
                      placeholder="Tracking number"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(row.id, "awb", e.target.value)
                      }
                    />
                  </td>

                  <td className="px-4 py-4 min-w-[220px]">
                    <input
                      type="text"
                      value={row.courier}
                      disabled={disabled}
                      placeholder="Delhivery / Ekart / DTDC"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(row.id, "courier", e.target.value)
                      }
                    />
                  </td>

                  <td className="px-4 py-4 min-w-[260px]">
                    <input
                      type="url"
                      value={row.trackingUrl}
                      disabled={disabled}
                      placeholder="https://courier.example/track/..."
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      onChange={(e) =>
                        handleChange(
                          row.id,
                          "trackingUrl",
                          e.target.value
                        )
                      }
                    />
                  </td>

                  <td className="px-4 py-4 text-right">
                    <RowMenu orderId={row.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No open orders need shipment details.
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between md:px-5">
          <div>
            Showing <span className="font-semibold">{startIndex}</span> –{" "}
            <span className="font-semibold">{endIndex}</span> of{" "}
            <span className="font-semibold">{rows.length}</span> orders
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value) || 25)}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                Page {currentPage} of {pageCount}
              </span>

              <button
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}