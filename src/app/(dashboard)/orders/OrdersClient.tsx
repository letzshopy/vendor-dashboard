"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  MessageCircle,
  MoreHorizontal,
  Package2,
  Trash2,
  X,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import OrdersExportButton from "./ui/OrdersExportButton";
import {
  UPIVerificationInline,
} from "./UPIVerificationInline";

import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
  buttonClassName,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  StatusBadge,
  type StatusTone,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import {
  type WCOrder,
} from "@/lib/order-utils";
import {
  extractShipmentFromMeta,
} from "@/lib/shipment-meta";

type Category = {
  id: number;
  name: string;
  parent: number;
};

type OrdersClientProps = {
  orders: WCOrder[];
  categories?: Category[];
  storeName: string;
};

function orderStatusLabel(
  status?: string
) {
  const normalized =
    String(
      status ||
        "pending"
    ).toLowerCase();

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
    case "trash":
      return "Trash";
    default:
      return normalized.replace(
        /[-_]+/g,
        " "
      );
  }
}

function orderStatusTone(
  status?: string
): StatusTone {
  const normalized =
    String(
      status ||
        ""
    ).toLowerCase();

  if (
    normalized ===
    "completed"
  ) {
    return "success";
  }

  if (
    normalized ===
    "processing"
  ) {
    return "info";
  }

  if (
    normalized ===
      "pending" ||
    normalized ===
      "on-hold"
  ) {
    return "warning";
  }

  if (
    normalized ===
      "cancelled" ||
    normalized ===
      "failed"
  ) {
    return "danger";
  }

  return "neutral";
}

