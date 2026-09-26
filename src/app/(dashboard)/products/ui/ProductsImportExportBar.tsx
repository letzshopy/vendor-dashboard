"use client";

import {
  Download,
  MoreHorizontal,
  Upload,
} from "lucide-react";
import {
  useState,
} from "react";

import ExportProductsModal from "./ExportProductsModal";
import ImportProductsModal from "./ImportProductsModal";

import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";

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
  const [
    showImport,
    setShowImport,
  ] =
    useState(false);
  const [
    showExport,
    setShowExport,
  ] =
    useState(false);
  const [
    actionsOpen,
    setActionsOpen,
  ] =
    useState(false);

  return (
    <>
      <div className="md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setActionsOpen(
              true
            )
          }
        >
          <MoreHorizontal className="h-4 w-4" />
          Import / Export
        </Button>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setShowImport(
              true
            )
          }
        >
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setShowExport(
              true
            )
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <BottomSheet
        open={
          actionsOpen
        }
        onOpenChange={
          setActionsOpen
        }
        title="Import or export products"
        description="Move catalogue data in or out using CSV."
        popupClassName="md:hidden"
      >
        <div className="grid gap-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => {
              setActionsOpen(
                false
              );
              setShowImport(
                true
              );
            }}
          >
            <Upload className="h-4 w-4" />
            Import products from CSV
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full justify-start"
            onClick={() => {
              setActionsOpen(
                false
              );
              setShowExport(
                true
              );
            }}
          >
            <Download className="h-4 w-4" />
            Export products to CSV
          </Button>
        </div>
      </BottomSheet>

      <ImportProductsModal
        open={
          showImport
        }
        onClose={() =>
          setShowImport(
            false
          )
        }
      />

      <ExportProductsModal
        open={
          showExport
        }
        onClose={() =>
          setShowExport(
            false
          )
        }
        categories={
          categories
        }
      />
    </>
  );
}
