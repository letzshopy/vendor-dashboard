"use client";

import { useEffect, useState } from "react";
import OrdersReportClient from "./OrdersReportClient";
import CustomersReportClient from "./CustomersReportClient";
import StockReportClient from "./StockReportClient";

type Tab = "orders" | "customers" | "stock";

export default function ReportsTabsClient() {
  const [tab, setTab] = useState<Tab>("orders");

  // keep tab in URL (?rt=orders|customers|stock)
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
      {/* main tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            onClick={() => select("orders")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "orders"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => select("customers")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "customers"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => select("stock")}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition ${
              tab === "stock"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Stock
          </button>
        </div>
      </div>

      {/* views */}
      {tab === "orders" && <OrdersReportClient />}
      {tab === "customers" && <CustomersReportClient />}
      {tab === "stock" && <StockReportClient />}
    </div>
  );
}
