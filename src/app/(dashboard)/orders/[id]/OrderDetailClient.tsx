"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { WCOrder } from "@/lib/order-utils";
import { actionFeedback } from "@/lib/actionFeedback";
import { AsyncButton } from "@/components/ui/async-button";
import { Button, buttonClassName } from "@/components/ui/button";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import OrderPaymentInformation from "./OrderPaymentInformation";
import {
  extractShipmentFromMeta,
  mergeShipmentMeta,
} from "@/lib/shipment-meta";
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  MapPin,
  Package2,
  Pencil,
  Search,
  Truck,
  User,
  X,
} from "lucide-react";

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

type ProductSuggestion = {
  id: number;
  name: string;
  sku?: string;
  price?: string | number;
  regular_price?: string | number;
  image?: { src?: string };
  images?: { src?: string }[];
};

type Props = {
  initialOrder: (WCOrder & { meta_data?: any[] }) | any;
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

function toNumberPrice(v: string | number | null | undefined) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function orderStatusLabel(status?: string) {
  const normalized = String(status || "pending").toLowerCase();

  switch (normalized) {
    case "pending":
      return "Pending payment";
    case "processing":
      return "Processing";
    case "on-hold":
      return "On hold";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Payment failed";
    case "refunded":
      return "Refunded";
    default:
      return normalized.replace(/[-_]+/g, " ");
  }
}

function orderStatusTone(status?: string): StatusTone {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "completed") return "success";
  if (normalized === "processing") return "info";
  if (normalized === "pending" || normalized === "on-hold") return "warning";
  if (normalized === "cancelled" || normalized === "failed") return "danger";

  return "neutral";
}

function OrderStatusBadge({ status }: { status?: string }) {
  return (
    <StatusBadge
      status={String(status || "pending")}
      label={orderStatusLabel(status)}
      tone={orderStatusTone(status)}
      className="min-h-7 px-3 py-1.5 text-xs font-extrabold shadow-sm"
    />
  );
}

function paymentMethodLabel(order: WCOrder) {
  const method = String(
    (order as WCOrder & { payment_method?: string }).payment_method || ""
  )
    .trim()
    .toLowerCase();
  const title = String(order.payment_method_title || "").trim();
  const titleKey = title.toLowerCase();

  if (
    method.includes("payglocal") ||
    (titleKey.includes("upi") &&
      (titleKey.includes("debit") ||
        titleKey.includes("credit") ||
        titleKey.includes("netbanking")))
  ) {
    return "PayGlocal Payment Gateway";
  }

  return title || "Not specified";
}

function SectionCard({
  title,
  hint,
  icon: Icon,
  children,
  right,
}: {
  title: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading md:text-base">
              {title}
            </h2>
            {hint ? (
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {hint}
              </p>
            ) : null}
          </div>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="p-3 md:p-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

function MobileField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] transition",
        "placeholder:text-muted-foreground",
        props.className || "",
      ].join(" ")}
    />
  );
}

function MobileSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] transition",
        props.className || "",
      ].join(" ")}
    />
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        strong ? "text-base font-semibold text-slate-900" : "text-sm text-slate-600"
      }`}
    >
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function AddressView({ data }: { data: Address }) {
  const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim();

  return (
    <div className="space-y-2 text-sm text-slate-700">
      <div className="font-semibold text-slate-900">{fullName || "—"}</div>
      {data.company && <div>{data.company}</div>}
      {data.address_1 && <div>{data.address_1}</div>}
      {data.address_2 && <div>{data.address_2}</div>}
      <div>
        {[data.city, data.state, data.postcode].filter(Boolean).join(", ") || "—"}
      </div>
      {data.country && <div>{data.country}</div>}
      {data.phone && <div className="text-xs text-slate-500">📞 {data.phone}</div>}
      {data.email && <div className="text-xs text-slate-500">✉️ {data.email}</div>}
    </div>
  );
}

export default function OrderDetailClient({ initialOrder }: Props) {
  const [order, setOrder] = useState(initialOrder);
  const [status, setStatus] = useState(order.status || "pending");
  const [savingStatus, setSavingStatus] = useState(false);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

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
    status: initialShipment.status || "",
    mode: (initialShipment.mode as ShipmentMode) || "",
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

  const [productSearchIndex, setProductSearchIndex] = useState<number | null>(
    null
  );
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<
    ProductSuggestion[]
  >([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);

  useEffect(() => {
    if (!editMode || productSearchIndex === null) {
      setProductSearchResults([]);
      setProductSearchLoading(false);
      return;
    }

    const q = productSearchQuery.trim();
    if (q.length < 2) {
      setProductSearchResults([]);
      setProductSearchLoading(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setProductSearchLoading(true);

        const r = await fetch(
          `/api/products/search?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        const j = await r.json().catch(() => ({}));

        if (!r.ok) {
          setProductSearchResults([]);
          return;
        }

        setProductSearchResults(Array.isArray(j?.results) ? j.results : []);
      } catch {
        setProductSearchResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [editMode, productSearchIndex, productSearchQuery]);

  const itemCount = useMemo(
    () =>
      (editMode ? itemsDraft : order.line_items || []).reduce(
        (sum: number, li: any) => sum + (Number(li.quantity) || 0),
        0
      ),
    [editMode, itemsDraft, order.line_items]
  );

  async function handleStatusUpdate() {
    if (savingStatus || status === order.status) return;

    const feedbackId = `order-status-${order.id}`;
    setSavingStatus(true);
    actionFeedback.loading({
      id: feedbackId,
      title: "Updating order status…",
      message: `Order #${order.number || order.id}`,
    });

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
        throw new Error(j?.error || "Failed to update status.");
      }

      setOrder((prev: typeof order) => ({
        ...prev,
        status,
      }));

      actionFeedback.success({
        id: feedbackId,
        title: "Order status updated",
        message: orderStatusLabel(status),
        durationMs: 2600,
      });
    } catch (error) {
      actionFeedback.error({
        id: feedbackId,
        title: "Status update failed",
        message:
          error instanceof Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleCreateInvoice() {
    if (invoiceBusy) return;

    const feedbackId = `order-invoice-${order.id}`;
    setInvoiceBusy(true);
    actionFeedback.loading({
      id: feedbackId,
      title: "Preparing invoice…",
      message: `Order #${order.number || order.id}`,
    });

    try {
      const mod = await import("../ui/InvoicePdfClient");
      await mod.default.generateForOrders([order.id]);

      actionFeedback.success({
        id: feedbackId,
        title: "Invoice ready",
        message: "PDF download started.",
        durationMs: 2600,
      });
    } catch (error) {
      console.error(error);
      actionFeedback.error({
        id: feedbackId,
        title: "Invoice generation failed",
        message: "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setInvoiceBusy(false);
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
      status: freshShipment.status || "",
      mode: (freshShipment.mode as ShipmentMode) || "",
      shippedDate: toDateInputValue(
        freshShipment.shippedDate ||
          (order.status === "completed" ? order.date_completed_gmt : "")
      ),
    });
    setProductSearchIndex(null);
    setProductSearchQuery("");
    setProductSearchResults([]);
    setEditMode(true);
  }

  function cancelEdit() {
    setEditMode(false);
    setProductSearchIndex(null);
    setProductSearchQuery("");
    setProductSearchResults([]);
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

  function startProductSearch(idx: number, value: string) {
    setProductSearchIndex(idx);
    setProductSearchQuery(value);
  }

  function selectProductForRow(idx: number, product: ProductSuggestion) {
    const pickedPrice =
      toNumberPrice(product.price) || toNumberPrice(product.regular_price);

    const pickedImg = product.image?.src || product.images?.[0]?.src || "";

    updateItem(idx, {
      product_id: product.id,
      name: product.name || "",
      sku: product.sku || "",
      price: pickedPrice,
      image: pickedImg ? { src: pickedImg } : undefined,
    });

    setProductSearchIndex(null);
    setProductSearchQuery("");
    setProductSearchResults([]);
  }

  async function handleSaveOrder() {
    if (savingOrder) return false;

    const feedbackId = `order-save-${order.id}`;
    setSavingOrder(true);
    actionFeedback.loading({
      id: feedbackId,
      title: "Saving order changes…",
      message: `Order #${order.number || order.id}`,
    });

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
        throw new Error(j?.error || "Failed to save order.");
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
        throw new Error(
          updatedOrder?.error || "Failed to save shipment details."
        );
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
        status: savedShipment.status || "",
        mode: (savedShipment.mode as ShipmentMode) || "",
        shippedDate: toDateInputValue(
          savedShipment.shippedDate ||
            (updatedOrder.status === "completed"
              ? updatedOrder.date_completed_gmt
              : "")
        ),
      });

      setProductSearchIndex(null);
      setProductSearchQuery("");
      setProductSearchResults([]);

      actionFeedback.success({
        id: feedbackId,
        title: "Order updated",
        message: "Customer, items and shipment details were saved.",
        durationMs: 3000,
      });

      return true;
    } catch (error) {
      console.error(error);
      actionFeedback.error({
        id: feedbackId,
        title: "Could not save order",
        message:
          error instanceof Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
      return false;
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
    Number(order.total || 0) || subtotal + shippingTotal + taxTotal - discountTotal;

  const billingView = editMode ? billingDraft : order.billing || {};
  const shippingView = editMode
    ? shippingDraft
    : order.shipping || order.billing || {};

  const visibleDraftItems = editMode
    ? itemsDraft.filter((i) => !i.removed)
    : [];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="hidden items-start justify-between gap-4 border-b border-border p-4 md:flex">
          <div className="min-w-0">
            <Link
              href="/orders"
              className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Link>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-heading">
                Order #{order.number || order.id}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Placed {formatNiceDate(order.date_created_gmt)}</span>
              <span>{paymentMethodLabel(order)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <AsyncButton
              variant="outline"
              loading={invoiceBusy}
              loadingLabel="Preparing…"
              onClick={handleCreateInvoice}
            >
              <FileText className="h-4 w-4" />
              Invoice
            </AsyncButton>

            <Button
              variant="outline"
              onClick={() => (editMode ? cancelEdit() : enterEditMode())}
            >
              <Pencil className="h-4 w-4" />
              {editMode ? "Cancel edit" : "Edit order"}
            </Button>
          </div>
        </div>

        <div className="p-3 md:p-4">
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-lg font-extrabold text-heading">
                    #{order.number || order.id}
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="mt-1 truncate text-sm font-bold text-heading">
                  {`${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                    "Guest customer"}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {formatNiceDate(order.date_created_gmt)}
                </div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-lg font-extrabold text-heading">
                  ₹{grandTotal.toFixed(2)}
                </div>
                <div className="mt-1 max-w-32 text-[10px] leading-4 text-muted-foreground">
                  {paymentMethodLabel(order)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-border bg-surface-soft">
              <div className="px-3 py-2.5">
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Items
                </div>
                <div className="mt-1 text-sm font-extrabold text-heading">
                  {itemCount}
                </div>
              </div>
              <div className="border-l border-border px-3 py-2.5">
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Shipping
                </div>
                <div className="mt-1 text-sm font-extrabold text-heading">
                  ₹{shippingTotal.toFixed(2)}
                </div>
              </div>
              <div className="border-l border-border px-3 py-2.5">
                <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                  Tax
                </div>
                <div className="mt-1 text-sm font-extrabold text-heading">
                  ₹{taxTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <AsyncButton
                variant="outline"
                size="sm"
                loading={invoiceBusy}
                loadingLabel="Preparing…"
                onClick={handleCreateInvoice}
              >
                <FileText className="h-4 w-4" />
                Invoice
              </AsyncButton>

              <Button
                variant="outline"
                size="sm"
                onClick={() => (editMode ? cancelEdit() : enterEditMode())}
              >
                <Pencil className="h-4 w-4" />
                {editMode ? "Cancel" : "Edit"}
              </Button>
            </div>
          </div>

          <div className="mt-3 border-t border-border pt-3 md:mt-0 md:border-t-0 md:pt-0">
            <div className="grid gap-2 md:grid-cols-[auto_minmax(180px,260px)_auto] md:items-center md:justify-end">
              <div className="hidden md:block">
                <OrderStatusBadge status={order.status} />
              </div>

              <MobileSelect
                value={status}
                onChange={(event) => setStatus(event.currentTarget.value)}
              >
                <option value="pending">Pending payment</option>
                <option value="processing">Processing</option>
                <option value="on-hold">On hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="failed">Failed</option>
              </MobileSelect>

              <AsyncButton
                loading={savingStatus}
                loadingLabel="Updating…"
                disabled={status === order.status}
                onClick={handleStatusUpdate}
              >
                Update status
              </AsyncButton>
            </div>
          </div>
        </div>
      </section>

      <OrderPaymentInformation order={order} />

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Billing" hint="Billing contact and address" icon={User}>
          {!editMode ? (
            <AddressView data={billingView} />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MobileField
                  placeholder="First name"
                  value={billingView.first_name || ""}
                  onChange={(e) =>
                    updateAddress("billing", "first_name", e.target.value)
                  }
                />
                <MobileField
                  placeholder="Last name"
                  value={billingView.last_name || ""}
                  onChange={(e) =>
                    updateAddress("billing", "last_name", e.target.value)
                  }
                />
              </div>

              <MobileField
                placeholder="Company"
                value={billingView.company || ""}
                onChange={(e) =>
                  updateAddress("billing", "company", e.target.value)
                }
              />
              <MobileField
                placeholder="Address line 1"
                value={billingView.address_1 || ""}
                onChange={(e) =>
                  updateAddress("billing", "address_1", e.target.value)
                }
              />
              <MobileField
                placeholder="Address line 2"
                value={billingView.address_2 || ""}
                onChange={(e) =>
                  updateAddress("billing", "address_2", e.target.value)
                }
              />
              <div className="grid grid-cols-3 gap-3">
                <MobileField
                  placeholder="City"
                  value={billingView.city || ""}
                  onChange={(e) => updateAddress("billing", "city", e.target.value)}
                />
                <MobileField
                  placeholder="State"
                  value={billingView.state || ""}
                  onChange={(e) => updateAddress("billing", "state", e.target.value)}
                />
                <MobileField
                  placeholder="Pincode"
                  value={billingView.postcode || ""}
                  onChange={(e) =>
                    updateAddress("billing", "postcode", e.target.value)
                  }
                />
              </div>
              <MobileField
                placeholder="Country"
                value={billingView.country || ""}
                onChange={(e) =>
                  updateAddress("billing", "country", e.target.value)
                }
              />
              <MobileField
                placeholder="Phone"
                value={billingView.phone || ""}
                onChange={(e) => updateAddress("billing", "phone", e.target.value)}
              />
              <MobileField
                placeholder="Email"
                value={billingView.email || ""}
                onChange={(e) => updateAddress("billing", "email", e.target.value)}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Shipping"
          hint="Delivery contact and address"
          icon={MapPin}
        >
          {!editMode ? (
            <AddressView data={shippingView} />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <MobileField
                  placeholder="First name"
                  value={shippingView.first_name || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "first_name", e.target.value)
                  }
                />
                <MobileField
                  placeholder="Last name"
                  value={shippingView.last_name || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "last_name", e.target.value)
                  }
                />
              </div>

              <MobileField
                placeholder="Company"
                value={shippingView.company || ""}
                onChange={(e) =>
                  updateAddress("shipping", "company", e.target.value)
                }
              />
              <MobileField
                placeholder="Address line 1"
                value={shippingView.address_1 || ""}
                onChange={(e) =>
                  updateAddress("shipping", "address_1", e.target.value)
                }
              />
              <MobileField
                placeholder="Address line 2"
                value={shippingView.address_2 || ""}
                onChange={(e) =>
                  updateAddress("shipping", "address_2", e.target.value)
                }
              />
              <div className="grid grid-cols-3 gap-3">
                <MobileField
                  placeholder="City"
                  value={shippingView.city || ""}
                  onChange={(e) => updateAddress("shipping", "city", e.target.value)}
                />
                <MobileField
                  placeholder="State"
                  value={shippingView.state || ""}
                  onChange={(e) => updateAddress("shipping", "state", e.target.value)}
                />
                <MobileField
                  placeholder="Pincode"
                  value={shippingView.postcode || ""}
                  onChange={(e) =>
                    updateAddress("shipping", "postcode", e.target.value)
                  }
                />
              </div>
              <MobileField
                placeholder="Country"
                value={shippingView.country || ""}
                onChange={(e) =>
                  updateAddress("shipping", "country", e.target.value)
                }
              />
              <MobileField
                placeholder="Phone"
                value={shippingView.phone || ""}
                onChange={(e) => updateAddress("shipping", "phone", e.target.value)}
              />
              <MobileField
                placeholder="Email"
                value={shippingView.email || ""}
                onChange={(e) => updateAddress("shipping", "email", e.target.value)}
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Shipment"
          hint="Courier, tracking and shipment progress"
          icon={Truck}
        >
          {!editMode ? (
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Courier:
                </span>{" "}
                <span className="font-medium text-slate-900">
                  {shipment.courier || "Not specified"}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Mode:
                </span>{" "}
                {shipment.mode || "Not specified"}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Tracking:
                </span>{" "}
                {shipment.awb || "—"}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Status:
                </span>{" "}
                {shipment.status || "Not set"}
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Shipped on:
                </span>{" "}
                {formatShipmentDate(displayedShippedDate)}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <MobileField
                placeholder="Courier name"
                value={shipmentDraft.courier}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    courier: e.target.value,
                  }))
                }
              />

              <MobileSelect
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
              </MobileSelect>

              <MobileField
                placeholder="Tracking number"
                value={shipmentDraft.awb}
                onChange={(e) =>
                  setShipmentDraft((prev) => ({
                    ...prev,
                    awb: e.target.value,
                  }))
                }
              />

              <MobileSelect
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
              </MobileSelect>

              <MobileField
                type="date"
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
        </SectionCard>
      </div>

      <SectionCard
        title="Items"
        hint="Order products and quantities"
        icon={Package2}
        right={
          editMode ? (
            <button
              type="button"
              onClick={addNewItem}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              + Add item
            </button>
          ) : (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {itemCount} pcs
            </div>
          )
        }
      >
        {!editMode ? (
          <div className="space-y-3">
            {(order.line_items || []).map((li: any) => {
              const imgSrc = li.image?.src || li.product_image || "";
              return (
                <div
                  key={li.id}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white"
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
                        <span className="text-[10px] text-slate-400">No image</span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900">
                        {li.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {li.sku ? `SKU: ${li.sku}` : "No SKU"}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-[16px] bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                            Qty
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {li.quantity}
                          </div>
                        </div>
                        <div className="rounded-[16px] bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                            Price
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            ₹{li.price}
                          </div>
                        </div>
                        <div className="rounded-[16px] bg-white px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.08em] text-slate-400">
                            Total
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            ₹{li.total}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDraftItems.map((li, visibleIdx) => {
              const idx = itemsDraft.findIndex((x) => x === li);
              const imgSrc = li.image?.src;
              const lineTotal =
                (Number(li.price) || 0) * (Number(li.quantity) || 0);
              const dropdownOpen =
                productSearchIndex === idx &&
                (productSearchLoading || productSearchResults.length > 0);

              return (
                <div
                  key={li.id ?? `new-${visibleIdx}`}
                  className="rounded-[22px] border border-slate-200 bg-slate-50/50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white"
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
                        <span className="text-[10px] text-slate-400">No image</span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="relative">
                        <FieldLabel>Product</FieldLabel>
                        <MobileField
                          placeholder="Search product by name or SKU"
                          value={li.name}
                          onFocus={() => startProductSearch(idx, li.name || "")}
                          onChange={(e) => {
                            const value = e.target.value;
                            updateItem(idx, {
                              name: value,
                              product_id: undefined,
                            });
                            startProductSearch(idx, value);
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setProductSearchIndex((current) =>
                                current === idx ? null : current
                              );
                            }, 180);
                          }}
                        />

                        {dropdownOpen && (
                          <div className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                            {productSearchLoading ? (
                              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Searching products...
                              </div>
                            ) : (
                              <>
                                {productSearchResults.map((p) => {
                                  const pImg =
                                    p.image?.src || p.images?.[0]?.src || "";
                                  const pPrice =
                                    toNumberPrice(p.price) ||
                                    toNumberPrice(p.regular_price);

                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => selectProductForRow(idx, p)}
                                    >
                                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                                        {pImg ? (
                                          <img
                                            src={pImg}
                                            alt={p.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <Search className="h-4 w-4 text-slate-300" />
                                        )}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="truncate text-sm font-medium text-slate-900">
                                          {p.name}
                                        </div>
                                        <div className="truncate text-xs text-slate-500">
                                          {p.sku ? `SKU: ${p.sku}` : "No SKU"}
                                          {pPrice > 0 ? ` • ₹${pPrice}` : ""}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}

                                {!productSearchResults.length && (
                                  <div className="px-3 py-3 text-sm text-slate-500">
                                    No matching products found.
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <FieldLabel>SKU</FieldLabel>
                      <MobileField
                        placeholder="SKU (optional)"
                        value={li.sku || ""}
                        onChange={(e) => updateItem(idx, { sku: e.target.value })}
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <FieldLabel>Qty</FieldLabel>
                          <MobileField
                            type="number"
                            min={1}
                            value={li.quantity}
                            onChange={(e) =>
                              updateItem(idx, {
                                quantity: Number(e.target.value) || 1,
                              })
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Price</FieldLabel>
                          <MobileField
                            type="number"
                            step="0.01"
                            value={li.price}
                            onChange={(e) =>
                              updateItem(idx, {
                                price: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </div>

                        <div>
                          <FieldLabel>Line total</FieldLabel>
                          <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm">
                            ₹{lineTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                        onClick={() => removeItem(idx)}
                      >
                        Remove item
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          {editMode && (
            <SectionCard
              title="Save changes"
              hint="Review edits before saving this order"
              icon={Check}
            >
              <div className="flex flex-wrap items-center gap-3">
                <AsyncButton
                  loading={savingOrder}
                  loadingLabel="Saving…"
                  onClick={handleSaveOrder}
                >
                  Save order changes
                </AsyncButton>

                <Button
                  variant="outline"
                  onClick={cancelEdit}
                  disabled={savingOrder}
                >
                  Cancel
                </Button>
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard
          title="Order summary"
          hint="Final amount breakdown"
          icon={FileText}
        >
          <div className="space-y-3">
            <SummaryRow label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />

            {discountTotal > 0 && (
              <SummaryRow
                label="Discount"
                value={`- ₹${discountTotal.toFixed(2)}`}
              />
            )}

            <SummaryRow label="Shipping" value={`₹${shippingTotal.toFixed(2)}`} />
            <SummaryRow label="Tax" value={`₹${taxTotal.toFixed(2)}`} />

            <div className="border-t border-slate-100 pt-3">
              <SummaryRow
                label="Total"
                value={`₹${grandTotal.toFixed(2)}`}
                strong
              />
            </div>
          </div>
        </SectionCard>
      </div>

      {previewSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col gap-3 rounded-[24px] bg-white p-3 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-sm font-medium text-slate-800">
                {previewTitle || "Product image"}
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                onClick={() => setPreviewSrc(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <img
              src={previewSrc}
              alt={previewTitle}
              className="mx-auto max-h-[70vh] rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {editMode && (
        <div className="sticky bottom-3 z-40 -mx-1 md:hidden">
          <div className="rounded-[26px] border border-slate-200/90 bg-white/92 p-3 shadow-[0_20px_50px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={cancelEdit}
                disabled={savingOrder}
              >
                Cancel
              </Button>

              <AsyncButton
                loading={savingOrder}
                loadingLabel="Saving…"
                onClick={handleSaveOrder}
              >
                Save
              </AsyncButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
