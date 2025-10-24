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
    <>
      {/* main tabs */}
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => select("orders")}
          className={`px-3 py-2 rounded border text-sm ${tab === "orders" ? "bg-slate-100 border-slate-300" : "border-slate-200"}`}
        >
          Orders
        </button>
        <button
          onClick={() => select("customers")}
          className={`px-3 py-2 rounded border text-sm ${tab === "customers" ? "bg-slate-100 border-slate-300" : "border-slate-200"}`}
        >
          Customers
        </button>
        <button
          onClick={() => select("stock")}
          className={`px-3 py-2 rounded border text-sm ${tab === "stock" ? "bg-slate-100 border-slate-300" : "border-slate-200"}`}
        >
          Stock
        </button>
      </div>

      {/* views */}
      {tab === "orders" && <OrdersReportClient />}
      {tab === "customers" && <CustomersReportClient />}
      {tab === "stock" && <StockReportClient />}
    </>
  );
}
