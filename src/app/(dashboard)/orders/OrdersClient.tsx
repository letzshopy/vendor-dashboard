"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Package2,
  MessageCircle,
  Eye,
  Trash2,
  X,
} from "lucide-react";
import { WCOrder, statusPillClass } from "@/lib/order-utils";
import OrdersExportButton from "./ui/OrdersExportButton";
import { UPIVerificationInline } from "./UPIVerificationInline";
import { extractShipmentFromMeta } from "@/lib/shipment-meta";

type Category = { id: number; name: string; parent: number };

type OrdersClientProps = {
  orders: WCOrder[];
  categories?: Category[];
  storeName: string;
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


function normalizeWhatsAppPhone(value?: string) {
  const original = String(value || "").trim();
  let digits = original.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (original.startsWith("+")) {
    return digits.length >= 10 && digits.length <= 15 ? digits : "";
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

function formatWhatsAppDate(value?: string | null) {
  if (!value) return "";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildWhatsAppStatusMessage(order: WCOrder, storeName: string) {
  const status = String(order.status || "pending").toLowerCase();
  const firstName = String(order.billing?.first_name || "").trim() || "Customer";
  const orderNumber = order.number || order.id;
  const businessName = String(storeName || "").trim() || "Your Store";
  const shipment = extractShipmentFromMeta((order as any).meta_data || []);

  const itemLines = (order.line_items || []).map((item: any) => {
    const quantity = Number(item.quantity || 1);
    const name = String(item.name || "Product").trim() || "Product";
    return `- ${quantity} x ${name}`;
  });

  let statusMessage: string;
  let followUpMessage: string;

  switch (status) {
    case "pending":
      statusMessage =
        "We have received your order. Payment is still pending. Please complete the payment or share the payment details so we can confirm your order.";
      followUpMessage =
        "We will update you as soon as your payment is received and verified.";
      break;

    case "on-hold":
      statusMessage =
        "Your order payment details have not yet been verified. Once verified, your order will be confirmed.";
      followUpMessage =
        "We will update you as soon as the verification is completed.";
      break;

    case "processing":
      statusMessage =
        "Your order payment details have been verified and your order is confirmed. It is now being processed.";
      followUpMessage =
        "We will notify you once your order is dispatched.";
      break;

    case "completed":
      statusMessage =
        "Your order has been completed. Thank you for shopping with us.";
      followUpMessage =
        "Please contact us if you need any further assistance with this order.";
      break;

    case "cancelled":
      statusMessage =
        "Your order has been cancelled.";
      followUpMessage =
        "Please contact us if you need assistance or would like to place the order again.";
      break;

    case "failed":
      statusMessage =
        "We could not confirm your order because the payment or order attempt was unsuccessful.";
      followUpMessage =
        "Please retry the payment or contact us for assistance.";
      break;

    case "refunded":
      statusMessage =
        "The refund for your order has been processed.";
      followUpMessage =
        "The amount may take a few business days to reflect, depending on your payment provider.";
      break;

    default:
      statusMessage = `Your order status is now ${status.replace(/-/g, " ")}.`;
      followUpMessage =
        "We will keep you updated if there are any further changes.";
      break;
  }

  const lines = [
    `Hello ${firstName},`,
    "",
    `Thank you for shopping with ${businessName}.`,
    "",
    statusMessage,
    "",
    `Order: #${orderNumber}`,
    "Order details:",
    ...(itemLines.length ? itemLines : ["- Order item details unavailable"]),
  ];

  const hasShipment = Boolean(
    shipment.courier ||
      shipment.awb ||
      shipment.status ||
      shipment.shippedDate
  );

  if (status === "completed" && hasShipment) {
    lines.push("", "Shipment details:");

    if (shipment.courier) {
      lines.push(`Courier: ${shipment.courier}`);
    }

    if (shipment.awb) {
      lines.push(`Tracking / AWB: ${shipment.awb}`);
    }

    if (shipment.status) {
      lines.push(`Shipment status: ${shipment.status}`);
    }

    if (shipment.shippedDate) {
      lines.push(`Shipped on: ${formatWhatsAppDate(shipment.shippedDate)}`);
    }
  }

  lines.push(
    "",
    `Total: Rs. ${order.total || "0"}`,
    `Payment method: ${order.payment_method_title || "Not specified"}`,
    "",
    followUpMessage,
    "",
    "Regards,",
    `${businessName} Team`
  );

  return lines.join("\n");
}
function openWhatsAppStatusDraft(order: WCOrder, storeName: string) {
  const phone = normalizeWhatsAppPhone(order.billing?.phone);

  if (!phone) {
    alert("Customer WhatsApp number is missing or invalid.");
    return;
  }

  const message = buildWhatsAppStatusMessage(order, storeName);
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  const popup = window.open(url, "_blank", "noopener,noreferrer");

  if (!popup) {
    window.location.href = url;
  }
}
function ActionMenu({
  order,
  storeName,
  onTrash,
}: {
  order: WCOrder;
  storeName: string;
  onTrash: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const isTrash = String(order.status || "").toLowerCase() === "trash";
  const orderNumber = order.number || order.id;
  const customerName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    "Customer";
  const statusLabel = String(order.status || "pending").replace(/-/g, " ");

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Open actions for order ${orderNumber}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close order actions"
            className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-[2px] xl:hidden"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label={`Actions for order ${orderNumber}`}
            className="fixed inset-x-3 bottom-3 z-[90] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_28px_80px_rgba(15,23,42,0.28)] xl:hidden"
          >
            <div className="flex items-start justify-between gap-4 px-2 pb-3 pt-1">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-violet-600">
                  Order actions
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  Order #{orderNumber}
                </div>
                <div className="mt-0.5 truncate text-sm text-slate-500">
                  {customerName}
                </div>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <Link
                href={`/orders/${order.id}`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left transition hover:bg-slate-50"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Eye className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    View order
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Open full order details
                  </span>
                </span>
              </Link>

              {!isTrash && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openWhatsAppStatusDraft(order, storeName);
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-left transition hover:bg-emerald-100"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                    <MessageCircle className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-emerald-900">
                      Notify status in WhatsApp
                    </span>
                    <span className="mt-0.5 block text-xs capitalize text-emerald-700">
                      Draft the current {statusLabel} update
                    </span>
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onTrash(order.id);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-left transition hover:bg-rose-100"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                  <Trash2 className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-rose-800">
                    Move to trash
                  </span>
                  <span className="mt-0.5 block text-xs text-rose-600">
                    Remove this order from the active list
                  </span>
                </span>
              </button>
            </div>
          </section>

          <div className="absolute right-0 top-12 z-30 hidden min-w-[210px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl xl:block">
            <Link
              href={`/orders/${order.id}`}
              className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              View order
            </Link>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTrash(order.id);
              }}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
            >
              Move to trash
            </button>
          </div>
        </>
      )}
    </div>
  );
}
export default function OrdersClient({
  orders,
  categories = [],
  storeName,
}: OrdersClientProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [action, setAction] = useState<string>("");
  const [packSlipBusy, setPackSlipBusy] = useState(false);

  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [page, setPage] = useState(1);

  const allIds = useMemo(() => orders.map((o) => o.id), [orders]);
  const allSelected = selected.length > 0 && selected.length === allIds.length;

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((orders.length || 0) / rowsPerPage)),
    [orders.length, rowsPerPage]
  );

  const currentPage = Math.min(page, pageCount);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return orders.slice(start, start + rowsPerPage);
  }, [orders, currentPage, rowsPerPage]);

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

  async function downloadPackSlips() {
    if (selected.length === 0) {
      alert("Select at least one order to download packing slips.");
      return;
    }

    setPackSlipBusy(true);

    try {
      const mod = await import("./ui/PackingSlipPdfClient");
      await mod.default.generateForOrders(selected, storeName);
    } catch (error) {
      console.error(error);
      alert("Failed to download packing slip PDF.");
    } finally {
      setPackSlipBusy(false);
    }
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

  const total = orders.length;
  const startIndex = total === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIndex = total === 0 ? 0 : Math.min(currentPage * rowsPerPage, total);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-semibold text-slate-900">
              Order list
            </h2>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {orders.length} orders
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
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
              type="button"
              onClick={downloadPackSlips}
              disabled={packSlipBusy}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {packSlipBusy ? "Preparing PDF..." : "Download Pack Slips"}
            </button>

            <OrdersExportButton categories={categories} />

            <div className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {selected.length} selected
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
                const customerName =
                  `${o.billing?.first_name || ""} ${
                    o.billing?.last_name || ""
                  }`.trim() || "Customer";
                const shipment = extractShipmentFromMeta(
                  (o as any).meta_data || []
                );
                const hasShipment = !!(shipment.awb || shipment.courier);

                return (
                  <div
                    key={o.id}
                    className="rounded-[20px] border border-slate-200 bg-white px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-3">
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
                          className="h-16 w-16 shrink-0 rounded-2xl border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/orders/${o.id}`}
                              className="block truncate text-[15px] font-semibold text-slate-900"
                            >
                              #{o.number || o.id}
                            </Link>
                            <div className="mt-0.5 truncate text-[14px] font-medium text-slate-700">
                              {customerName}
                            </div>
                          </div>

                          <ActionMenu order={o} storeName={storeName} onTrash={moveOneToTrash} />
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={statusPillClass(o.status)}>
                            {String(o.status || "").replace("_", " ")}
                          </span>
                          <span className="text-[15px] font-semibold text-slate-900">
                            ₹{o.total}
                          </span>
                        </div>

                        <div className="mt-2 text-[14px] text-slate-600">
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
                const shipment = extractShipmentFromMeta(
                  (o as any).meta_data || []
                );
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
                        className="text-[15px] font-semibold text-indigo-700 hover:underline"
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

                    <td className="px-4 py-4 text-[15px] font-semibold text-slate-900">
                      ₹{o.total}
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500">
                      {formatShortDate(o.date_created_gmt)}
                    </td>

                    <td className="px-4 py-4 text-right">
                      <ActionMenu order={o} storeName={storeName} onTrash={moveOneToTrash} />
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

        {orders.length > 0 && (
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