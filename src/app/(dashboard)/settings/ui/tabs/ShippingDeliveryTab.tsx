"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  BadgeIndianRupee,
  PackageCheck,
} from "lucide-react";
import {
  useSearchParams,
} from "next/navigation";

import type {
  SessionStoreType,
} from "@/lib/session";

import ShipmentFulfillmentTab from "./ShipmentFulfillmentTab";
import ShippingTab from "./ShippingTab";

type View =
  | "charges"
  | "delivery";

export default function ShippingDeliveryTab({
  storeType = "multisite",
}: {
  storeType?: SessionStoreType;
}) {
  const searchParams =
    useSearchParams();

  const showCharges =
    storeType !==
    "standalone";

  const legacyTab =
    searchParams.get("tab");

  const [
    view,
    setView,
  ] =
    useState<View>(
      !showCharges ||
      legacyTab ===
        "shipmentFulfillment"
        ? "delivery"
        : "charges"
    );

  useEffect(() => {
    if (!showCharges) {
      setView(
        "delivery"
      );
    }
  }, [showCharges]);

  return (
    <div className="space-y-4">
      {showCharges ? (
        <div className="inline-flex rounded-2xl bg-surface-soft p-1">
          <button
            type="button"
            onClick={() =>
              setView(
                "charges"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
              view ===
              "charges"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <BadgeIndianRupee className="h-4 w-4" />
            Shipping Charges
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "delivery"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition",
              view ===
              "delivery"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <PackageCheck className="h-4 w-4" />
            Delivery Setup
          </button>
        </div>
      ) : null}

      <div
        hidden={
          view !==
          "charges"
        }
      >
        {showCharges ? (
          <ShippingTab />
        ) : null}
      </div>

      <div
        hidden={
          view !==
          "delivery"
        }
      >
        <ShipmentFulfillmentTab
          enablePackingSlipSettings={
            !(
              storeType ===
              "standalone"
            )
          }
        />
      </div>
    </div>
  );
}
