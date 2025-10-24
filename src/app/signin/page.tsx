"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function SignInPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const search = useSearchParams();
  const next = search.get("next") || "/orders";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, next }),
    });
    if (res.ok) window.location.href = next;
    else setLoading(false);
  }

  return (
    <main className="min-h-[60vh] grid place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">Vendor Sign in</h1>
        <label className="block text-sm mb-2">Shared Secret</label>
        <input
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          type="password"
          className="w-full border rounded-md px-3 py-2 text-sm"
          placeholder="Enter secret..."
          required
        />
        <button
          disabled={loading}
          className="mt-4 w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-3 text-xs text-slate-500">Tip: set the secret in <code>.env.local</code></p>
      </form>
    </main>
  );
}
