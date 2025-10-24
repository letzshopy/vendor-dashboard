"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function CustomersSearch({ initialSearch = "" }: { initialSearch?: string }) {
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
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-3 flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name / email / phone"
        className="border rounded px-3 py-2 w-full"
      />
      <button type="submit" className="border rounded px-4 py-2">Search</button>
    </form>
  );
}
