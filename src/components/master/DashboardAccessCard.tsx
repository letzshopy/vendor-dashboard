// src/components/master/DashboardAccessCard.tsx
"use client";

import { useState } from "react";

type Props = {
  blogid: number;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  unlockedAt?: string;
  unlockedBy?: string;
};

export default function DashboardAccessCard({
  blogid,
  locked,
  lockedAt,
  lockedBy,
  unlockedAt,
  unlockedBy,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [currentLocked, setCurrentLocked] = useState(locked);
  const [msg, setMsg] = useState("");

  async function updateLock(nextLocked: boolean) {
    setSaving(true);
    setMsg("");

    try {
      const res = await fetch(`/api/master/vendors/${blogid}/dashboard-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: nextLocked }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Failed to update access");
        setSaving(false);
        return;
      }

      setCurrentLocked(nextLocked);
      setMsg(nextLocked ? "Dashboard locked." : "Dashboard unlocked.");
      window.location.reload();
    } catch {
      setMsg("Failed to update access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-sm">
      <div className="font-semibold mb-3 text-slate-900">Dashboard Access</div>

      <div className="space-y-2 text-sm text-slate-900">
        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Status</span>
          <span className={currentLocked ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>
            {currentLocked ? "Locked" : "Unlocked"}
          </span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Locked at</span>
          <span>{lockedAt || "-"}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Locked by</span>
          <span>{lockedBy || "-"}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Last unlocked</span>
          <span>{unlockedAt || "-"}</span>
        </div>

        <div className="flex justify-between gap-3">
          <span className="text-slate-500">Unlocked by</span>
          <span>{unlockedBy || "-"}</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {currentLocked ? (
          <button
            onClick={() => updateLock(false)}
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Unlock Dashboard"}
          </button>
        ) : (
          <button
            onClick={() => updateLock(true)}
            disabled={saving}
            className="rounded-xl bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Lock Dashboard"}
          </button>
        )}
      </div>

      {msg ? <div className="mt-3 text-xs text-slate-500">{msg}</div> : null}
    </div>
  );
}