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

export default function ShipmentFulfillmentTab() {
  const [
    data,
    setData,
  ] =
    useState<ShipmentFulfillmentSettings>(
      emptySettings
    );

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

  useEffect(() => {
    let cancelled =
      false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            "/api/settings/shipment-fulfillment",
            {
              cache:
                "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            "Failed to load delivery setup"
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

        if (!cancelled) {
          setData(merged);
          snapshotRef.current =
            JSON.stringify(
              merged
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
  }, []);

  const isDirty =
    useMemo(
      () =>
        Boolean(
          snapshotRef.current
        ) &&
        JSON.stringify(
          data
        ) !==
          snapshotRef.current,
      [data]
    );

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

      setData(merged);
      snapshotRef.current =
        JSON.stringify(
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
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
            <Truck className="h-4.5 w-4.5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-sm font-extrabold text-heading">
              Delivery method
            </h2>

            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
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
              "ls-focus-ring min-h-[112px] rounded-2xl border p-4 text-left transition",
              data.mode ===
              "shift"
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:bg-muted",
            ].join(
              " "
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
                <Truck className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <div className="text-sm font-extrabold text-heading">
                  Shift Logistics
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
              "ls-focus-ring min-h-[112px] rounded-2xl border p-4 text-left transition",
              data.mode ===
              "self"
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:bg-muted",
            ].join(
              " "
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
                <PackageCheck className="h-4.5 w-4.5" />
              </span>

              <div className="min-w-0">
                <div className="text-sm font-extrabold text-heading">
                  Self Shipping
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
          <div className="flex items-start gap-3 border-b border-border px-4 py-3.5 md:px-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <MapPin className="h-4.5 w-4.5" />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-heading">
                Pickup address
              </h2>

              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Default pickup details used when booking courier shipments.
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5">
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
        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
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
      )}

      <div className="sticky bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-20 md:bottom-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_14px_36px_rgba(38,51,95,0.14)] backdrop-blur">
          <div className="min-w-0 px-1">
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
