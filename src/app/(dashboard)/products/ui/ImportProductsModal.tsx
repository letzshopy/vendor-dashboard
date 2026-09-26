"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { actionFeedback } from "@/lib/actionFeedback";

type Result = {
  ok: boolean;
  rows?: number;
  summary?: { created: number; updated: number; skipped: number };
  errors?: { row: number; reason: string }[];
  error?: string;
};

export default function ImportProductsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  function triggerPick() {
    fileRef.current?.click();
  }

  async function runImport() {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      actionFeedback.warning({
        id: "products-import-file",
        title: "Choose a CSV file",
        message: "Select a product CSV before starting the import.",
        durationMs: 3200,
      });
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      actionFeedback.warning({
        id: "products-import-size",
        title: "CSV is too large",
        message: "Use a file that is 4 MB or smaller.",
        durationMs: 3200,
      });
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    fd.append("updateExisting", String(updateExisting));
    fd.append("delimiter", ""); // autodetect

    const feedbackId = "products-import";

    setUpdating(true);
    setResult(null);

    actionFeedback.loading({
      id: feedbackId,
      title: "Importing products…",
      message: selectedName || f.name,
    });

    try {
      const res = await fetch("/api/import/products/run", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as Result;
      setResult(data);

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Product import failed.");
      }

      actionFeedback.success({
        id: feedbackId,
        title: "Product import complete",
        message: `${data.summary?.created ?? 0} created · ${data.summary?.updated ?? 0} updated`,
        durationMs: 3200,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Import failed";

      setResult({
        ok: false,
        error: message,
      });

      actionFeedback.error({
        id: feedbackId,
        title: "Product import failed",
        message,
        durationMs: 4200,
      });
    } finally {
      setUpdating(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm md:items-center md:p-4">
      <div className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl ring-1 ring-slate-900/5 md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Import products from CSV
            </h3>
            <p className="text-xs text-slate-500">
              Upload a compatible CSV file to create or update
              products.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 px-5 py-4 text-xs">
          {/* File chooser */}
          <div className="space-y-1.5">
            <div className="font-medium text-slate-800">CSV file</div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) =>
                  setSelectedName(e.target.files?.[0]?.name || "")
                }
              />
              <button
                type="button"
                onClick={triggerPick}
                className="ls-focus-ring inline-flex min-h-11 items-center rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground hover:bg-muted"
              >
                Choose file
              </button>
              <span className="text-slate-600">
                {selectedName || "No file chosen"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Maximum size: 4 MB and 500 product rows. Use UTF-8 encoded CSV.
            </div>
          </div>

          {/* Update existing */}
          <div className="flex items-start gap-2">
            <input
              id="upd"
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="mt-0.5 h-3 w-3 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <label htmlFor="upd" className="text-slate-700">
              Update existing products that match by <b>ID</b> or <b>SKU</b>.
              When this is off, new products are created and duplicate SKUs are
              auto-suffixed.
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={runImport}
              disabled={updating}
              className="ls-focus-ring inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating ? "Importing…" : "Run import"}
            </button>
            <button
              onClick={onClose}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Close
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-xs">
              {result.ok ? (
                <>
                  <div className="mb-1 font-medium text-slate-800">
                    Import result
                  </div>
                  <div className="mb-2 text-slate-700">
                    Imported: <b>{result.summary?.created ?? 0}</b> · Updated:{" "}
                    <b>{result.summary?.updated ?? 0}</b> · Skipped:{" "}
                    <b>{result.summary?.skipped ?? 0}</b>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <>
                      <div className="mb-1 font-medium text-slate-800">
                        Skipped rows
                      </div>
                      <ul className="max-h-32 list-disc space-y-0.5 overflow-auto pl-4 text-slate-700">
                        {result.errors.map((er, i) => (
                          <li key={i}>
                            Row {er.row}:{" "}
                            {typeof er.reason === "string"
                              ? er.reason
                              : JSON.stringify(er.reason)}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              ) : (
                <div className="text-red-600">
                  Error: {result.error || "Import failed"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
