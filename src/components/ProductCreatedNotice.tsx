"use client";

import {
  CheckCircle2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

export default function ProductCreatedNotice({
  productName,
}: {
  productName: string;
}) {
  const [visible, setVisible] =
    useState(true);

  useEffect(() => {
    window.history.replaceState(
      {},
      "",
      "/products"
    );

    const timer = window.setTimeout(
      () => {
        setVisible(false);
      },
      4500
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed right-4 top-24 z-[100] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">
            Product created successfully
          </div>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            {productName
              ? `${productName} has been added to your catalogue.`
              : "The product has been added to your catalogue."}
          </p>
        </div>

        <button
          type="button"
          aria-label="Dismiss success message"
          onClick={() => setVisible(false)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}