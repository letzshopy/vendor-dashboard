"use client";

import { useEffect, useState } from "react";

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

export default function ShipmentFulfillmentTab() {
  const [data, setData] = useState<ShipmentFulfillmentSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/settings/shipment-fulfillment", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as ShipmentFulfillmentSettings;
        if (!cancelled) {
          setData({
            ...emptySettings,
            ...json,
            pickup: { ...emptySettings.pickup, ...(json.pickup || {}) },
          });
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load shipment fulfillment settings.");
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

  const onChangePickup = (
    field: keyof ShipmentFulfillmentSettings["pickup"],
    value: string
  ) => {
    setData((d) => ({
      ...d,
      pickup: { ...d.pickup, [field]: value },
    }));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const res = await fetch("/api/settings/shipment-fulfillment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      const json = (await res.json()) as ShipmentFulfillmentSettings;
      setData(json);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.error(e);
      setError("Could not save shipment fulfillment settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">
            Shipment fulfillment
          </h2>
          <p className="text-[11px] text-slate-500">
            Decide how you ship orders and set a default pickup profile for your
            courier partner.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {savedAt && (
            <span className="text-[11px] text-slate-500">
              Saved at {savedAt}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-black disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm space-y-4">
        {/* Mode selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-900">
                How do you fulfill shipments?
              </p>
              <p className="text-[11px] text-slate-500">
                You can either use Shift Logistics directly from this dashboard
                or manage shipping on your own.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, mode: "shift" }))}
              disabled={disabled}
              className={`px-3 py-1 rounded-full transition ${
                data.mode === "shift"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Shift Logistics
            </button>
            <button
              type="button"
              onClick={() => setData((d) => ({ ...d, mode: "self" }))}
              disabled={disabled}
              className={`px-3 py-1 rounded-full transition ${
                data.mode === "self"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Self shipping
            </button>
          </div>
        </div>

        {/* Mode specific content */}
        {loading ? (
          <p className="text-xs text-slate-500 pt-2">Loading…</p>
        ) : data.mode === "shift" ? (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="rounded-lg bg-indigo-50 px-3 py-2 text-[11px] text-indigo-800 border border-indigo-100">
              This pickup profile will be sent to Shift Logistics when you
              create a shipment. Make sure it matches your GST / pickup address.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="pickup-name"
                  className="text-[11px] font-medium text-slate-700"
                >
                  Pickup contact name
                </label>
                <input
                  id="pickup-name"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.name}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("name", e.target.value)}
                  placeholder="e.g. Mosin Boutique"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="pickup-phone"
                  className="text-[11px] font-medium text-slate-700"
                >
                  Pickup phone
                </label>
                <input
                  id="pickup-phone"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.phone}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("phone", e.target.value)}
                  placeholder="10-digit mobile"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label
                  htmlFor="pickup-address1"
                  className="text-[11px] font-medium text-slate-700"
                >
                  Address line 1
                </label>
                <input
                  id="pickup-address1"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.address1}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("address1", e.target.value)}
                  placeholder="Door no, street"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label
                  htmlFor="pickup-address2"
                  className="text-[11px] font-medium text-slate-700"
                >
                  Address line 2
                </label>
                <input
                  id="pickup-address2"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.address2}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("address2", e.target.value)}
                  placeholder="Area, landmark (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="pickup-city"
                  className="text-[11px] font-medium text-slate-700"
                >
                  City
                </label>
                <input
                  id="pickup-city"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.city}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("city", e.target.value)}
                  placeholder="City"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="pickup-state"
                  className="text-[11px] font-medium text-slate-700"
                >
                  State
                </label>
                <input
                  id="pickup-state"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.state}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("state", e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="pickup-postcode"
                  className="text-[11px] font-medium text-slate-700"
                >
                  Pincode
                </label>
                <input
                  id="pickup-postcode"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:bg-white"
                  value={data.pickup.postcode}
                  disabled={disabled}
                  onChange={(e) => onChangePickup("postcode", e.target.value)}
                  placeholder="6-digit pincode"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-700 border border-slate-100">
              <p className="font-medium text-xs mb-1">Self shipping mode</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Pack and ship orders with any courier of your choice (DTDC,
                  Blue Dart, India Post, etc.).
                </li>
                <li>
                  After dispatch, go to{" "}
                  <span className="font-medium">Sales → Shipment Details</span>{" "}
                  and update the courier name & tracking number.
                </li>
                <li>
                  Once you save shipment details, orders will move towards{" "}
                  <span className="font-medium">Completed</span> in your store.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