function formatShortDate(
  dateGmt?: string
) {
  if (!dateGmt) {
    return "—";
  }

  const date =
    new Date(
      dateGmt.endsWith(
        "Z"
      )
        ? dateGmt
        : `${dateGmt}Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatMoney(
  value?: string
) {
  const amount =
    Number(value || 0);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return "₹0";
  }

  return `₹${new Intl.NumberFormat(
    "en-IN",
    {
      maximumFractionDigits:
        2,
    }
  ).format(amount)}`;
}

function paymentMethodLabel(
  order: WCOrder
) {
  const method =
    String(
      (
        order as any
      ).payment_method ||
        ""
    )
      .trim()
      .toLowerCase();

  const title =
    String(
      order.payment_method_title ||
        ""
    ).trim();

  const titleKey =
    title.toLowerCase();

  const isPayGlocal =
    method.includes(
      "payglocal"
    ) ||
    (
      titleKey.includes(
        "upi"
      ) &&
      (
        titleKey.includes(
          "debit"
        ) ||
        titleKey.includes(
          "credit"
        ) ||
        titleKey.includes(
          "netbanking"
        )
      )
    );

  if (isPayGlocal) {
    return "PayGlocal Payment Gateway";
  }

  return (
    title ||
    "Not specified"
  );
}

function normalizeWhatsAppPhone(
  value?: string
) {
  const original =
    String(
      value ||
        ""
    ).trim();
  let digits =
    original.replace(
      /\D/g,
      ""
    );

  if (
    digits.startsWith(
      "00"
    )
  ) {
    digits =
      digits.slice(2);
  }

  if (
    original.startsWith(
      "+"
    )
  ) {
    return digits.length >=
      10 &&
      digits.length <=
        15
      ? digits
      : "";
  }

  if (
    digits.length ===
      11 &&
    digits.startsWith(
      "0"
    )
  ) {
    digits =
      digits.slice(1);
  }

  if (
    digits.length ===
    10
  ) {
    digits =
      `91${digits}`;
  }

  return digits.length >=
    10 &&
    digits.length <=
      15
    ? digits
    : "";
}

function formatWhatsAppDate(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function buildWhatsAppStatusMessage(
  order: WCOrder,
  storeName: string
) {
  const status =
    String(
      order.status ||
        "pending"
    ).toLowerCase();
  const firstName =
    String(
      order.billing
        ?.first_name ||
        ""
    ).trim() ||
    "Customer";
  const orderNumber =
    order.number ||
    order.id;
  const businessName =
    String(
      storeName ||
        ""
    ).trim() ||
    "Your Store";
  const shipment =
    extractShipmentFromMeta(
      (
        order as any
      ).meta_data ||
        []
    );

  const itemLines =
    (
      order.line_items ||
      []
    ).map(
      (
        item: any
      ) => {
        const quantity =
          Number(
            item.quantity ||
              1
          );
        const name =
          String(
            item.name ||
              "Product"
          ).trim() ||
          "Product";

        return `- ${quantity} x ${name}`;
      }
    );

  let statusMessage:
    string;
  let followUpMessage:
    string;

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
      statusMessage =
        `Your order status is now ${status.replace(/-/g, " ")}.`;
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
    ...(itemLines.length
      ? itemLines
      : [
          "- Order item details unavailable",
        ]),
  ];

  const hasShipment =
    Boolean(
      shipment.courier ||
        shipment.awb ||
        shipment.status ||
        shipment.shippedDate
    );

  if (
    status ===
      "completed" &&
    hasShipment
  ) {
    lines.push(
      "",
      "Shipment details:"
    );

    if (
      shipment.courier
    ) {
      lines.push(
        `Courier: ${shipment.courier}`
      );
    }

    if (shipment.awb) {
      lines.push(
        `Tracking / AWB: ${shipment.awb}`
      );
    }

    if (
      shipment.status
    ) {
      lines.push(
        `Shipment status: ${shipment.status}`
      );
    }

    if (
      shipment.shippedDate
    ) {
      lines.push(
        `Shipped on: ${formatWhatsAppDate(
          shipment.shippedDate
        )}`
      );
    }
  }

  lines.push(
    "",
    `Total: Rs. ${order.total || "0"}`,
    `Payment method: ${paymentMethodLabel(order)}`,
    "",
    followUpMessage,
    "",
    "Regards,",
    `${businessName} Team`
  );

  return lines.join(
    "\n"
  );
}

function openWhatsAppStatusDraft(
  order: WCOrder,
  storeName: string
) {
  const phone =
    normalizeWhatsAppPhone(
      order.billing
        ?.phone
    );
  const feedbackId =
    `orders-whatsapp-${order.id}`;

  if (!phone) {
    actionFeedback.warning({
      id: feedbackId,
      title:
        "WhatsApp unavailable",
      message:
        "Customer WhatsApp number is missing or invalid.",
      durationMs: 3600,
    });
    return;
  }

  const message =
    buildWhatsAppStatusMessage(
      order,
      storeName
    );
  const url =
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  actionFeedback.info({
    id: feedbackId,
    title:
      "Opening WhatsApp",
    message:
      `Order #${order.number || order.id}`,
    durationMs: 1800,
  });

  const popup =
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );

  if (!popup) {
    window.location.href =
      url;
  }
}

function OrderActionSheet({
  order,
  storeName,
  onRequestTrash,
}: {
  order: WCOrder;
  storeName: string;
  onRequestTrash: (
    order: WCOrder
  ) => void;
}) {
  const [
    open,
    setOpen,
  ] =
    useState(false);
  const isTrash =
    String(
      order.status ||
        ""
    ).toLowerCase() ===
    "trash";
  const orderNumber =
    order.number ||
    order.id;
  const customerName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    "Customer";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Open actions for order ${orderNumber}`}
        onClick={() =>
          setOpen(true)
        }
        className="h-10 w-10"
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={
          setOpen
        }
        title={`Order #${orderNumber}`}
        description={`${customerName} · ${orderStatusLabel(order.status)}`}
        popupClassName="md:mx-auto md:max-w-md"
      >
        <div className="space-y-2">
          <Link
            href={`/orders/${order.id}`}
            onClick={() =>
              setOpen(
                false
              )
            }
            className={buttonClassName({
              variant:
                "outline",
              size: "lg",
              className:
                "w-full justify-start",
            })}
          >
            <Eye className="h-4 w-4" />
            View full order
          </Link>

          {!isTrash ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-start"
              onClick={() => {
                setOpen(
                  false
                );
                openWhatsAppStatusDraft(
                  order,
                  storeName
                );
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Notify status in WhatsApp
            </Button>
          ) : null}

          {!isTrash ? (
            <Button
              variant="danger"
              size="lg"
              className="w-full justify-start"
              onClick={() => {
                setOpen(
                  false
                );
                onRequestTrash(
                  order
                );
              }}
            >
              <Trash2 className="h-4 w-4" />
              Move to trash
            </Button>
          ) : null}
        </div>
      </BottomSheet>
    </>
  );
}

