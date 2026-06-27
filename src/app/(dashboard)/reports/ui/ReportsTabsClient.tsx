"use client";

import { useEffect, useState } from "react";
import OrdersReportClient from "./OrdersReportClient";
import CustomersReportClient from "./CustomersReportClient";
import StockReportClient from "./StockReportClient";
import WebsiteAnalyticsReportClient from "./WebsiteAnalyticsReportClient";

type Tab = "orders" | "customers" | "stock" | "website";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "orders", label: "Orders" },
  { key: "customers", label: "Customers" },
  { key: "stock", label: "Stock" },
  { key: "website", label: "Website Analytics" },
];

function isValidTab(value: string | null): value is Tab {
  return value === "orders" || value === "customers" || value === "stock" || value === "website";
}

export default function ReportsTabsClient() {
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get("rt");

    if (isValidTab(current)) {
      setTab(current);
    }
  }, []);

  function select(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("rt", next);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="space-y-4">
      <div className="flex w-fit flex-wrap items-center gap-2 rounded-[22px] bg-slate-100 p-1.5">
        {tabs.map((item) => (
          <button
            key={item.key}
            onClick={() => select(item.key)}
            className={`rounded-[18px] px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              tab === item.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersReportClient />}
      {tab === "customers" && <CustomersReportClient />}
      {tab === "stock" && <StockReportClient />}
      {tab === "website" && <WebsiteAnalyticsReportClient />}
    </div>
  );
}