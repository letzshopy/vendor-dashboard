"use client";

import { useEffect, useState } from "react";
import OrdersReportClient from "./OrdersReportClient";
import CustomersReportClient from "./CustomersReportClient";
import StockReportClient from "./StockReportClient";

type Tab = "orders" | "customers" | "stock";

export default function ReportsTabsClient() {
  const [tab, setTab] = useState<Tab>("orders");

  useEffect(() => {
    const url = new URL(window.location.href);
    const current = (url.searchParams.get("rt") || "orders") as Tab;
    setTab(current);
  }, []);

  function select(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("rt", next);
    window.history.replaceState({}, "", url.toString());
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[22px] bg-slate-100 p-1.5 w-fit">
        <button
          onClick={() => select("orders")}
          className={`rounded-[18px] px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            tab === "orders"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Orders
        </button>

        <button
          onClick={() => select("customers")}
          className={`rounded-[18px] px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            tab === "customers"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Customers
        </button>

        <button
          onClick={() => select("stock")}
          className={`rounded-[18px] px-4 py-2 text-xs font-semibold transition sm:text-sm ${
            tab === "stock"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          Stock
        </button>
      </div>

      {tab === "orders" && <OrdersReportClient />}
      {tab === "customers" && <CustomersReportClient />}
      {tab === "stock" && <StockReportClient />}
    </div>
  );
}