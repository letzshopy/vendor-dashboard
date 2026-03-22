"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, FileUp, Loader2, Upload, X } from "lucide-react";

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
    fd.append("delimiter", "");

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
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/45 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-3xl overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:rounded-[28px]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#faf7ff] via-white to-[#eef7ff] px-4 py-4 md:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f2ebff] text-[#7a4cf0]">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Import products
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a compatible CSV file to create or update products.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-4 py-4 md:px-5">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 text-sm font-semibold text-slate-900">
              CSV file
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => setSelectedName(e.target.files?.[0]?.name || "")}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={triggerPick}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700"
              >
                <Upload className="h-4 w-4" />
                Choose file
              </button>

              <div className="min-w-0 flex-1 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">
                <span className="block truncate">
                  {selectedName || "No file chosen"}
                </span>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              Maximum size: 20 MB. Use UTF-8 encoded CSV.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <input
              id="upd"
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">
                Update existing products
              </div>
              <div className="mt-1 text-xs leading-5 text-slate-500">
                Match by <b>ID</b> or <b>SKU</b>. When disabled, new products are
                created and duplicate SKUs are auto-suffixed.
              </div>
            </div>
          </label>

          {result && (
            <div
              className={`rounded-[24px] border px-4 py-4 ${
                result.ok
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-rose-200 bg-rose-50"
              }`}
            >
              {result.ok ? (
                <>
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Import result
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <ResultTile
                      label="Created"
                      value={String(result.summary?.created ?? 0)}
                    />
                    <ResultTile
                      label="Updated"
                      value={String(result.summary?.updated ?? 0)}
                    />
                    <ResultTile
                      label="Skipped"
                      value={String(result.summary?.skipped ?? 0)}
                    />
                  </div>

                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-white/70 p-3">
                      <div className="mb-1 text-xs font-semibold text-slate-800">
                        Skipped rows
                      </div>
                      <ul className="max-h-32 list-disc space-y-1 overflow-auto pl-4 text-xs text-slate-700">
                        {result.errors.map((er, i) => (
                          <li key={i}>
                            Row {er.row}:{" "}
                            {typeof er.reason === "string"
                              ? er.reason
                              : JSON.stringify(er.reason)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm font-medium text-rose-700">
                  Error: {result.error || "Import failed"}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>

            <button
              onClick={runImport}
              disabled={updating}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#8b5cff] to-[#ff79c7] px-5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updating && <Loader2 className="h-4 w-4 animate-spin" />}
              {updating ? "Importing…" : "Run import"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ResultTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 px-3 py-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-900">{value}</div>
    </div>
  );
}