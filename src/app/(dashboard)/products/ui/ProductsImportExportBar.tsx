"use client";

import { useState } from "react";
import ImportProductsModal from "./ImportProductsModal";
import ExportProductsModal from "./ExportProductsModal";

type Category = { id: number; name: string; parent: number };

export default function ProductsImportExportBar({
  categories = [],
}: {
  categories?: Category[];
}) {
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex min-w-0 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:rounded-full sm:px-4 sm:py-1.5"
        >
          Import CSV
        </button>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex min-w-0 items-center justify-center rounded-2xl bg-slate-900 px-3 py-2.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 sm:rounded-full sm:px-4 sm:py-1.5"
        >
          Export CSV
        </button>
      </div>

      {showImport && (
        <ImportProductsModal
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {showExport && (
        <ExportProductsModal
          open={showExport}
          onClose={() => setShowExport(false)}
          categories={categories}
        />
      )}
    </>
  );
}
