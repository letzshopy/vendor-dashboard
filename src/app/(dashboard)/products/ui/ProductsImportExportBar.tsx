"use client";

import {
  Download,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import { useState } from "react";

import ExportProductsModal from "./ExportProductsModal";
import ImportProductsModal from "./ImportProductsModal";

type Category = {
  id: number;
  name: string;
  parent: number;
};

export default function ProductsImportExportBar({
  categories = [],
}: {
  categories?: Category[];
}) {
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((current) => !current)}
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-[#C9D0E8] bg-white px-3.5 text-sm font-bold text-[#2E3F7D] transition active:scale-[0.98] md:hidden"
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>

        {showMore ? (
          <div className="absolute right-0 top-11 z-[90] w-48 overflow-hidden rounded-xl border border-[#DDE2EE] bg-white p-1.5 shadow-[0_16px_36px_rgba(38,51,95,0.18)] md:hidden">
            <button
              type="button"
              onClick={() => {
                setShowMore(false);
                setShowImport(true);
              }}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 hover:bg-[#F7F8FC]"
            >
              <Upload className="h-4 w-4 text-[#5366B7]" />
              Import CSV
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMore(false);
                setShowExport(true);
              }}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-slate-700 hover:bg-[#F7F8FC]"
            >
              <Download className="h-4 w-4 text-[#5366B7]" />
              Export CSV
            </button>
          </div>
        ) : null}

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-xl border border-[#C9D0E8] bg-[#F7F8FC] px-3 text-xs font-bold text-[#2E3F7D] transition active:scale-[0.98] sm:px-4"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </button>

          <button
            type="button"
            onClick={() => setShowExport(true)}
            className="inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-xl bg-[#2E3F7D] px-3 text-xs font-bold text-white shadow-[0_6px_14px_rgba(46,63,125,0.18)] transition active:scale-[0.98] sm:px-4"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {showImport ? (
        <ImportProductsModal
          open={showImport}
          onClose={() => setShowImport(false)}
        />
      ) : null}

      {showExport ? (
        <ExportProductsModal
          open={showExport}
          onClose={() => setShowExport(false)}
          categories={categories}
        />
      ) : null}
    </>
  );
}
