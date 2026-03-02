"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

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
    usp.set("search", q.trim());
    router.push(`/customers?${usp.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white/90 backdrop-blur rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center gap-3"
    >
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">
          🔍
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / email / phone"
          className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center rounded-xl bg-blue-600 px-4 h-10 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
      >
        Search
      </button>
    </form>
  );
}