function OrderStatus({
  status,
  compact = false,
}: {
  status?: string;
  compact?: boolean;
}) {
  const normalized =
    String(
      status ||
        "pending"
    ).toLowerCase();

  return (
    <StatusBadge
      status={
        normalized
      }
      label={
        orderStatusLabel(
          normalized
        )
      }
      tone={
        orderStatusTone(
          normalized
        )
      }
      className={
        compact
          ? "min-h-5 whitespace-nowrap px-2 py-0.5 text-[9px]"
          : "whitespace-nowrap"
      }
    />
  );
}

export default function OrdersClient({
  orders,
  categories = [],
  storeName,
}: OrdersClientProps) {
  const router =
    useRouter();

  const [
    selected,
    setSelected,
  ] =
    useState<number[]>(
      []
    );
  const [
    action,
    setAction,
  ] =
    useState("");
  const [
    bulkBusy,
    setBulkBusy,
  ] =
    useState(false);
  const [
    packSlipBusy,
    setPackSlipBusy,
  ] =
    useState(false);
  const [
    bulkTrashOpen,
    setBulkTrashOpen,
  ] =
    useState(false);
  const [
    trashTarget,
    setTrashTarget,
  ] =
    useState<WCOrder | null>(
      null
    );
  const [
    trashBusy,
    setTrashBusy,
  ] =
    useState(false);
  const [
    previewImage,
    setPreviewImage,
  ] =
    useState<{
      src: string;
      alt: string;
    } | null>(null);

  const [
    rowsPerPage,
    setRowsPerPage,
  ] =
    useState(25);
  const [
    page,
    setPage,
  ] =
    useState(1);

  const pageCount =
    useMemo(
      () =>
        Math.max(
          1,
          Math.ceil(
            (
              orders.length ||
              0
            ) /
              rowsPerPage
          )
        ),
      [
        orders.length,
        rowsPerPage,
      ]
    );

  const currentPage =
    Math.min(
      page,
      pageCount
    );

  const paginatedOrders =
    useMemo(() => {
      const start =
        (currentPage -
          1) *
        rowsPerPage;

      return orders.slice(
        start,
        start +
          rowsPerPage
      );
    }, [
      orders,
      currentPage,
      rowsPerPage,
    ]);

  const pageIds =
    useMemo(
      () =>
        paginatedOrders
          .filter(
            (
              order
            ) =>
              String(
                order.status ||
                  ""
              ).toLowerCase() !==
              "cancelled"
          )
          .map(
            (
              order
            ) =>
              order.id
          ),
      [
        paginatedOrders,
      ]
    );

  const allPageSelected =
    pageIds.length >
      0 &&
    pageIds.every(
      (id) =>
        selected.includes(
          id
        )
    );

  useEffect(() => {
    setPage(1);
    setSelected([]);
    setAction("");
  }, [
    orders,
    rowsPerPage,
  ]);

  function toggleAll(
    checked: boolean
  ) {
    if (!checked) {
      setSelected(
        (
          current
        ) =>
          current.filter(
            (id) =>
              !pageIds.includes(
                id
              )
          )
      );
      return;
    }

    const next =
      Array.from(
        new Set([
          ...selected,
          ...pageIds,
        ])
      ).slice(
        0,
        50
      );

    if (
      selected.length +
        pageIds.filter(
          (id) =>
            !selected.includes(
              id
            )
        ).length >
      50
    ) {
      actionFeedback.warning({
        id:
          "orders-select-limit",
        title:
          "Selection limited to 50",
        message:
          "Bulk order updates support up to 50 orders at a time.",
        durationMs: 3600,
      });
    }

    setSelected(next);
  }

  function toggleOne(
    id: number,
    checked: boolean
  ) {
    if (!checked) {
      setSelected(
        (
          current
        ) =>
          current.filter(
            (
              item
            ) =>
              item !==
              id
          )
      );
      return;
    }

    if (
      selected.length >=
      50
    ) {
      actionFeedback.warning({
        id:
          "orders-select-limit",
        title:
          "Selection limited to 50",
        message:
          "Bulk order updates support up to 50 orders at a time.",
        durationMs: 3600,
      });
      return;
    }

    setSelected(
      (
        current
      ) =>
        current.includes(
          id
        )
          ? current
          : [
              ...current,
              id,
            ]
    );
  }

  async function performBulk(
    selectedAction =
      action
  ) {
    if (
      !selectedAction ||
      selected.length ===
        0 ||
      bulkBusy
    ) {
      return;
    }

    const body:
      Record<
        string,
        unknown
      > = {
      ids: selected,
      action: "",
    };

    if (
      selectedAction ===
      "trash"
    ) {
      body.action =
        "trash";
    } else if (
      selectedAction.startsWith(
        "status:"
      )
    ) {
      body.action =
        "status";
      body.status =
        selectedAction.split(
          ":"
        )[1];
    } else {
      return;
    }

    const feedbackId =
      "orders-bulk-update";

    setBulkBusy(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        selectedAction ===
        "trash"
          ? "Moving orders to trash…"
          : "Updating orders…",
      message:
        `${selected.length} selected`,
    });

    try {
      const response =
        await fetch(
          "/api/orders",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                body
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          typeof payload
            .error ===
          "string"
            ? payload.error
            : "Bulk order update failed."
        );
      }

      actionFeedback.success({
        id: feedbackId,
        title:
          selectedAction ===
          "trash"
            ? "Orders moved to trash"
            : "Orders updated",
        message:
          `${selected.length} order${selected.length === 1 ? "" : "s"} updated.`,
        durationMs: 2800,
      });

      setSelected([]);
      setAction("");
      setBulkTrashOpen(
        false
      );
      router.refresh();
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Order update failed",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setBulkBusy(false);
    }
  }

  function requestBulkAction() {
    if (
      !action ||
      selected.length ===
        0
    ) {
      return;
    }

    if (
      action ===
      "trash"
    ) {
      setBulkTrashOpen(
        true
      );
      return;
    }

    void performBulk(
      action
    );
  }

  async function downloadPackSlips() {
    if (
      selected.length ===
      0 ||
      packSlipBusy
    ) {
      return;
    }

    const feedbackId =
      "orders-pack-slips";

    setPackSlipBusy(
      true
    );
    actionFeedback.loading({
      id: feedbackId,
      title:
        "Preparing packing slips…",
      message:
        `${selected.length} selected order${selected.length === 1 ? "" : "s"}`,
    });

    try {
      const mod =
        await import(
          "./ui/PackingSlipPdfClient"
        );

      await mod.default.generateForOrders(
        selected,
        storeName
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Packing slips ready",
        message:
          "PDF download started.",
        durationMs: 2600,
      });
    } catch (
      error
    ) {
      console.error(
        error
      );

      actionFeedback.error({
        id: feedbackId,
        title:
          "Packing slip failed",
        message:
          "The PDF could not be generated. Please try again.",
        durationMs: 4200,
      });
    } finally {
      setPackSlipBusy(
        false
      );
    }
  }

  async function moveOneToTrash() {
    if (
      !trashTarget ||
      trashBusy
    ) {
      return;
    }

    const order =
      trashTarget;
    const feedbackId =
      `orders-trash-${order.id}`;

    setTrashBusy(true);
    actionFeedback.loading({
      id: feedbackId,
      title:
        "Moving order to trash…",
      message:
        `Order #${order.number || order.id}`,
    });

    try {
      const response =
        await fetch(
          "/api/orders",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ids: [
                  order.id,
                ],
                action:
                  "trash",
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          typeof payload
            .error ===
          "string"
            ? payload.error
            : "Failed to move order to trash."
        );
      }

      actionFeedback.success({
        id: feedbackId,
        title:
          "Order moved to trash",
        message:
          `Order #${order.number || order.id}`,
        durationMs: 2600,
      });

      setTrashTarget(
        null
      );
      router.refresh();
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not move order",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setTrashBusy(false);
    }
  }

  const total =
    orders.length;
  const startIndex =
    total === 0
      ? 0
      : (currentPage -
          1) *
          rowsPerPage +
        1;
  const endIndex =
    total === 0
      ? 0
      : Math.min(
          currentPage *
            rowsPerPage,
          total
        );

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading md:text-base">
              Order list
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {total} result
              {total === 1
                ? ""
                : "s"}
            </p>
          </div>

          <OrdersExportButton
            categories={
              categories
            }
          />
        </div>

        {selected.length >
        0 ? (
          <div className="border-b border-border bg-secondary/45 p-2.5 md:p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-extrabold text-heading">
                {
                  selected.length
                }{" "}
                selected
              </div>

              <Button
                variant="ghost"
                size="sm"
                disabled={
                  bulkBusy ||
                  packSlipBusy
                }
                onClick={() => {
                  setSelected(
                    []
                  );
                  setAction(
                    ""
                  );
                }}
              >
                Clear
              </Button>
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:flex-wrap md:items-center">
              <select
                value={
                  action
                }
                onChange={(
                  event
                ) =>
                  setAction(
                    event
                      .target
                      .value
                  )
                }
                disabled={
                  bulkBusy
                }
                className="ls-focus-ring h-11 min-w-0 rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground md:min-w-[220px]"
              >
                <option value="">
                  Choose action
                </option>
                <option value="status:processing">
                  Set Processing
                </option>
                <option value="status:completed">
                  Set Completed
                </option>
                <option value="status:on-hold">
                  Set On hold
                </option>
                <option value="status:cancelled">
                  Set Cancelled
                </option>
                <option value="trash">
                  Move to trash
                </option>
              </select>

              <AsyncButton
                loading={
                  bulkBusy
                }
                loadingLabel="Applying…"
                disabled={
                  !action
                }
                onClick={
                  requestBulkAction
                }
              >
                Apply
              </AsyncButton>

              <AsyncButton
                variant="outline"
                loading={
                  packSlipBusy
                }
                loadingLabel="Preparing…"
                onClick={
                  downloadPackSlips
                }
                className="col-span-2 md:col-span-1"
              >
                <FileDown className="h-4 w-4" />
                Packing slips
              </AsyncButton>
            </div>
          </div>
        ) : null}

        <div className="p-2.5 md:p-3 lg:hidden">
          {paginatedOrders.length >
          0 ? (
            <div className="grid gap-2.5 md:grid-cols-2">
              {paginatedOrders.map(
                (
                  order
                ) => {
                  const first =
                    order.line_items?.[0];
                  const image =
                    first?.image
                      ?.src ||
                    "";
                  const customerName =
                    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                    "Customer";
                  const shipment =
                    extractShipmentFromMeta(
                      (
                        order as any
                      ).meta_data ||
                        []
                    );
                  const hasShipment =
                    Boolean(
                      shipment.awb ||
                        shipment.courier
                    );
                  const extraItemCount =
                    Math.max(
                      0,
                      (
                        order.line_items
                          ?.length ||
                        0
                      ) - 1
                    );
                  const isUpi =
                    String(
                      (
                        order as any
                      ).payment_method ||
                        ""
                    ) ===
                    "letz_upi";
                  const cardStatus =
                    String(
                      order.status ||
                        ""
                    ).toLowerCase();
                  const isCancelled =
                    cardStatus ===
                    "cancelled";
                  const isProcessing =
                    cardStatus ===
                    "processing";
                  const isCompleted =
                    cardStatus ===
                    "completed";

                  return (
                    <article
                      key={
                        order.id
                      }
                      className={[
                        "overflow-hidden rounded-xl border transition",
                        isCancelled
                          ? "border-slate-300 bg-slate-100/80"
                          : isProcessing
                            ? "border-blue-200 bg-blue-50/55"
                            : isCompleted
                              ? "border-emerald-200 bg-emerald-50/55"
                              : "border-border bg-card",
                        selected.includes(
                          order.id
                        )
                          ? "ring-2 ring-primary/10"
                          : "",
                      ].join(
                        " "
                      )}
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            aria-label={
                              isCancelled
                                ? `Cancelled order ${order.number || order.id} cannot be selected for processing`
                                : `Select order ${order.number || order.id}`
                            }
                            checked={
                              selected.includes(
                                order.id
                              )
                            }
                            disabled={
                              isCancelled
                            }
                            onChange={(
                              event
                            ) =>
                              toggleOne(
                                order.id,
                                event
                                  .currentTarget
                                  .checked
                              )
                            }
                            className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-35"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <Link
                                href={`/orders/${order.id}`}
                                className="text-xs font-extrabold text-primary hover:underline"
                              >
                                #
                                {order.number ||
                                  order.id}
                              </Link>

                              <OrderStatus
                                status={
                                  order.status
                                }
                                compact
                              />
                            </div>

                            <div className="mt-1 truncate text-sm font-extrabold text-heading">
                              {
                                customerName
                              }
                            </div>

                            {isCancelled ? (
                              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                                Do not process
                              </div>
                            ) : isProcessing ? (
                              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                Ready to fulfil
                              </div>
                            ) : isCompleted ? (
                              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                Fulfilment completed
                              </div>
                            ) : null}
                          </div>

                          <div className="shrink-0 text-right">
                            <div className="text-sm font-extrabold text-heading">
                              {formatMoney(
                                order.total
                              )}
                            </div>
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              {formatShortDate(
                                order.date_created_gmt
                              )}
                            </div>
                          </div>

                          <OrderActionSheet
                            order={
                              order
                            }
                            storeName={
                              storeName
                            }
                            onRequestTrash={
                              setTrashTarget
                            }
                          />
                        </div>

                        {isCancelled ? (
                          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-100/80 px-3 py-2 text-xs font-extrabold text-rose-800">
                            <X className="h-4 w-4 shrink-0" />
                            <span>
                              Cancelled order — do not process or dispatch.
                            </span>
                          </div>
                        ) : null}

                        <div className="mt-3 flex gap-3">
                          {image ? (
                            <button
                              type="button"
                              aria-label={`Preview ${first?.name || "ordered product"}`}
                              onClick={() =>
                                setPreviewImage({
                                  src: image,
                                  alt:
                                    first?.name ||
                                    `Order ${order.number || order.id} product`,
                                })
                              }
                              className="ls-focus-ring h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted"
                            >
                              <img
                                src={
                                  image
                                }
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground">
                              <Package2 className="h-5 w-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 text-sm font-bold leading-5 text-foreground">
                              {first
                                ? `${Number((first as any).quantity || 1)} × ${first.name}`
                                : "No product"}
                            </div>

                            {first?.sku ? (
                              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                                SKU{" "}
                                {
                                  first.sku
                                }
                              </div>
                            ) : null}

                            {extraItemCount >
                            0 ? (
                              <div className="mt-1 text-[11px] font-bold text-primary">
                                +
                                {
                                  extraItemCount
                                }{" "}
                                more item
                                {extraItemCount ===
                                1
                                  ? ""
                                  : "s"}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface-soft text-xs">
                          <div className="min-w-0 p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              Payment
                            </div>
                            <div className="mt-1 truncate font-bold text-foreground">
                              {paymentMethodLabel(
                                order
                              )}
                            </div>
                          </div>

                          <div className="min-w-0 border-l border-border p-2.5">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              Shipment
                            </div>
                            <div
                              className={[
                                "mt-1 truncate font-bold",
                                hasShipment
                                  ? "text-foreground"
                                  : "text-amber-700",
                              ].join(
                                " "
                              )}
                            >
                              {hasShipment
                                ? shipment.courier ||
                                  "Added"
                                : "Not set"}
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/orders/${order.id}`}
                          className={buttonClassName({
                            variant:
                              "outline",
                            size: "md",
                            className:
                              "mt-3 w-full",
                          })}
                        >
                          <Eye className="h-4 w-4" />
                          View order
                        </Link>
                      </div>

                      {isUpi ? (
                        <div className="border-t border-border bg-surface-soft px-3 py-2.5">
                          <UPIVerificationInline
                            order={
                              order as any
                            }
                          />
                        </div>
                      ) : null}
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <EmptyState
              icon={Package2}
              title="No orders found"
              description="Try another status, search term or date range."
            />
          )}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select visible orders"
                    checked={
                      allPageSelected
                    }
                    onChange={(
                      event
                    ) =>
                      toggleAll(
                        event
                          .currentTarget
                          .checked
                      )
                    }
                  />
                </th>
                <th className="px-4 py-3">
                  Order
                </th>
                <th className="px-4 py-3">
                  Product
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Payment
                </th>
                <th className="px-4 py-3">
                  Shipment
                </th>
                <th className="px-4 py-3">
                  Total
                </th>
                <th className="w-16 px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedOrders.map(
                (
                  order
                ) => {
                  const first =
                    order.line_items?.[0];
                  const shipment =
                    extractShipmentFromMeta(
                      (
                        order as any
                      ).meta_data ||
                        []
                    );
                  const hasShipment =
                    Boolean(
                      shipment.awb ||
                        shipment.courier
                    );
                  const customerName =
                    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                    "Customer";
                  const isCancelled =
                    String(
                      order.status ||
                        ""
                    ).toLowerCase() ===
                    "cancelled";

                  return (
                    <tr
                      key={
                        order.id
                      }
                      className={[
                        "border-b align-top transition last:border-b-0",
                        isCancelled
                          ? "border-rose-200 bg-rose-50/45 hover:bg-rose-50/70"
                          : "border-border/70 hover:bg-muted/45",
                      ].join(" ")}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          aria-label={
                            isCancelled
                              ? `Cancelled order ${order.number || order.id} cannot be selected for processing`
                              : `Select order ${order.number || order.id}`
                          }
                          checked={
                            selected.includes(
                              order.id
                            )
                          }
                          disabled={
                            isCancelled
                          }
                          onChange={(
                            event
                          ) =>
                            toggleOne(
                              order.id,
                              event
                                .currentTarget
                                .checked
                            )
                          }
                          className="disabled:cursor-not-allowed disabled:opacity-35"
                        />
                      </td>

                      <td className="px-4 py-4">
                        <Link
                          href={`/orders/${order.id}`}
                          className="font-extrabold text-primary hover:underline"
                        >
                          #
                          {order.number ||
                            order.id}
                        </Link>
                        <div className="mt-1 max-w-48 truncate font-bold text-heading">
                          {
                            customerName
                          }
                        </div>
                        {order.billing
                          ?.phone ? (
                          <a
                            href={`tel:${order.billing.phone}`}
                            className="mt-0.5 block text-xs text-muted-foreground hover:text-heading"
                          >
                            {
                              order.billing
                                .phone
                            }
                          </a>
                        ) : null}
                      </td>

                      <td className="max-w-56 px-4 py-4">
                        <div className="line-clamp-2 font-semibold text-foreground">
                          {first?.name ||
                            "—"}
                        </div>
                        {first?.sku ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            SKU{" "}
                            {
                              first.sku
                            }
                          </div>
                        ) : null}
                        {(order.line_items
                          ?.length ||
                          0) >
                        1 ? (
                          <div className="mt-1 text-xs font-bold text-primary">
                            +
                            {(order.line_items
                              ?.length ||
                              0) -
                              1}{" "}
                            more
                          </div>
                        ) : null}
                      </td>

                      <td className="px-4 py-4">
                        <OrderStatus
                          status={
                            order.status
                          }
                        />

                        {isCancelled ? (
                          <div className="mt-1.5 text-[11px] font-bold text-rose-700">
                            Do not process
                          </div>
                        ) : null}
                      </td>

                      <td className="max-w-48 px-4 py-4">
                        <div className="text-sm font-semibold text-foreground">
                          {paymentMethodLabel(
                            order
                          )}
                        </div>
                        <UPIVerificationInline
                          order={
                            order as any
                          }
                        />
                      </td>

                      <td className="max-w-44 px-4 py-4">
                        {hasShipment ? (
                          <div className="text-xs">
                            <div className="font-bold text-foreground">
                              {shipment.courier ||
                                "Shipment added"}
                            </div>
                            {shipment.awb ? (
                              <div className="mt-1 break-all text-muted-foreground">
                                {
                                  shipment.awb
                                }
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            Not set
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="font-extrabold text-heading">
                          {formatMoney(
                            order.total
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatShortDate(
                            order.date_created_gmt
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <OrderActionSheet
                          order={
                            order
                          }
                          storeName={
                            storeName
                          }
                          onRequestTrash={
                            setTrashTarget
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )}

              {paginatedOrders.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      8
                    }
                  >
                    <EmptyState
                      icon={
                        Package2
                      }
                      title="No orders found"
                      description="Try another status, search term or date range."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {orders.length >
        0 ? (
          <div className="border-t border-border px-3 py-3 md:px-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground sm:justify-start">
                <span>
                  <strong className="text-foreground">
                    {
                      startIndex
                    }
                    –
                    {
                      endIndex
                    }
                  </strong>{" "}
                  of{" "}
                  {
                    total
                  }
                </span>

                <label className="flex items-center gap-2">
                  <span>
                    Rows
                  </span>
                  <select
                    value={
                      rowsPerPage
                    }
                    onChange={(
                      event
                    ) =>
                      setRowsPerPage(
                        Number(
                          event
                            .target
                            .value
                        ) ||
                          25
                      )
                    }
                    className="ls-focus-ring h-9 rounded-xl border border-input bg-card px-2 text-xs font-bold text-foreground"
                  >
                    <option value={10}>
                      10
                    </option>
                    <option value={25}>
                      25
                    </option>
                    <option value={50}>
                      50
                    </option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2 sm:flex">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous page"
                  disabled={
                    currentPage <=
                    1
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          1,
                          current -
                            1
                        )
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex min-h-11 items-center justify-center rounded-xl bg-muted px-3 text-xs font-bold text-foreground sm:min-w-28">
                  Page{" "}
                  {
                    currentPage
                  }{" "}
                  of{" "}
                  {
                    pageCount
                  }
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next page"
                  disabled={
                    currentPage >=
                    pageCount
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          pageCount,
                          current +
                            1
                        )
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmDialog
        open={
          bulkTrashOpen
        }
        onOpenChange={
          setBulkTrashOpen
        }
        title="Move selected orders to trash?"
        description={`${selected.length} selected order${selected.length === 1 ? "" : "s"} will be removed from the active order list.`}
        confirmLabel="Move to trash"
        loading={
          bulkBusy
        }
        loadingLabel="Moving…"
        destructive
        onConfirm={() =>
          performBulk(
            "trash"
          )
        }
      />

      <ConfirmDialog
        open={Boolean(
          trashTarget
        )}
        onOpenChange={(
          nextOpen
        ) => {
          if (
            !nextOpen &&
            !trashBusy
          ) {
            setTrashTarget(
              null
            );
          }
        }}
        title="Move order to trash?"
        description={
          trashTarget
            ? `Order #${trashTarget.number || trashTarget.id} will be removed from the active order list.`
            : undefined
        }
        confirmLabel="Move to trash"
        loading={
          trashBusy
        }
        loadingLabel="Moving…"
        destructive
        onConfirm={
          moveOneToTrash
        }
      />

      {previewImage ? (
        <div
          className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() =>
            setPreviewImage(
              null
            )
          }
        >
          <div
            className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
            onClick={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <Button
              variant="outline"
              size="icon"
              aria-label="Close image preview"
              onClick={() =>
                setPreviewImage(
                  null
                )
              }
              className="absolute right-3 top-3 z-10 rounded-full bg-card/95"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-muted p-3">
              <img
                src={
                  previewImage.src
                }
                alt={
                  previewImage.alt
                }
                className="max-h-[76dvh] w-auto max-w-full rounded-xl object-contain"
              />
            </div>

            <div className="border-t border-border bg-card px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
              {
                previewImage.alt
              }
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
