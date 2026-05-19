"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Truck,
  User,
  Phone,
  MapPin,
  Building2,
  MapPinned,
  Save,
  CheckCircle2,
  PackageCheck,
} from "lucide-react";

type Mode = "shift" | "self";

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

const emptySettings: ShipmentFulfillmentSettings = {
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

function FieldCard({
  label,
  icon,
  children,
  hint,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        {icon ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-slate-900">{label}</div>
          {hint ? (
            <div className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {hint}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
        <div className="flex items-start gap-3">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              {icon}
            </div>
          ) : null}
          <div>
            <h3 className="text-[16px] font-semibold text-slate-900">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-[12px] leading-5 text-slate-500">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </section>
  );
}

function inputClass(hasValue?: boolean) {
  return [
    "h-11 w-full rounded-2xl border px-4 text-sm outline-none transition",
    hasValue
      ? "border-slate-300 bg-white text-slate-900"
      : "border-slate-200 bg-slate-50 text-slate-900",
    "placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-200",
  ].join(" ");
}

export default function ShipmentFulfillmentTab() {
  const [data, setData] = useState<ShipmentFulfillmentSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const snapshotRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/settings/shipment-fulfillment", {
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Failed to load shipment fulfillment settings");

        const json = (await res.json()) as ShipmentFulfillmentSettings;

        const merged: ShipmentFulfillmentSettings = {
          ...emptySettings,
          ...json,
          pickup: { ...emptySettings.pickup, ...(json?.pickup || {}) },
        };

        if (!cancelled) {
          setData(merged);
          snapshotRef.current = JSON.stringify(merged);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load shipment fulfillment settings.");
          setData(emptySettings);
          snapshotRef.current = JSON.stringify(emptySettings);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = loading || saving;

  const isDirty = useMemo(() => {
    return JSON.stringify(data) !== snapshotRef.current;
  }, [data]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };

    if (isDirty) {
      window.addEventListener("beforeunload", onBeforeUnload);
    }

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const onChangePickup = (
    field: keyof ShipmentFulfillmentSettings["pickup"],
    value: string
  ) => {
    setData((prev) => ({
      ...prev,
      pickup: { ...prev.pickup, [field]: value },
    }));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedBanner(null);

    try {
      const res = await fetch("/api/settings/shipment-fulfillment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to save shipment fulfillment settings");

      const json = (await res.json()) as ShipmentFulfillmentSettings;
      const merged: ShipmentFulfillmentSettings = {
        ...emptySettings,
        ...json,
        pickup: { ...emptySettings.pickup, ...(json?.pickup || {}) },
      };

      setData(merged);
      snapshotRef.current = JSON.stringify(merged);
      setSavedBanner("Shipment fulfillment settings saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => setSavedBanner(null), 3500);
    } catch (e) {
      console.error(e);
      setError("Could not save shipment fulfillment settings.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {savedBanner && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
          {savedBanner}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm">
          {error}
        </div>
      )}

      <section className="rounded-[28px] border border-white/80 bg-gradient-to-br from-white via-[#f7f8ff] to-[#eef7ff] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.06)] md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <PackageCheck className="h-3.5 w-3.5" />
              Shipment Fulfillment
            </div>

            <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-slate-900 md:text-[34px]">
              Shipment Settings
            </h1>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Choose how your orders are shipped and maintain the pickup profile
              used for courier bookings.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || !isDirty}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold shadow-sm transition ${
              disabled || !isDirty
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm">
            <span
              className={`h-2 w-2 rounded-full ${
                data.mode === "shift" ? "bg-indigo-500" : "bg-emerald-500"
              }`}
            />
            {data.mode === "shift" ? "Shift Logistics enabled" : "Self shipping enabled"}
          </span>

          {!isDirty && !loading && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              All changes saved
            </span>
          )}

          {isDirty && !loading && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700">
              You have unsaved changes
            </span>
          )}
        </div>
      </section>

      <SectionCard
        title="Shipping mode"
        subtitle="Choose whether LetzShopy should use Shift Logistics pickup details or whether you manage dispatch on your own."
        icon={<Truck className="h-5 w-5" />}
      >
        {loading ? (
          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Loading shipment settings…
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setData((prev) => ({ ...prev, mode: "shift" }))}
              className={`rounded-[24px] border p-4 text-left transition ${
                data.mode === "shift"
                  ? "border-indigo-500 bg-indigo-50 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      data.mode === "shift"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Shift Logistics
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      Use pickup details from this page while creating shipments
                      with Shift.
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border ${
                    data.mode === "shift"
                      ? "border-indigo-600 bg-indigo-600 ring-4 ring-indigo-100"
                      : "border-slate-300 bg-white"
                  }`}
                />
              </div>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setData((prev) => ({ ...prev, mode: "self" }))}
              className={`rounded-[24px] border p-4 text-left transition ${
                data.mode === "self"
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      data.mode === "self"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <PackageCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Self Shipping
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">
                      Pack and ship manually with your own courier partner and
                      update shipment details later.
                    </p>
                  </div>
                </div>
                <div
                  className={`mt-0.5 h-4 w-4 rounded-full border ${
                    data.mode === "self"
                      ? "border-emerald-600 bg-emerald-600 ring-4 ring-emerald-100"
                      : "border-slate-300 bg-white"
                  }`}
                />
              </div>
            </button>
          </div>
        )}
      </SectionCard>

      {data.mode === "shift" ? (
        <SectionCard
          title="Pickup profile"
          subtitle="These details will be used as the default pickup address when you create shipments through Shift Logistics."
          icon={<MapPinned className="h-5 w-5" />}
        >
          <div className="mb-4 rounded-[20px] border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-[12px] leading-5 text-indigo-900">
            Make sure this address matches your actual pickup location. Wrong
            pickup details can cause courier delays or failed bookings.
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <FieldCard
              label="Pickup contact name"
              icon={<User className="h-4 w-4" />}
            >
              <input
                id="pickup-name"
                className={inputClass(!!data.pickup.name)}
                value={data.pickup.name}
                disabled={disabled}
                onChange={(e) => onChangePickup("name", e.target.value)}
                placeholder="Your full name"
              />
            </FieldCard>

            <FieldCard
              label="Pickup phone"
              icon={<Phone className="h-4 w-4" />}
            >
              <input
                id="pickup-phone"
                className={inputClass(!!data.pickup.phone)}
                value={data.pickup.phone}
                disabled={disabled}
                onChange={(e) => onChangePickup("phone", e.target.value)}
                placeholder="10-digit mobile number"
              />
            </FieldCard>

            <div className="lg:col-span-2">
              <FieldCard
                label="Address line 1"
                icon={<MapPin className="h-4 w-4" />}
                hint="House / flat / building / street"
              >
                <input
                  id="pickup-address1"
                  className={inputClass(!!data.pickup.address1)}
                  value={data.pickup.address1}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("address1", e.target.value)}
                  placeholder="Door no, street"
                />
              </FieldCard>
            </div>

            <div className="lg:col-span-2">
              <FieldCard
                label="Address line 2"
                icon={<Building2 className="h-4 w-4" />}
                hint="Area / landmark / locality"
              >
                <input
                  id="pickup-address2"
                  className={inputClass(!!data.pickup.address2)}
                  value={data.pickup.address2}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("address2", e.target.value)}
                  placeholder="Area, landmark"
                />
              </FieldCard>
            </div>

            <FieldCard label="City" icon={<MapPin className="h-4 w-4" />}>
              <input
                id="pickup-city"
                className={inputClass(!!data.pickup.city)}
                value={data.pickup.city}
                disabled={disabled}
                onChange={(e) => onChangePickup("city", e.target.value)}
                placeholder="City"
              />
            </FieldCard>

            <FieldCard label="State" icon={<MapPinned className="h-4 w-4" />}>
              <input
                id="pickup-state"
                className={inputClass(!!data.pickup.state)}
                value={data.pickup.state}
                disabled={disabled}
                onChange={(e) => onChangePickup("state", e.target.value)}
                placeholder="State"
              />
            </FieldCard>

            <FieldCard label="Pincode" icon={<MapPin className="h-4 w-4" />}>
              <input
                id="pickup-postcode"
                className={inputClass(!!data.pickup.postcode)}
                value={data.pickup.postcode}
                disabled={disabled}
                onChange={(e) => onChangePickup("postcode", e.target.value)}
                placeholder="6-digit pincode"
              />
            </FieldCard>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Self shipping workflow"
          subtitle="Use your own courier partner and update tracking details after dispatch."
          icon={<PackageCheck className="h-5 w-5" />}
        >
          <div className="space-y-3">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm font-semibold text-slate-900">
                How self shipping works
              </div>
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-slate-600">
                <li>• Pack and dispatch orders with any courier you prefer.</li>
                <li>
                  • After shipment, go to <span className="font-medium">Sales → Shipment Details</span>.
                </li>
                <li>
                  • Enter courier name and tracking number for the order.
                </li>
                <li>
                  • Save the shipment details so the order can move toward completion.
                </li>
              </ul>
            </div>

            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-[12px] leading-5 text-emerald-800">
              This mode is best if you already work with DTDC, Delhivery, India
              Post, Blue Dart, or your own local courier contact.
            </div>
          </div>
        </SectionCard>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={disabled || !isDirty}
          className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold shadow-sm transition ${
            disabled || !isDirty
              ? "cursor-not-allowed bg-slate-200 text-slate-500"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}