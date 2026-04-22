"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function CustomersSearch({
  initialSearch = "",
}: {
  initialSearch?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(initialSearch);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const usp = new URLSearchParams(params.toString());
    usp.set("page", "1");

    const value = q.trim();
    if (value) usp.set("search", value);
    else usp.delete("search");

    router.push(`/customers?${usp.toString()}`);
  }

  function clearSearch() {
    setQ("");
    const usp = new URLSearchParams(params.toString());
    usp.set("page", "1");
    usp.delete("search");
    router.push(`/customers?${usp.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="overflow-hidden rounded-[26px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-white via-[#faf7ff] to-[#f4fbff] px-4 py-4">
        <h2 className="text-[16px] font-semibold text-slate-900">Search</h2>
      </div>

      <div className="flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / email / phone"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Search
          </button>

          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}