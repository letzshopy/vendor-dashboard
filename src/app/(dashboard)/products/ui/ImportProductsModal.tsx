"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
      alert("Please choose a CSV file to upload.");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    fd.append("updateExisting", String(updateExisting));
    fd.append("delimiter", ""); // autodetect

    setUpdating(true);
    setResult(null);
    try {
      const res = await fetch("/api/import/products/run", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as Result;
      setResult(data);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message || "Import failed" });
    } finally {
      setUpdating(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Import products from CSV
            </h3>
            <p className="text-xs text-slate-500">
              Upload a WooCommerce-compatible CSV file to create or update
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
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Choose file
              </button>
              <span className="text-slate-600">
                {selectedName || "No file chosen"}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Maximum size: 20 MB. Use UTF-8 encoded CSV.
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
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
