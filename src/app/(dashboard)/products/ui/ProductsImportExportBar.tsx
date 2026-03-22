"use client";

import { useState } from "react";
import { Download, Upload } from "lucide-react";
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700"
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </button>

        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="inline-flex h-11 items-center gap-2 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
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