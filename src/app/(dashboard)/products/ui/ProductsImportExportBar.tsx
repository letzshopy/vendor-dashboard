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
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          Import CSV
        </button>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
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
