"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Boxes,
  Globe2,
  ShoppingCart,
  Users,
} from "lucide-react";

import CustomersReportClient from "./CustomersReportClient";
import OrdersReportClient from "./OrdersReportClient";
import StockReportClient from "./StockReportClient";
import WebsiteAnalyticsReportClient from "./WebsiteAnalyticsReportClient";

type Tab =
  | "orders"
  | "customers"
  | "stock"
  | "website";

const tabs = [
  {
    key: "orders" as const,
    label: "Orders",
    mobileLabel:
      "Orders",
    icon:
      ShoppingCart,
  },
  {
    key:
      "customers" as const,
    label:
      "Customers",
    mobileLabel:
      "Customers",
    icon: Users,
  },
  {
    key: "stock" as const,
    label: "Stock",
    mobileLabel:
      "Stock",
    icon: Boxes,
  },
  {
    key:
      "website" as const,
    label:
      "Website Analytics",
    mobileLabel:
      "Website",
    icon: Globe2,
  },
];

function isValidTab(
  value: string | null
): value is Tab {
  return (
    value === "orders" ||
    value ===
      "customers" ||
    value === "stock" ||
    value ===
      "website"
  );
}

export default function ReportsTabsClient() {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "orders"
    );

  useEffect(() => {
    const url =
      new URL(
        window.location.href
      );

    const current =
      url.searchParams.get(
        "rt"
      );

    if (
      isValidTab(
        current
      )
    ) {
      setTab(
        current
      );
    }
  }, []);

  function select(
    next: Tab
  ) {
    setTab(next);

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.set(
      "rt",
      next
    );

    window.history.replaceState(
      {},
      "",
      url.toString()
    );
  }

  return (
    <div className="min-w-0 space-y-3 md:space-y-4">
      <div className="grid grid-cols-4 gap-0.5 rounded-xl border border-border bg-card p-1 md:inline-flex md:w-auto md:gap-1.5 md:rounded-2xl">
        {tabs.map(
          (item) => {
            const Icon =
              item.icon;

            const active =
              tab ===
              item.key;

            return (
              <button
                key={
                  item.key
                }
                type="button"
                onClick={() =>
                  select(
                    item.key
                  )
                }
                className={[
                  "ls-focus-ring inline-flex min-h-10 min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 text-[11px] font-bold transition md:min-h-11 md:rounded-xl md:px-4 md:text-sm",
                  active
                    ? "bg-card text-heading shadow-sm"
                    : "text-muted-foreground hover:text-heading",
                ].join(
                  " "
                )}
              >
                <Icon className="hidden h-4 w-4 sm:block" />

                <span className="truncate md:hidden">
                  {
                    item.mobileLabel
                  }
                </span>

                <span className="hidden md:inline">
                  {
                    item.label
                  }
                </span>
              </button>
            );
          }
        )}
      </div>

      {tab ===
      "orders" ? (
        <OrdersReportClient />
      ) : null}

      {tab ===
      "customers" ? (
        <CustomersReportClient />
      ) : null}

      {tab ===
      "stock" ? (
        <StockReportClient />
      ) : null}

      {tab ===
      "website" ? (
        <WebsiteAnalyticsReportClient />
      ) : null}
    </div>
  );
}
