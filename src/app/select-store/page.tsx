"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Store = { blog_id: number; store_name: string; store_url: string };

export default function SelectStorePage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          setErr(data?.error || "Not logged in");
          setLoading(false);
          return;
        }

        setStores(Array.isArray(data?.stores) ? data.stores : []);
        setLoading(false);
      } catch {
        setErr("Failed to load stores");
        setLoading(false);
      }
    })();
  }, []);

  async function choose(store: Store) {
    setErr(null);

    const res = await fetch("/api/tenant/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.ok) {
      setErr(data?.error || "Could not select store");
      return;
    }

    window.location.href = "/dashboard";
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-400">Loading stores…</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">
            Vendor Admin
          </div>
          <h1 className="text-3xl font-semibold mt-1">Select a store</h1>
          <p className="text-sm text-slate-400 mt-2">
            Choose which vendor dashboard you want to open.
          </p>
        </div>

        {err && (
          <div className="text-sm text-red-300 border border-red-900/40 bg-red-950/30 rounded-xl px-4 py-3">
            {err}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stores.map((s) => (
            <button
              key={s.blog_id}
              onClick={() => choose(s)}
              className="text-left rounded-2xl border border-slate-700 bg-slate-900 hover:bg-slate-800 p-5 transition"
            >
              <div className="text-xl font-semibold text-white">
                {s.store_name || `Store ${s.blog_id}`}
              </div>
              <div className="text-sm text-slate-300 mt-2 break-all">
                {(s.store_url || "").replace(/^https?:\/\//, "")}
              </div>
            </button>
          ))}

          {stores.length === 0 && (
            <div className="text-sm text-slate-400">No stores found for this account.</div>
          )}
        </div>
      </div>
    </div>
  );
}