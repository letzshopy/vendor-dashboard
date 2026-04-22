"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreVertical, Package2, Search } from "lucide-react";
import { WCOrder, statusPillClass } from "@/lib/order-utils";
import OrdersExportButton from "./ui/OrdersExportButton";
import { UPIVerificationInline } from "./UPIVerificationInline";
import { extractShipmentFromMeta } from "@/lib/shipment-meta";

type Category = { id: number; name: string; parent: number };

type OrdersClientProps = {
  orders: WCOrder[];
  categories?: Category[];
};

function formatShortDate(date_gmt?: string) {
  if (!date_gmt) return "-";
  try {
    const d = new Date(date_gmt + "Z");
    if (Number.isNaN(d.getTime())) return "-";
    const day = d.getUTCDate().toString().padStart(2, "0");
    const month = (d.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "-";
  }
}

function ActionMenu({
  orderId,
  onTrash,
}: {
  orderId: number;
  onTrash: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 min-w-[170px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <Link
            href={`/orders/${orderId}`}
            className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            View order
          </Link>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onTrash(orderId);
            }}
            className="block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Move to trash
          </button>
        </div>
      )}
    </div>
  );
}

export default function OrdersClient({
  orders,
  categories = [],
}: OrdersClientProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<string>("");

  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((o) => {
      const idStr = String(o.id || "");
      const orderNo = String(o.number || o.id || "").toLowerCase();
      const customer = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.toLowerCase();
      const email = (o.billing?.email || "").toLowerCase();
      const phone = (o.billing?.phone || "").toLowerCase();

      if (
        idStr.includes(q) ||
        orderNo.includes(q) ||
        customer.includes(q) ||
        email.includes(q) ||
        phone.includes(q)
      ) {
        return true;
      }

      return (o.line_items || []).some(
        (li) =>
          (li.name || "").toLowerCase().includes(q) ||
          (li.sku || "").toLowerCase().includes(q)
      );
    });
  }, [orders, query]);

  const allIds = useMemo(() => filteredOrders.map((o) => o.id), [filteredOrders]);
  const allSelected = selected.length > 0 && selected.length === allIds.length;

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((filteredOrders.length || 0) / rowsPerPage)),
    [filteredOrders.length, rowsPerPage]
  );

  const currentPage = Math.min(page, pageCount);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [rowsPerPage, filteredOrders.length, query]);

  function toggleAll(checked: boolean) {
    setSelected(checked ? allIds : []);
  }

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)
    );
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

  async function moveOneToTrash(orderId: number) {
    const res = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: [orderId],
        action: "trash",
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Failed to move order to trash");
      return;
    }

    location.reload();
  }

  const total = filteredOrders.length;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = total === 0 ? 0 : Math.min(currentPage * rowsPerPage, total);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">Order list</h2>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {filteredOrders.length} orders
            </div>
          </div>

          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-2 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-2.5 shadow-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                placeholder="Search order #, customer, phone, email, SKU, product"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-11 min-w-[180px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                <option value="">Bulk actions…</option>
                <option value="trash">Move to trash</option>
                <option value="status:processing">Change status → Processing</option>
                <option value="status:completed">Change status → Completed</option>
                <option value="status:on-hold">Change status → On hold</option>
                <option value="status:cancelled">Change status → Cancelled</option>
              </select>

              <button
                onClick={applyBulk}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
              >
                Apply
              </button>

              <button
                onClick={printPackSlips}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Print Pack Slips
              </button>

              <OrdersExportButton categories={categories} />

              <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {selected.length} selected
              </div>
            </div>
          </div>
        </div>

        {/* Mobile list */}
        <div className="block md:hidden">
          {paginatedOrders.length > 0 ? (
            <div className="space-y-2 p-3">
              {paginatedOrders.map((o) => {
                const first = o.line_items?.[0];
                const img = first?.image?.src || "";
                const customerName = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim() || "Customer";
                const shipment = extractShipmentFromMeta((o as any).meta_data || []);
                const hasShipment = !!(shipment.awb || shipment.courier);

                return (
                  <div
                    key={o.id}
                    className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-2">
                        <input
                          type="checkbox"
                          checked={selected.includes(o.id)}
                          onChange={(e) => toggleOne(o.id, e.currentTarget.checked)}
                        />
                      </div>

                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-2xl border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/orders/${o.id}`}
                              className="block truncate text-sm font-semibold text-slate-900"
                            >
                              #{o.number || o.id}
                            </Link>
                            <div className="mt-0.5 truncate text-sm font-medium text-slate-700">
                              {customerName}
                            </div>
                          </div>

                          <ActionMenu orderId={o.id} onTrash={moveOneToTrash} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={statusPillClass(o.status)}>
                            {String(o.status || "").replace("_", " ")}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">
                            ₹{o.total}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-slate-600">
                          {(first?.name || "No product") +
                            (first?.sku ? ` (${first.sku})` : "")}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span>{formatShortDate(o.date_created_gmt)}</span>
                          {o.billing?.phone ? <span>{o.billing.phone}</span> : null}
                          {hasShipment ? (
                            <span>{shipment.courier || "Shipment added"}</span>
                          ) : (
                            <span>Shipment not set</span>
                          )}
                        </div>

                        <div className="mt-2">
                          <UPIVerificationInline order={o as any} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Package2 className="h-6 w-6" />
              </div>
              <div className="mt-4 text-sm font-semibold text-slate-700">
                No orders found.
              </div>
            </div>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-violet-50/60 text-left text-xs font-medium uppercase tracking-wide text-slate-600">
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleAll(e.currentTarget.checked)}
                  />
                </th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Shipment</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedOrders.map((o) => {
                const first = o.line_items?.[0];
                const shipment = extractShipmentFromMeta((o as any).meta_data || []);
                const hasShipment = !!(shipment.awb || shipment.courier);

                return (
                  <tr
                    key={o.id}
                    className="border-t border-slate-100 bg-white/70 align-top hover:bg-violet-50/40"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selected.includes(o.id)}
                        onChange={(e) => toggleOne(o.id, e.currentTarget.checked)}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-semibold text-indigo-700 hover:underline"
                      >
                        #{o.number || o.id}
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {o.billing?.first_name} {o.billing?.last_name}
                      </div>
                      {o.billing?.phone ? (
                        <div className="text-xs text-slate-500">{o.billing.phone}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-800">
                        {first?.name || "—"}
                      </div>
                      {first?.sku ? (
                        <div className="text-xs text-slate-500">{first.sku}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <span className={statusPillClass(o.status)}>
                        {String(o.status || "").replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      {hasShipment ? (
                        <div className="text-xs text-slate-700">
                          <div className="font-medium">{shipment.courier || "Courier"}</div>
                          <div className="break-all text-[11px] text-slate-500">
                            {shipment.awb || ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Not set</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="mb-1 text-sm text-slate-700">
                        {o.payment_method_title || "-"}
                      </div>
                      <UPIVerificationInline order={o as any} />
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-900">
                      ₹{o.total}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500">
                      {formatShortDate(o.date_created_gmt)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <ActionMenu orderId={o.id} onTrash={moveOneToTrash} />
                    </td>
                  </tr>
                );
              })}

              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    No orders to display.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 text-xs text-slate-600 md:flex-row md:items-center md:justify-between md:px-5">
            <div>
              Showing <span className="font-semibold">{startIndex}</span> –{" "}
              <span className="font-semibold">{endIndex}</span> of{" "}
              <span className="font-semibold">{total}</span> orders
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
    </div>
  );
}