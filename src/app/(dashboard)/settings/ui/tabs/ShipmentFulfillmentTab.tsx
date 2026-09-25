"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MapPin,
  PackageCheck,
  Printer,
  Truck,
} from "lucide-react";

import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type Mode =
  | "shift"
  | "self";

type ShipmentFulfillmentSettings = {
  mode: Mode;
  pickup: {
    name: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    postcode: string;
  };
};

type GeneralProducts =
  Record<string, unknown> & {
    packslipReturnAddress?: string;
    packslipShowReturn?: boolean;
  };

const emptySettings:
  ShipmentFulfillmentSettings = {
  mode: "self",
  pickup: {
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    postcode: "",
  },
};

const textareaClass =
  "ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground";

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-heading">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ShipmentFulfillmentTab({
  enablePackingSlipSettings = true,
}: {
  enablePackingSlipSettings?: boolean;
}) {
  const [
    data,
    setData,
  ] =
    useState<ShipmentFulfillmentSettings>(
      emptySettings
    );

  const [
    packingSlipShowReturn,
    setPackingSlipShowReturn,
  ] =
    useState(false);

  const [
    packingSlipReturnAddress,
    setPackingSlipReturnAddress,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const snapshotRef =
    useRef("");

  const generalProductsRef =
    useRef<GeneralProducts | null>(
      null
    );

  function buildSnapshot(
    fulfillment:
      ShipmentFulfillmentSettings,
    showReturn =
      packingSlipShowReturn,
    returnAddress =
      packingSlipReturnAddress
  ) {
    return JSON.stringify({
      fulfillment,
      packingSlip:
        enablePackingSlipSettings
          ? {
              showReturn,
              returnAddress,
            }
          : null,
    });
  }

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const fulfillmentResponse =
          await fetch(
            "/api/settings/shipment-fulfillment",
            {
              cache:
                "no-store",
            }
          );

        if (
          !fulfillmentResponse.ok
        ) {
          throw new Error(
            "Failed to load delivery setup"
          );
        }

        const fulfillmentJson =
          (
            await fulfillmentResponse.json()
          ) as ShipmentFulfillmentSettings;

        const merged:
          ShipmentFulfillmentSettings = {
          ...emptySettings,
          ...fulfillmentJson,
          pickup: {
            ...emptySettings.pickup,
            ...(
              fulfillmentJson?.pickup ||
              {}
            ),
          },
        };

        let nextShowReturn =
          false;

        let nextReturnAddress =
          "";

        if (
          enablePackingSlipSettings
        ) {
          const generalResponse =
            await fetch(
              "/api/settings/general",
              {
                cache:
                  "no-store",
              }
            );

          if (
            !generalResponse.ok
          ) {
            throw new Error(
              "Failed to load packing slip sender settings"
            );
          }

          const generalJson =
            await generalResponse.json();

          const products =
            (
              generalJson?.products ||
              {}
            ) as GeneralProducts;

          generalProductsRef.current =
            products;

          nextShowReturn =
            Boolean(
              products.packslipShowReturn
            );

          nextReturnAddress =
            String(
              products.packslipReturnAddress ||
                ""
            );
        }

        if (!cancelled) {
          setData(merged);

          setPackingSlipShowReturn(
            nextShowReturn
          );

          setPackingSlipReturnAddress(
            nextReturnAddress
          );

          snapshotRef.current =
            buildSnapshot(
              merged,
              nextShowReturn,
              nextReturnAddress
            );
        }
      } catch (
        error: unknown
      ) {
        if (!cancelled) {
          const message =
            error instanceof
              Error
              ? error.message
              : "Could not load delivery setup.";

          setError(
            message
          );

          actionFeedback.error({
            id:
              "delivery-setup-load",
            title:
              "Could not load delivery setup",
            message,
            durationMs: 4200,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(
            false
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    enablePackingSlipSettings,
  ]);

  const currentSnapshot =
    useMemo(
      () =>
        buildSnapshot(
          data
        ),
      [
        data,
        packingSlipShowReturn,
        packingSlipReturnAddress,
        enablePackingSlipSettings,
      ]
    );

  const isDirty =
    Boolean(
      snapshotRef.current
    ) &&
    currentSnapshot !==
      snapshotRef.current;

  function onChangePickup(
    field:
      keyof ShipmentFulfillmentSettings["pickup"],
    value: string
  ) {
    setData(
      (current) => ({
        ...current,
        pickup: {
          ...current.pickup,
          [field]: value,
        },
      })
    );
  }

  async function save():
    Promise<boolean> {
    if (
      saving ||
      loading
    ) {
      return false;
    }

    const feedbackId =
      "delivery-setup-save";

    setSaving(true);
    setError(null);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving delivery setup…",
    });

    try {
      const response =
        await fetch(
          "/api/settings/shipment-fulfillment",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                data
              ),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Failed to save delivery setup"
        );
      }

      const json =
        (
          await response.json()
        ) as ShipmentFulfillmentSettings;

      const merged:
        ShipmentFulfillmentSettings = {
        ...emptySettings,
        ...json,
        pickup: {
          ...emptySettings.pickup,
          ...(
            json?.pickup ||
            {}
          ),
        },
      };

      if (
        enablePackingSlipSettings
      ) {
        const currentProducts =
          generalProductsRef.current;

        if (!currentProducts) {
          throw new Error(
            "Packing slip settings are not available. Refresh and try again."
          );
        }

        const products:
          GeneralProducts = {
          ...currentProducts,
          packslipShowReturn:
            packingSlipShowReturn,
          packslipReturnAddress:
            packingSlipReturnAddress,
        };

        const generalResponse =
          await fetch(
            "/api/settings/general",
            {
              method:
                "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  products,
                  sync: true,
                }),
            }
          );

        const generalText =
          await generalResponse
            .text()
            .catch(
              () => ""
            );

        const generalJson =
          generalText
            ? JSON.parse(
                generalText
              )
            : {};

        if (
          !generalResponse.ok
        ) {
          throw new Error(
            typeof generalJson?.message ===
              "string"
              ? generalJson.message
              : "Failed to save packing slip sender settings"
          );
        }

        generalProductsRef.current =
          {
            ...products,
            ...(
              generalJson?.products ||
              {}
            ),
          };
      }

      setData(merged);

      snapshotRef.current =
        buildSnapshot(
          merged
        );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Delivery setup saved",
        durationMs: 2200,
      });

      return true;
    } catch (
      error: unknown
    ) {
      const message =
        error instanceof
          Error
          ? error.message
          : "Could not save delivery setup.";

      setError(message);

      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save delivery setup",
        message,
        durationMs: 4200,
      });

      return false;
    } finally {
      setSaving(false);
    }
  }

  useUnsavedChanges({
    id:
      "settings-delivery-setup",
    dirty: isDirty,
    label:
      "delivery setup changes",
    save,
  });

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-start gap-3 border-b border-border px-3 py-3 md:px-5 md:py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
            <Truck className="h-4.5 w-4.5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading">
              Delivery method
            </h2>

            <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
              Choose how orders are dispatched after packing.
            </p>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-2 md:p-5">
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              setData(
                (
                  current
                ) => ({
                  ...current,
                  mode: "shift",
                })
              )
            }
            className={[
              "ls-focus-ring min-h-[78px] rounded-xl border p-3 text-left transition md:min-h-[112px] md:rounded-2xl md:p-4",
              data.mode ===
              "shift"
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:bg-muted",
            ].join(
              " "
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-card text-primary shadow-sm">
                <Truck className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <div className="text-sm font-extrabold text-heading">
                  Shift Logistics
                </div>

                <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">
                  Use LetzShopy shipment booking with your saved pickup address.
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              setData(
                (
                  current
                ) => ({
                  ...current,
                  mode: "self",
                })
              )
            }
            className={[
              "ls-focus-ring min-h-[78px] rounded-xl border p-3 text-left transition md:min-h-[112px] md:rounded-2xl md:p-4",
              data.mode ===
              "self"
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:bg-muted",
            ].join(
              " "
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-card text-primary shadow-sm">
                <PackageCheck className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <div className="text-sm font-extrabold text-heading">
                  Self Shipping
                </div>

                <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">
                  Use your own courier and enter tracking details after dispatch.
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {data.mode ===
      "shift" ? (
        <section className="rounded-2xl border border-border bg-card">
          <div className="flex items-start gap-3 border-b border-border px-3 py-3 md:px-5 md:py-3.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
              <MapPin className="h-4.5 w-4.5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-heading">
                Pickup address
              </h2>

              <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
                Default pickup details used when booking courier shipments.
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-3 sm:grid-cols-2 md:p-5">
            <Field label="Pickup contact">
              <Input
                value={
                  data.pickup
                    .name
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  onChangePickup(
                    "name",
                    event.target
                      .value
                  )
                }
                placeholder="Contact name"
              />
            </Field>

            <Field label="Pickup phone">
              <Input
                value={
                  data.pickup
                    .phone
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  onChangePickup(
                    "phone",
                    event.target
                      .value
                  )
                }
                inputMode="tel"
                placeholder="10-digit mobile number"
              />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Address line 1">
                <Input
                  value={
                    data.pickup
                      .address1
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    onChangePickup(
                      "address1",
                      event.target
                        .value
                    )
                  }
                  placeholder="Door no, building, street"
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Address line 2">
                <Input
                  value={
                    data.pickup
                      .address2
                  }
                  disabled={
                    saving
                  }
                  onChange={(
                    event
                  ) =>
                    onChangePickup(
                      "address2",
                      event.target
                        .value
                    )
                  }
                  placeholder="Area, landmark"
                />
              </Field>
            </div>

            <Field label="City">
              <Input
                value={
                  data.pickup
                    .city
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  onChangePickup(
                    "city",
                    event.target
                      .value
                  )
                }
              />
            </Field>

            <Field label="State">
              <Input
                value={
                  data.pickup
                    .state
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  onChangePickup(
                    "state",
                    event.target
                      .value
                  )
                }
              />
            </Field>

            <Field label="Pincode">
              <Input
                value={
                  data.pickup
                    .postcode
                }
                disabled={
                  saving
                }
                onChange={(
                  event
                ) =>
                  onChangePickup(
                    "postcode",
                    event.target
                      .value
                  )
                }
                inputMode="numeric"
                placeholder="6-digit pincode"
              />
            </Field>
          </div>
        </section>
      ) : (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-3 md:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
                <PackageCheck className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <h2 className="text-sm font-extrabold text-heading">
                  Self-shipping workflow
                </h2>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Pack and dispatch with your preferred courier. After dispatch, open Sales → Shipment Details and enter the courier name and tracking number.
                </p>
              </div>
            </div>
          </section>

          {enablePackingSlipSettings ? (
            <section className="rounded-2xl border border-border bg-card">
              <div className="flex items-start gap-3 border-b border-border px-3 py-3 md:px-5 md:py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg md:h-10 md:w-10 md:rounded-xl bg-secondary text-secondary-foreground">
                  <Printer className="h-4.5 w-4.5" />
                </span>

                <div className="min-w-0">
                  <h2 className="text-sm font-extrabold text-heading">
                    Packing slip sender address
                  </h2>

                  <p className="mt-0.5 hidden text-xs leading-5 text-muted-foreground md:block">
                    Choose the From / Return address printed on packing slips for self-shipped orders.
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-3 md:p-5">
                <div className="grid gap-3 lg:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPackingSlipShowReturn(
                        false
                      )
                    }
                    className={[
                      "ls-focus-ring min-h-[92px] rounded-2xl border p-4 text-left transition",
                      !packingSlipShowReturn
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:bg-muted",
                    ].join(
                      " "
                    )}
                  >
                    <div className="text-sm font-extrabold text-heading">
                      Use Store Profile address
                    </div>

                    <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">
                      Use the business address saved under Profile & Account.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPackingSlipShowReturn(
                        true
                      )
                    }
                    className={[
                      "ls-focus-ring min-h-[92px] rounded-2xl border p-4 text-left transition",
                      packingSlipShowReturn
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:bg-muted",
                    ].join(
                      " "
                    )}
                  >
                    <div className="text-sm font-extrabold text-heading">
                      Use another return address
                    </div>

                    <p className="mt-1 hidden text-xs leading-5 text-muted-foreground sm:block">
                      Use a separate sender or return address for self shipping.
                    </p>
                  </button>
                </div>

                {packingSlipShowReturn ? (
                  <Field label="Custom sender / return address">
                    <textarea
                      rows={4}
                      className={
                        textareaClass
                      }
                      placeholder={
                        "Business / contact name\nAddress line 1\nCity, State, PIN\nMobile"
                      }
                      value={
                        packingSlipReturnAddress
                      }
                      onChange={(
                        event
                      ) =>
                        setPackingSlipReturnAddress(
                          event.target.value
                        )
                      }
                    />
                  </Field>
                ) : (
                  <div className="rounded-2xl bg-surface-soft px-4 py-3 text-xs leading-5 text-muted-foreground">
                    Store Profile address will be printed as the sender / return address.
                  </div>
                )}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-[0_12px_28px_rgba(38,51,95,0.12)] backdrop-blur md:gap-3 md:rounded-2xl md:p-2.5">
          <div className="hidden min-w-0 px-1 sm:block">
            <div className="text-xs font-bold text-heading">
              {isDirty
                ? "Unsaved delivery changes"
                : "All changes saved"}
            </div>
          </div>

          <AsyncButton
            type="button"
            loading={saving}
            loadingLabel="Saving…"
            className="w-full sm:w-auto"
            disabled={
              !isDirty
            }
            onClick={() =>
              void save()
            }
          >
            Save Delivery Setup
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}
