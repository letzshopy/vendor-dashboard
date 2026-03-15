"use client";

import { useMemo, useState } from "react";
import type { WCOrder } from "@/lib/order-utils";
import { statusPillClass } from "@/lib/order-utils";
import {
  extractShipmentFromMeta,
  mergeShipmentMeta,
} from "@/lib/shipment-meta";

type Address = {
  first_name?: string;
  last_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

type EditableLineItem = {
  id?: number;
  product_id?: number;
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  image?: { src?: string };
  isNew?: boolean;
  removed?: boolean;
};

type ShipmentStatus =
  | ""
  | "pending"
  | "packed"
  | "shipped"
  | "delivered"
  | "returned";

type ShipmentMode = "" | "shift" | "self";
type ShipmentDraft = {
  courier: string;
  awb: string;
  status: ShipmentStatus;
  mode: ShipmentMode;
  shippedDate: string;
};

type Props = {
  initialOrder: (WCOrder &
 { meta_data?: any[] }) | any;
};

function formatNiceDate(dateGmt?: string | null) {
  if (!dateGmt) return "-";
  const d = new Date(dateGmt + "Z");
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function formatShipmentDate(value?: string | null) {
  if (!value) return "Not set";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function OrderDetailClient({ initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState(order.status || "pending");
  const [savingStatus, setSavingStatus] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const [billingDraft, setBillingDraft] = useState<Address>(order.billing || {});
  const [shippingDraft, setShippingDraft] = useState<Address>(
    order.shipping || order.billing || {}
  );
  const [itemsDraft, setItemsDraft] = useState<EditableLineItem[]>(() =>
    (order.line_items || []).map((li: any) => ({
      id: li.id,
      product_id: li.product_id,
      name: li.name || "",
      sku: li.sku || "",
      quantity: Number(li.quantity || 1),
      price: Number(li.price || li.total || 0),
      image: li.image || {},
    }))
  );

  const initialShipment = useMemo(
    () => extractShipmentFromMeta((order as any).meta_data || []),
    [order]
  );

  const [shipmentDraft, setShipmentDraft] = useState<ShipmentDraft>({
    courier: initialShipment.courier || "",
    awb: initialShipment.awb || "",
    status: (initialShipment.status || "") as ShipmentStatus,
    mode: (initialShipment.mode || "") as ShipmentMode,
    shippedDate: toDateInputValue(initialShipment.shippedDate || ""),
  });

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const shipment = useMemo(
    () => extractShipmentFromMeta((order as any).meta_data || []),
    [order]
  );

  const displayedShippedDate =
    shipment.shippedDate ||
    (order.status === "completed" ? order.date_completed_gmt : "") ||
    "";

  const itemCount = useMemo(
    () =>
      (editMode ? itemsDraft : order.line_items || []).reduce(
        (sum: number, li: any) => sum + (Number(li.quantity) || 0),
        0
      ),
    [editMode, itemsDraft, order.line_items]
  );

  async function handleStatusUpdate() {
    setSavingStatus(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [order.id],
          action: "status",
          status,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Failed to update status.");
        return;
      }
      setOrder((prev: any) => ({ ...prev, status }));
      alert("Order status updated.");
    } catch (e) {
      console.error(e);
      alert("Something went wrong while updating status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleCreateInvoice() {
    try {
      const mod = await import("../ui/InvoicePdfClient");
      await mod.default.generateForOrders([order.id]);
    } catch (e) {
      console.error(e);
      alert("Failed to generate invoice PDF.");
    }
  }

  function enterEditMode() {
    const freshShipment = extractShipmentFromMeta((order as any).meta_data || []);

    setBillingDraft(order.billing || {});
    setShippingDraft(order.shipping || order.billing || {});
    setItemsDraft(
      (order.line_items || []).map((li: any) => ({
        id: li.id,
        product_id: li.product_id,
        name: li.name || "",
        sku: li.sku || "",
        quantity: Number(li.quantity || 1),
        price: Number(li.price || li.total || 0),
        image: li.image || {},
      }))
    );
    setShipmentDraft({
      courier: freshShipment.courier || "",
      awb: freshShipment.awb || "",
      status: (freshShipment.status || "") as ShipmentStatus,
      mode: (freshShipment.mode || "") as ShipmentMode,
      shippedDate: toDateInputValue(
        freshShipment.shippedDate ||
          (order.status === "completed" ? order.date_completed_gmt : "")
      ),
    });
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
  }

  function updateAddress(
    kind: "billing" | "shipping",
    field: keyof Address,
    value: string
  ) {
    if (kind === "billing") {
      setBillingDraft((prev) => ({ ...prev, [field]: value }));
    } else {
      setShippingDraft((prev) => ({ ...prev, [field]: value }));
    }
  }

  function updateItem(idx: number, patch: Partial<EditableLineItem>) {
    setItemsDraft((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }

  function removeItem(idx: number) {
    setItemsDraft((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, removed: true } : it))
    );
  }

  function addNewItem() {
    setItemsDraft((prev) => [
      ...prev,
      {
        name: "",
        quantity: 1,
        price: 0,
        sku: "",
        isNew: true,
      },
    ]);
  }

  async function handleSaveOrder() {
    setSavingOrder(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billing: billingDraft,
          shipping: shippingDraft,
          items: itemsDraft,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j?.error || "Failed to save order.");
        return;
      }

      const currentMeta = j.meta_data || order.meta_data || [];
      const shipmentMeta = mergeShipmentMeta(currentMeta, {
        courier: shipmentDraft.courier || "",
        awb: shipmentDraft.awb || "",
        status: shipmentDraft.status || "",
        mode: shipmentDraft.mode || undefined,
        shippedDate: shipmentDraft.shippedDate
          ? new Date(`${shipmentDraft.shippedDate}T00:00:00`).toISOString()
          : "",
      });

      const metaRes = await fetch(`/api/orders/${order.id}/update`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_data: shipmentMeta,
        }),
      });

      const updatedOrder = await metaRes.json().catch(() => ({}));
      if (!metaRes.ok) {
        alert(updatedOrder?.error || "Failed to save shipment details.");
        return;
      }

      setOrder(updatedOrder);
      setStatus(updatedOrder.status || status);
      setEditMode(false);

      setBillingDraft(updatedOrder.billing || {});
      setShippingDraft(updatedOrder.shipping || updatedOrder.billing || {});
      setItemsDraft(
        (updatedOrder.line_items || []).map((li: any) => ({
          id: li.id,
          product_id: li.product_id,
          name: li.name || "",
          sku: li.sku || "",
          quantity: Number(li.quantity || 1),
          price: Number(li.price || li.total || 0),
          image: li.image || {},
        }))
      );

      const savedShipment = extractShipmentFromMeta(updatedOrder.meta_data || []);
      setShipmentDraft({
        courier: savedShipment.courier || "",
        awb: savedShipment.awb || "",
        status: (savedShipment.status || "") as ShipmentStatus,
        mode: (savedShipment.mode || "") as ShipmentMode,
        shippedDate: toDateInputValue(
          savedShipment.shippedDate ||
            (updatedOrder.status === "completed"
              ? updatedOrder.date_completed_gmt
              : "")
        ),
      });

      alert("Order updated successfully.");
    } catch (e) {
      console.error(e);
      alert("Something went wrong while saving order.");
    } finally {
      setSavingOrder(false);
    }
  }

  const subtotal = useMemo(() => {
    if (editMode) {
      return itemsDraft
        .filter((it) => !it.removed)
        .reduce(
          (sum, it) =>
            sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
          0
        );
    }
    return (order.line_items || []).reduce(
      (sum: number, li: any) => sum + Number(li.subtotal || li.total || 0),
      0
    );
  }, [editMode, itemsDraft, order.line_items]);

  const shippingTotal = Number(order.shipping_total || 0);
  const taxTotal = Number(order.total_tax || 0);
  const discountTotal = Number(order.discount_total || 0);
  const grandTotal =
    Number(order.total || 0) ||
    subtotal + shippingTotal + taxTotal - discountTotal;

  const billingView = editMode ? billingDraft : order.billing || {};
  const shippingView = editMode
    ? shippingDraft
    : order.shipping || order.billing || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Order
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            #{order.number || order.id}
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500">
            Placed on{" "}
            <span className="font-medium">
              {formatNiceDate(order.date_created_gmt)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Payment method: {order.payment_method_title || "-"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-start md:justify-end">
          <button
            type="button"
            onClick={handleCreateInvoice}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            Create PDF Invoice
          </button>

          <button
            type="button"
            onClick={() => (editMode ? cancelEdit() : enterEditMode())}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            {editMode ? "Cancel edit" : "Edit order"}
          </button>

          <div className="flex flex-wrap items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-slate-200">
            <span className={statusPillClass(order.status)}>
              {order.status.replace("_", " ")}
            </span>
            <span className="text-xs text-slate-400">→</span>
            <select
              className="text-xs md:text-sm border-none bg-transparent focus:outline-none focus:ring-0"
              value={status}
              onChange={(e) => setStatus(e.currentTarget.value)}
            >
              <option value="pending">Pending payment</option>
              <option value="processing">Processing</option>
              <option value="on-hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={savingStatus}
              className="rounded-full bg-blue-600 text-white text-xs md:text-sm px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {savingStatus ? "Updating…" : "Update"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Billing
              </div>
              {!editMode ? (
                <div className="font-semibold text-slate-900">
                  {billingView.first_name} {billingView.last_name}
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <input
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="First name"
                    value={billingView.first_name || ""}
                    onChange={(e) =>
                      updateAddress("billing", "first_name", e.target.value)
                    }
                  />
                  <input
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="Last name"
                    value={billingView.last_name || ""}
                    onChange={(e) =>
                      updateAddress("billing", "last_name", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {!editMode ? (
            <div className="text-sm text-slate-700 space-y-1">
              {billingView.address_1 && <div>{billingView.address_1}</div>}
              {billingView.address_2 && <div>{billingView.address_2}</div>}
              <div>
                {[billingView.city, billingView.state, billingView.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {billingView.country && <div>{billingView.country}</div>}
              {billingView.phone && (
                <div className="text-xs text-slate-500">
                  📞 {billingView.phone}
                </div>
              )}
              {billingView.email && (
                <div className="text-xs text-slate-500">
                  ✉️ {billingView.email}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-700 space-y-1 mt-2">
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Address line 1"
                value={billingView.address_1 || ""}
                onChange={(e) =>
                  updateAddress("billing", "address_1", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Address line 2"
                value={billingView.address_2 || ""}
                onChange={(e) =>
                  updateAddress("billing", "address_2", e.target.value)
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="border rounded px-2 py-1"
                  placeholder="City"
                  value={billingView.city || ""}
                  onChange={(e) =>
                    updateAddress("billing", "city", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="State"
                  value={billingView.state || ""}
                  onChange={(e) =>
                    updateAddress("billing", "state", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Pincode"
                  value={billingView.postcode || ""}
                  onChange={(e) =>
                    updateAddress("billing", "postcode", e.target.value)
                  }
                />
              </div>
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Country"
                value={billingView.country || ""}
                onChange={(e) =>
                  updateAddress("billing", "country", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Phone"
                value={billingView.phone || ""}
                onChange={(e) =>
                  updateAddress("billing", "phone", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Email"
                value={billingView.email || ""}
                onChange={(e) =>
                  updateAddress("billing", "email", e.target.value)
                }
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Shipping
              </div>
              {!editMode ? (
                <div className="font-semibold text-slate-900">
                  {shippingView.first_name} {shippingView.last_name}
                </div>
              ) : (
                <div className="flex gap-2 mt-1">
                  <input
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="First name"
                    value={shippingView.first_name || ""}
                    onChange={(e) =>
                      updateAddress("shipping", "first_name", e.target.value)
                    }
                  />
                  <input
                    className="border rounded px-2 py-1 text-xs flex-1"
                    placeholder="Last name"
                    value={shippingView.last_name || ""}
                    onChange={(e) =>
                      updateAddress("shipping", "last_name", e.target.value)
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {!editMode ? (
            <div className="text-sm text-slate-700 space-y-1">
              {shippingView.address_1 && <div>{shippingView.address_1}</div>}
              {shippingView.address_2 && <div>{shippingView.address_2}</div>}
              <div>
                {[shippingView.city, shippingView.state, shippingView.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </div>
              {shippingView.country && <div>{shippingView.country}</div>}
              {(shippingView.phone || shippingView.email) && (
                <div className="space-y-0.5 text-xs text-slate-500">
                  {shippingView.phone && <>📞 {shippingView.phone}</>}
                  {shippingView.email && <div>✉️ {shippingView.email}</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-700 space-y-1 mt-2">
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Address line 1"
                value={shippingView.address_1 || ""}
                onChange={(e) =>
                  updateAddress("shipping", "address_1", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Address line 2"
                value={shippingView.address_2 || ""}
                onChange={(e) =>
                  updateAddress("shipping", "address_2", e.target.value)
                }
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="border rounded px-2 py-1"
                  placeholder="City"
                  value={shippingView.city || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "city", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="State"
                  value={shippingView.state || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "state", e.target.value)
                  }
                />
                <input
                  className="border rounded px-2 py-1"
                  placeholder="Pincode"
                  value={shippingView.postcode || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "postcode", e.target.value)
                  }
                />
              </div>
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Country"
                value={shippingView.country || ""}
                onChange={(e) =>
                  updateAddress("shipping", "country", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Phone"
                value={shippingView.phone || ""}
                onChange={(e) =>
                  updateAddress("shipping", "phone", e.target.value)
                }
              />
              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Email"
                value={shippingView.email || ""}
                onChange={(e) =>
                  updateAddress("shipping", "email", e.target.value)
                }
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="w-full">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Shipment Details
              </div>
              {!editMode ? (
                <div className="font-semibold text-slate-900">
                  {shipment.courier || "Not specified"}
                </div>
              ) : (
                <input
                  className="border rounded px-2 py-1 text-xs w-full mt-1"
                  placeholder="Courier name"
                  value={shipmentDraft.courier}
                  onChange={(e) =>
                    setShipmentDraft((prev) => ({
                      ...prev,
                      courier: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          </div>

          {!editMode ? (
            <div className="text-sm text-slate-700 space-y-1">
              <div>
                <span className="text-xs font-medium text-slate-500">Mode:</span>{" "}
                {shipment.mode || "Not specified"}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Tracking:
                </span>{" "}
                {shipment.awb || "—"}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Status:
                </span>{" "}
                {shipment.status || "Not set"}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500">
                  Shipped on:
                </span>{" "}
                {formatShipmentDate(displayedShippedDate)}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-700 space-y-2 mt-2">
              <select
                className="border rounded px-2 py-1 w-full"
                value={shipmentDraft.mode}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    mode: e.target.value as ShipmentMode,
                  }))
                }
              >
                <option value="">Select mode</option>
                <option value="shift">Shift</option>
                <option value="self">Self</option>
              </select>

              <input
                className="border rounded px-2 py-1 w-full"
                placeholder="Tracking number"
                value={shipmentDraft.awb}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    awb: e.target.value,
                  }))
                }
              />

              <select
                className="border rounded px-2 py-1 w-full"
                value={shipmentDraft.status}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    status: e.target.value as ShipmentStatus,
                  }))
                }
              >
                <option value="">Select shipment status</option>
                <option value="pending">Pending</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
              </select>

              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={shipmentDraft.shippedDate}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    shippedDate: e.target.value,
                  }))
                }
              />
            </div>
          )}

          <div className="mt-2 text-[11px] text-slate-400">
            {editMode
              ? "You can update courier, tracking, shipment status, and shipped date here."
              : "For bulk updates, use Sales → Shipment Details."}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-400">
              Items
            </div>
            <div className="font-semibold text-slate-900">
              {(editMode
                ? itemsDraft.filter((i) => !i.removed)
                : order.line_items || []
              ).length}{" "}
              line item
              {((editMode
                ? itemsDraft.filter((i) => !i.removed)
                : order.line_items || []
              ).length === 1
                ? ""
                : "s")}{" "}
              · {itemCount} pcs
            </div>
          </div>

          {editMode && (
            <button
              type="button"
              onClick={addNewItem}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              + Add line item
            </button>
          )}
        </div>

        {!editMode ? (
          <div className="space-y-3">
            {(order.line_items || []).map((li: any) => {
              const imgSrc = li.image?.src || li.product_image || "";
              return (
                <div
                  key={li.id}
                  className="grid grid-cols-[64px_minmax(0,2fr)_minmax(0,1fr)_80px_100px] gap-3 items-center border border-slate-100 rounded-lg px-3 py-2"
                >
                  <button
                    type="button"
                    className="h-14 w-14 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center"
                    onClick={() => {
                      if (!imgSrc) return;
                      setPreviewSrc(imgSrc);
                      setPreviewTitle(li.name || "");
                    }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={li.name || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {li.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {li.sku ? `SKU: ${li.sku}` : ""}
                    </div>
                  </div>

                  <div className="text-sm text-slate-700">
                    <div className="text-xs text-slate-400">Quantity</div>
                    <div className="font-medium">{li.quantity}</div>
                  </div>

                  <div className="text-right text-sm text-slate-700">
                    <div className="text-xs text-slate-400">Price</div>
                    <div>₹{li.price}</div>
                  </div>

                  <div className="text-right text-sm text-slate-900 font-semibold">
                    <div className="text-xs text-slate-400">Line total</div>
                    <div>₹{li.total}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {itemsDraft.map((li, idx) => {
              if (li.removed) return null;
              const imgSrc = li.image?.src;
              const lineTotal =
                (Number(li.price) || 0) * (Number(li.quantity) || 0);

              return (
                <div
                  key={li.id ?? `new-${idx}`}
                  className="grid grid-cols-[64px_minmax(0,2fr)_minmax(0,1fr)_90px_90px_40px] gap-3 items-center border border-slate-100 rounded-lg px-3 py-2"
                >
                  <button
                    type="button"
                    className="h-14 w-14 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center"
                    onClick={() => {
                      if (!imgSrc) return;
                      setPreviewSrc(imgSrc);
                      setPreviewTitle(li.name || "");
                    }}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={li.name || ""}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">No image</span>
                    )}
                  </button>

                  <div className="min-w-0 space-y-1">
                    <input
                      className="border rounded px-2 py-1 w-full text-xs"
                      placeholder="Item name"
                      value={li.name}
                      onChange={(e) =>
                        updateItem(idx, { name: e.target.value })
                      }
                    />
                    <input
                      className="border rounded px-2 py-1 w-full text-xs"
                      placeholder="SKU (optional)"
                      value={li.sku || ""}
                      onChange={(e) =>
                        updateItem(idx, { sku: e.target.value })
                      }
                    />
                  </div>

                  <div className="text-sm text-slate-700">
                    <div className="text-xs text-slate-400 mb-1">Qty</div>
                    <input
                      type="number"
                      min={1}
                      className="border rounded px-2 py-1 w-16 text-right text-sm"
                      value={li.quantity}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Number(e.target.value) || 1,
                        })
                      }
                    />
                  </div>

                  <div className="text-sm text-slate-700 text-right">
                    <div className="text-xs text-slate-400 mb-1">Price</div>
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1 w-20 text-right text-sm"
                      value={li.price}
                      onChange={(e) =>
                        updateItem(idx, {
                          price: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="text-right text-sm text-slate-900 font-semibold">
                    <div className="text-xs text-slate-400 mb-1">Line total</div>
                    <div>₹{lineTotal.toFixed(2)}</div>
                  </div>

                  <button
                    type="button"
                    className="text-xs text-red-500 hover:text-red-600"
                    onClick={() => removeItem(idx)}
                    title="Remove line item"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 flex flex-col md:flex-row md:justify-between gap-4">
          {editMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveOrder}
                disabled={savingOrder}
                className="rounded-full bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingOrder ? "Saving…" : "Save order changes"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="text-xs text-slate-500 hover:underline"
              >
                Cancel (discard changes)
              </button>
            </div>
          )}

          <div className="w-full md:w-80 border-t border-slate-100 pt-4 space-y-1 text-sm md:ml-auto">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount</span>
                <span>- ₹{discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>₹{shippingTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Tax</span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold text-slate-900">
              <span>Total</span>
              <span>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {previewSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[90vw] max-h-[90vh] p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-slate-800 truncate">
                {previewTitle || "Product image"}
              </div>
              <button
                type="button"
                className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700"
                onClick={() => setPreviewSrc(null)}
              >
                ✕
              </button>
            </div>
            <img
              src={previewSrc}
              alt={previewTitle}
              className="max-h-[70vh] mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}