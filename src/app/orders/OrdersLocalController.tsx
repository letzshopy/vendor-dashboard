"use client";

import { useMemo, useState } from "react";
import OrdersClient from "./OrdersClient";
import { ORDER_STATUSES, STATUS_LABEL, WCOrder } from "@/lib/order-utils";

const canon = (s?: string) =>
  (s || "").trim().toLowerCase().replace(/[^a-z-]/g, ""); // "On Hold" -> "onhold"

function withinRange(date_gmt?: string, from?: string, to?: string) {
  if (!date_gmt) return true;
  const t = Date.parse(date_gmt + "Z");
  if (from) {
    const tFrom = Date.parse(from + "T00:00:00Z");
    if (t < tFrom) return false;
  }
  if (to) {
    const tTo = Date.parse(to + "T23:59:59Z");
    if (t > tTo) return false;
  }
  return true;
}

export default function OrdersLocalController({ initial }: { initial: WCOrder[] }) {
  // two-box pattern like Products
  const [status, setStatus] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [s, setS] = useState<string>("");

  const [filtersVersion, setFiltersVersion] = useState(0); // bump to apply (status/date)
  const [searchVersion, setSearchVersion] = useState(0);   // bump to search (text)

  // Applied values (freeze when user clicks the button)
  const applied = useMemo(
    () => ({ status, from, to, v: filtersVersion }),
    [status, from, to, filtersVersion]
  );
  const query = useMemo(() => ({ s, v: searchVersion }), [s, searchVersion]);

  const filtered = useMemo(() => {
    let rows = initial;

    // Filter box (status + date) — independent of search
    if (applied.status && applied.status !== "all") {
      const want = canon(applied.status);
      rows = rows.filter((o) => canon(o.status) === want);
    }
    if (applied.from || applied.to) {
      rows = rows.filter((o) => withinRange(o.date_created_gmt, applied.from, applied.to));
    }

    // Search box — independent of status/date
    if (query.s.trim()) {
      const q = query.s.trim().toLowerCase();
      rows = rows.filter((o) => {
        const idStr = String(o.id || "");
        const number = String(o.number || idStr).toLowerCase();
        const name = `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.toLowerCase();
        const email = (o.billing?.email || "").toLowerCase();
        const phone = (o.billing?.phone || "").toLowerCase();
        if (
          idStr === q ||
          number.includes(q) ||
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q)
        ) return true;
        return (o.line_items || []).some((li) =>
          (li.sku || "").toLowerCase().includes(q) ||
          (li.name || "").toLowerCase().includes(q)
        );
      });
    }

    return rows;
  }, [initial, applied, query]);

  return (
    <div className="space-y-4">
      {/* Top row: separate boxes exactly like Products */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* LEFT: Filter box */}
        <div className="flex-1 bg-white p-3 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select
              className="border rounded px-2 py-1"
              value={status}
              onChange={(e) => setStatus(e.currentTarget.value)}
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((st) => (
                <option key={st} value={st}>{STATUS_LABEL[st] || st}</option>
              ))}
            </select>
            <input type="date" className="border rounded px-2 py-1" value={from} onChange={(e)=>setFrom(e.currentTarget.value)} />
            <input type="date" className="border rounded px-2 py-1" value={to} onChange={(e)=>setTo(e.currentTarget.value)} />
            <button
              type="button"
              className="border rounded px-3 py-1"
              onClick={() => setFiltersVersion((v) => v + 1)}
            >
              Apply
            </button>
          </div>
        </div>

        {/* RIGHT: Search box */}
        <div className="w-full md:w-[480px] bg-white p-3 rounded-lg shadow">
          <div className="flex gap-2">
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Search # / name / email / phone / SKU / product"
              value={s}
              onChange={(e) => setS(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearchVersion((v) => v + 1)}
            />
            <button
              type="button"
              className="border rounded px-3 py-1"
              onClick={() => setSearchVersion((v) => v + 1)}
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions + table (reuses your existing component) */}
      <OrdersClient orders={filtered} />
    </div>
  );
}
