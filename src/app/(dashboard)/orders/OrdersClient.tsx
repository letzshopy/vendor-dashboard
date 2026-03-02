// src/app/orders/OrdersClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { WCOrder, statusPillClass } from "@/lib/order-utils";
import { formatOrderDate } from "@/lib/datetime"; // kept for future use
import OrdersExportButton from "./ui/OrdersExportButton";
import { UPIVerificationInline } from "./UPIVerificationInline";
import { extractShipmentFromMeta } from "@/lib/shipment-meta";

type Category = { id: number; name: string; parent: number };

// Short date formatter: 22-11-2025 (using GMT to avoid timezone surprises)
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

export default function OrdersClient({
  orders,
  categories = [],
}: {
  orders: WCOrder[];
  categories?: Category[];
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<string>("");

  // pagination state
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const allIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allSelected = selected.length === allIds.length && selected.length > 0;

  // total pages & slice for current page
  const pageCount = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil((orders?.length || 0) / (rowsPerPage || 1))
      ),
    [orders.length, rowsPerPage]
  );

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return orders.slice(start, start + rowsPerPage);
  }, [orders, page, rowsPerPage]);

  // whenever list length or rowsPerPage changes, reset to page 1
  useEffect(() => {
    setPage(1);
  }, [rowsPerPage, orders.length]);

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

  // indices for "Showing X–Y of Z"
  const total = orders.length;
  const startIndex = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const endIndex = total === 0 ? 0 : Math.min(page * rowsPerPage, total);

  return (
    <>
      {/* Bulk bar */}
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        >
          <option value="">Bulk actions…</option>
          <option value="trash">Move to trash</option>
          <option value="status:processing">
            Change status → Processing
          </option>
          <option value="status:completed">
            Change status → Completed
          </option>
          <option value="status:on-hold">Change status → On hold</option>
          <option value="status:cancelled">
            Change status → Cancelled
          </option>
        </select>

        <button
          onClick={applyBulk}
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Apply
        </button>

        <div className="mx-1 h-6 w-px bg-slate-300" />

        <button
          onClick={printPackSlips}
          className="rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
        >
          Print Pack Slips
        </button>

        {/* Export Orders button beside pack slips */}
        <OrdersExportButton categories={categories} />

        <div className="ml-auto text-sm text-slate-500">
          {selected.length} selected
        </div>
      </div>

      {/* Orders table */}
      <div className="w-full overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.currentTarget.checked)}
                />
              </th>
              <th className="w-20 px-3 py-2">#</th>
              <th className="w-24 px-3 py-2">Thumbnail</th>
              <th className="w-32 px-3 py-2">Date</th>
              <th className="px-3 py-2">Product</th>
              <th className="w-40 px-3 py-2">Customer</th>
              <th className="w-32 px-3 py-2">Status</th>
              <th className="w-40 px-3 py-2">Shipment</th>
              <th className="w-28 px-3 py-2">Total</th>
              {/* wider payment column so UPI card fits fully */}
              <th className="w-80 px-3 py-2">Payment</th>
            </tr>
          </thead>

          <tbody>
            {paginatedOrders.map((o) => {
              const first = o.line_items?.[0];
              const isChecked = selected.includes(o.id);

              const shipment = extractShipmentFromMeta(
                (o as any).meta_data || []
              );
              const hasShipment = !!(shipment.awb || shipment.courier);
              const shipmentLabel = hasShipment
                ? `${shipment.courier || "Courier"}`
                : "";
              const awbShort = shipment.awb || "";

              return (
                <tr
                  key={o.id}
                  className="border-t align-top transition-colors hover:bg-slate-50/70"
                >
                  {/* checkbox */}
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        toggleOne(o.id, e.currentTarget.checked)
                      }
                    />
                  </td>

                  {/* order number – a bit bigger + stacked */}
                  <td className="px-3 py-3 align-top">
                    <Link
                      href={`/orders/${o.id}`}
                      className="inline-flex flex-col leading-tight"
                    >
                      <span className="text-[13px] font-semibold text-indigo-700 hover:underline">
                        #{o.number || o.id}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ID {o.id}
                      </span>
                    </Link>
                  </td>

                  {/* thumbnail – larger, card-style */}
                  <td className="px-3 py-3">
                    {first?.image?.src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={first.image.src}
                        alt=""
                        className="h-14 w-14 rounded-xl border border-slate-200 bg-white object-cover shadow-sm"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-xl border border-dashed border-slate-200 bg-slate-50" />
                    )}
                  </td>

                  {/* date – short */}
                  <td
                    className="whitespace-nowrap px-3 py-3"
                    suppressHydrationWarning
                  >
                    {formatShortDate(o.date_created_gmt)}
                  </td>

                  {/* products */}
                  <td className="px-3 py-3">
                    {(o.line_items || []).map((li) => (
                      <div key={li.id}>
                        {li.name}
                        {li.sku ? ` (${li.sku})` : ""}
                      </div>
                    ))}
                  </td>

                  {/* customer */}
                  <td className="px-3 py-3">
                    <div>
                      {o.billing?.first_name} {o.billing?.last_name}
                    </div>
                    {o.billing?.phone && (
                      <div className="text-[11px] text-slate-500">
                        {o.billing.phone}
                      </div>
                    )}
                  </td>

                  {/* status pill */}
                  <td className="px-3 py-3 align-top">
                    <span className={statusPillClass(o.status)}>
                      {o.status.replace("_", " ")}
                    </span>
                  </td>

                  {/* Shipment column */}
                  <td className="px-3 py-3 align-top">
                    {hasShipment ? (
                      <div className="text-xs text-slate-700">
                        <div className="font-medium">
                          {shipmentLabel || "Shipment"}
                        </div>
                        <div className="break-all text-[11px] text-slate-500">
                          {awbShort}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Not set
                      </span>
                    )}
                  </td>

                  {/* total */}
                  <td className="whitespace-nowrap px-3 py-3 font-medium">
                    ₹{o.total}
                  </td>

                  {/* payment + UPI card */}
                  <td className="px-3 py-3 align-top">
                    <div className="mb-1 text-sm">
                      {o.payment_method_title || "-"}
                    </div>
                    <UPIVerificationInline order={o as any} />
                  </td>
                </tr>
              );
            })}

            {paginatedOrders.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-6 py-8 text-center text-sm text-slate-500"
                >
                  No orders to display.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 md:flex-row md:items-center md:justify-between">
          <div>
            {total === 0 ? (
              "No orders to display."
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold">{startIndex}</span> –{" "}
                <span className="font-semibold">{endIndex}</span> of{" "}
                <span className="font-semibold">{total}</span> orders
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span>Rows per page</span>
              <select
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                value={rowsPerPage}
                onChange={(e) =>
                  setRowsPerPage(Number(e.target.value) || 10)
                }
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page{" "}
                <span className="font-semibold">{page}</span> of{" "}
                <span className="font-semibold">{pageCount}</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(pageCount, p + 1))
                }
                disabled={page >= pageCount}
                className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
