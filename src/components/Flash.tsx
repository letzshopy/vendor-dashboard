// src/components/Flash.tsx
"use client";

import { useEffect, useState } from "react";

export default function Flash({
  message,
  kind = "success",
  duration = 2500,
}: {
  message: string;
  kind?: "success" | "error";
  duration?: number;
}) {
  const [show, setShow] = useState(true);

  // Re-show whenever the message/kind changes
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [message, kind, duration]);

  if (!show) return null;

  const cls =
    kind === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-red-200 bg-red-50 text-red-700";

  return <div className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{message}</div>;
}
