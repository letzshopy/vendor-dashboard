// src/hooks/useNotifications.ts
"use client";

import { useEffect, useState } from "react";

export type NotificationItem = {
  id: string;
  type: "new_order" | "upi_pending";
  order_id: number;
  order_number: string;
  total: string;
  customer?: string;
  created_at?: string;
  message: string;
};

type ApiResponse = {
  items?: NotificationItem[];
  error?: string;
};

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications", {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          console.error("Notifications fetch failed:", res.status);
          if (!cancelled) setItems([]);
          return;
        }

        const data: ApiResponse = await res.json();

        // IMPORTANT: we now always read `data.items`
        const arr = Array.isArray(data.items) ? data.items : [];
        if (!cancelled) {
          setItems(arr);
        }
      } catch (e: any) {
        console.error("Notifications fetch error:", e?.message || e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // initial load
    load();

    // poll every 60s
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const unreadCount = items.length; // simple: everything is “unread” for now

  return {
    items,
    loading,
    unreadCount,
  };
}
