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
        <div className="grid w-full grid-cols-2 rounded-xl bg-surface-soft p-1 md:inline-flex md:w-auto md:rounded-2xl">
          <button
            type="button"
            onClick={() =>
              setView(
                "charges"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
              view ===
              "charges"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <BadgeIndianRupee className="h-4 w-4" />
            <span className="md:hidden">Charges</span>
            <span className="hidden md:inline">Shipping Charges</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setView(
                "delivery"
              )
            }
            className={[
              "ls-focus-ring inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition md:justify-start md:gap-2 md:rounded-xl md:px-4 md:text-sm",
              view ===
              "delivery"
                ? "bg-card text-heading shadow-sm"
                : "text-muted-foreground hover:text-heading",
            ].join(
              " "
            )}
          >
            <PackageCheck className="h-4 w-4" />
            <span className="md:hidden">Delivery</span>
            <span className="hidden md:inline">Delivery Setup</span>
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
