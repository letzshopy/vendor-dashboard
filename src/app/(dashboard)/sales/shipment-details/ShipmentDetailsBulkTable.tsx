"use client";

import {
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  ExternalLink,
  Package2,
  Pencil,
  Truck,
} from "lucide-react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  Input,
} from "@/components/ui/input";
import {
  StatusBadge,
} from "@/components/ui/status-badge";
import {
  actionFeedback,
} from "@/lib/actionFeedback";
import type {
  WCOrder,
} from "@/lib/order-utils";
import {
  extractShipmentFromMeta,
} from "@/lib/shipment-meta";

type Row = {
  id: number;
  number: string;
  customerName: string;
  status: string;
  courier: string;
  awb: string;
  trackingUrl: string;
};

type ShipmentDraft = {
  courier: string;
  awb: string;
  trackingUrl: string;
};

function buildRows(
  orders: WCOrder[]
): Row[] {
  return (
    orders || []
  )
    .filter(
      (order) =>
        String(
          order.status ||
            ""
        ).toLowerCase() ===
        "processing"
    )
    .map((order) => {
      const billingName =
        [
          order.billing
            ?.first_name,
          order.billing
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ");

      const shippingName =
        [
          order.shipping
            ?.first_name,
          order.shipping
            ?.last_name,
        ]
          .filter(Boolean)
          .join(" ");

      const shipment =
        extractShipmentFromMeta(
          (order as any)
            .meta_data ||
            []
        );

      return {
        id: order.id,
        number:
          order.number?.toString() ??
          String(
            order.id
          ),
        customerName:
          billingName ||
          shippingName ||
          "Customer",
        status:
          String(
            order.status ||
              ""
          ),
        courier:
          shipment.courier ||
          "",
        awb:
          shipment.awb ||
          "",
        trackingUrl:
          shipment.trackingUrl ||
          "",
      };
    });
}

function draftFor(
  row: Row
): ShipmentDraft {
  return {
    courier:
      row.courier,
    awb: row.awb,
    trackingUrl:
      row.trackingUrl,
  };
}

export default function ShipmentDetailsBulkTable({
  initialOrders,
}: {
  initialOrders:
    WCOrder[];
}) {
  const initialRows =
    useMemo(
      () =>
        buildRows(
          initialOrders
        ),
      [initialOrders]
    );

  const [
    rows,
    setRows,
  ] =
    useState<Row[]>(
      initialRows
    );

  const [
    activeId,
    setActiveId,
  ] =
    useState<
      number | null
    >(null);

  const [
    draft,
    setDraft,
  ] =
    useState<ShipmentDraft>({
      courier: "",
      awb: "",
      trackingUrl: "",
    });

  const [
    baseline,
    setBaseline,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    closeConfirmOpen,
    setCloseConfirmOpen,
  ] =
    useState(false);

  const activeRow =
    useMemo(
      () =>
        rows.find(
          (row) =>
            row.id ===
            activeId
        ) || null,
      [
        rows,
        activeId,
      ]
    );

  const currentSnapshot =
    JSON.stringify(
      draft
    );

  const dirty =
    Boolean(
      activeRow &&
        baseline
    ) &&
    currentSnapshot !==
      baseline;

  function openEditor(
    row: Row
  ) {
    const next =
      draftFor(row);

    setActiveId(
      row.id
    );
    setDraft(next);
    setBaseline(
      JSON.stringify(
        next
      )
    );
  }

  function closeEditor() {
    setActiveId(
      null
    );
    setBaseline("");
    setDraft({
      courier: "",
      awb: "",
      trackingUrl: "",
    });
  }

  function requestClose() {
    if (dirty) {
      setCloseConfirmOpen(
        true
      );
      return;
    }

    closeEditor();
  }

  async function saveActive():
    Promise<boolean> {
    if (
      !activeRow ||
      saving
    ) {
      return false;
    }

    const courier =
      draft.courier.trim();

    const awb =
      draft.awb.trim();

    const trackingUrl =
      draft.trackingUrl.trim();

    if (!courier) {
      actionFeedback.warning({
        id:
          "shipment-validation",
        title:
          "Enter courier name",
        durationMs: 2800,
      });
      return false;
    }

    if (!awb) {
      actionFeedback.warning({
        id:
          "shipment-validation",
        title:
          "Enter tracking number",
        durationMs: 2800,
      });
      return false;
    }

    if (trackingUrl) {
      try {
        const url =
          new URL(
            trackingUrl
          );

        if (
          url.protocol !==
            "http:" &&
          url.protocol !==
            "https:"
        ) {
          throw new Error();
        }
      } catch {
        actionFeedback.warning({
          id:
            "shipment-validation",
          title:
            "Enter a valid tracking link",
          durationMs: 3000,
        });
        return false;
      }
    }

    const feedbackId =
      `shipment-save-${activeRow.id}`;

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        `Saving shipment #${activeRow.number}…`,
    });

    try {
      const response =
        await fetch(
          "/api/orders/shipments",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                updates: [
                  {
                    orderId:
                      activeRow.id,
                    courier,
                    awb,
                    trackingUrl,
                  },
                ],
              }),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            "Failed to save shipment"
        );
      }

      setRows(
        (current) =>
          current.filter(
            (row) =>
              row.id !==
              activeRow.id
          )
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Shipment saved",
        message:
          `Order #${activeRow.number} marked completed.`,
        durationMs: 2600,
      });

      closeEditor();
      setCloseConfirmOpen(
        false
      );

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save shipment",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  useUnsavedChanges({
    id:
      "sales-shipment-editor",
    dirty,
    label:
      "shipment details",
    save:
      saveActive,
  });

  if (
    rows.length === 0
  ) {
    return (
      <section className="rounded-xl border border-border bg-card md:rounded-2xl">
        <EmptyState
          icon={Package2}
          title="No orders ready to ship"
          description="Processing orders will appear here when courier details can be added."
        />
      </section>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-3 md:px-4">
          <div>
            <h2 className="text-sm font-extrabold text-heading md:text-base">
              Ready to ship
            </h2>
            <p className="mt-0.5 hidden text-xs text-muted-foreground md:block">
              Add courier and tracking details. Saving marks the order completed.
            </p>
          </div>

          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">
            {rows.length} orders
          </span>
        </div>

        <div className="divide-y divide-border md:hidden">
          {rows.map(
            (row) => (
              <article
                key={
                  row.id
                }
                className="p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${row.id}`}
                      className="text-sm font-extrabold text-primary"
                    >
                      #
                      {
                        row.number
                      }
                    </Link>

                    <div className="mt-0.5 truncate text-sm font-semibold text-heading">
                      {
                        row.customerName
                      }
                    </div>

                    <div className="mt-1">
                      <StatusBadge
                        status="processing"
                        label="Processing"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={
                      row.awb ||
                      row.courier
                        ? "secondary"
                        : "primary"
                    }
                    onClick={() =>
                      openEditor(
                        row
                      )
                    }
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {row.awb ||
                    row.courier
                      ? "Edit"
                      : "Add details"}
                  </Button>
                </div>

                {row.awb ||
                row.courier ? (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-surface-soft px-3 py-2 text-xs text-muted-foreground">
                    {row.courier ? (
                      <span>
                        {
                          row.courier
                        }
                      </span>
                    ) : null}

                    {row.awb ? (
                      <span className="font-mono">
                        {
                          row.awb
                        }
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-soft text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">
                  Order
                </th>
                <th className="px-4 py-3">
                  Customer
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Courier
                </th>
                <th className="px-4 py-3">
                  Tracking
                </th>
                <th className="px-4 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row) => (
                  <tr
                    key={
                      row.id
                    }
                    className="border-b border-border last:border-b-0 hover:bg-muted/40"
                  >
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/orders/${row.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        #
                        {
                          row.number
                        }
                      </Link>
                    </td>

                    <td className="px-4 py-3.5 font-semibold text-heading">
                      {
                        row.customerName
                      }
                    </td>

                    <td className="px-4 py-3.5">
                      <StatusBadge
                        status="processing"
                        label="Processing"
                      />
                    </td>

                    <td className="px-4 py-3.5 text-foreground">
                      {row.courier ||
                        "—"}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="max-w-[220px] truncate font-mono text-xs text-muted-foreground">
                        {row.awb ||
                          "—"}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openEditor(
                            row
                          )
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        {row.awb ||
                        row.courier
                          ? "Edit"
                          : "Add details"}
                      </Button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BottomSheet
        open={
          Boolean(
            activeRow
          )
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            requestClose();
          }
        }}
        title={
          activeRow
            ? `Shipment #${activeRow.number}`
            : "Shipment details"
        }
        description={
          activeRow
            ? activeRow.customerName
            : undefined
        }
        popupClassName="md:mx-auto md:max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-heading">
              Courier name
              <span className="ml-1 text-destructive">
                *
              </span>
            </label>
            <Input
              value={
                draft.courier
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    courier:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="Delhivery / DTDC / India Post"
              disabled={
                saving
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-heading">
              Tracking number
              <span className="ml-1 text-destructive">
                *
              </span>
            </label>
            <Input
              value={
                draft.awb
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    awb:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="AWB / tracking number"
              disabled={
                saving
              }
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-heading">
              Tracking link
            </label>
            <Input
              type="url"
              value={
                draft.trackingUrl
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (
                    current
                  ) => ({
                    ...current,
                    trackingUrl:
                      event.target
                        .value,
                  })
                )
              }
              placeholder="https://courier.example/track/..."
              disabled={
                saving
              }
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Optional. Add the courier tracking page when available.
            </p>
          </div>

          {draft.trackingUrl ? (
            <a
              href={
                draft.trackingUrl
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground"
            >
              Check tracking link
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}

          <div className="rounded-xl bg-surface-soft px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            Saving these details records the shipment, marks this order completed, and triggers the normal WooCommerce completed-order flow.
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <Button
              variant="outline"
              onClick={
                requestClose
              }
              disabled={
                saving
              }
            >
              Cancel
            </Button>

            <AsyncButton
              loading={
                saving
              }
              loadingLabel="Saving…"
              onClick={() =>
                void saveActive()
              }
            >
              <Truck className="h-4 w-4" />
              Save & Mark Completed
            </AsyncButton>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={
          closeConfirmOpen
        }
        onOpenChange={
          setCloseConfirmOpen
        }
        title="Unsaved shipment details"
        description="Save the shipment details before closing?"
        confirmLabel="Save changes"
        cancelLabel="Cancel"
        loading={
          saving
        }
        loadingLabel="Saving…"
        onConfirm={() => {
          void saveActive();
        }}
      />
    </>
  );
}
