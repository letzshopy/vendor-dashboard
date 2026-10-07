"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

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

type Props = {
  categories: Category[];
  initialCategory: string;
  initialStock: string;
  initialType: string;
  rightSlot?: ReactNode;
};

export default function ProductsFilters({
  categories,
  initialCategory,
  initialStock,
  initialType,
  rightSlot,
}: Props) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    category,
    setCategory,
  ] =
    useState(
      initialCategory ||
        ""
    );
  const [
    stock,
    setStock,
  ] =
    useState(
      initialStock || ""
    );
  const [
    ptype,
    setPtype,
  ] =
    useState(
      initialType || ""
    );

  const [
    draftCategory,
    setDraftCategory,
  ] =
    useState(category);
  const [
    draftStock,
    setDraftStock,
  ] =
    useState(stock);
  const [
    draftType,
    setDraftType,
  ] =
    useState(ptype);

  useEffect(() => {
    setCategory(
      initialCategory ||
        ""
    );
    setDraftCategory(
      initialCategory ||
        ""
    );
  }, [
    initialCategory,
  ]);

  useEffect(() => {
    setStock(
      initialStock || ""
    );
    setDraftStock(
      initialStock || ""
    );
  }, [
    initialStock,
  ]);

  useEffect(() => {
    setPtype(
      initialType || ""
    );
    setDraftType(
      initialType || ""
    );
  }, [
    initialType,
  ]);

  const activeFilterCount =
    [
      category,
      stock,
      ptype,
    ].filter(Boolean)
      .length;

  function navigate(
    nextCategory:
      string,
    nextStock: string,
    nextType: string
  ) {
    const params =
      new URLSearchParams();

    if (nextCategory) {
      params.set(
        "category",
        nextCategory
      );
    }

    if (nextStock) {
      params.set(
        "stock",
        nextStock
      );
    }

    if (nextType) {
      params.set(
        "ptype",
        nextType
      );
    }

    window.dispatchEvent(
      new Event(
        "letzshopy:navigation-start"
      )
    );

    router.push(
      params.size
        ? `/products?${params.toString()}`
        : "/products"
    );
  }

  function openFilters() {
    setDraftCategory(
      category
    );
    setDraftStock(
      stock
    );
    setDraftType(
      ptype
    );
    setOpen(true);
  }

  function applyFilters() {
    setCategory(
      draftCategory
    );
    setStock(
      draftStock
    );
    setPtype(
      draftType
    );
    setOpen(false);

    navigate(
      draftCategory,
      draftStock,
      draftType
    );
  }

  function clearFilters() {
    setCategory("");
    setStock("");
    setPtype("");
    setDraftCategory("");
    setDraftStock("");
    setDraftType("");
    setOpen(false);

    navigate(
      "",
      "",
      ""
    );
  }

  return (
    <>
      <section className="flex min-w-0 items-center justify-between gap-2 border-b border-border bg-card p-2.5 md:p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant={
              activeFilterCount >
              0
                ? "secondary"
                : "outline"
            }
            size="sm"
            onClick={
              openFilters
            }
            className="relative"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters

            {activeFilterCount >
            0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-primary-foreground">
                {
                  activeFilterCount
                }
              </span>
            ) : null}
          </Button>

          {activeFilterCount >
          0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                clearFilters
              }
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>

        {rightSlot ? (
          <div className="ml-auto min-w-0">
            {rightSlot}
          </div>
        ) : null}
      </section>

      <BottomSheet
        open={open}
        onOpenChange={
          setOpen
        }
        title="Filter products"
        description="Narrow the catalogue by category, stock and product type."
        popupClassName="md:mx-auto md:max-w-xl"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Category
            </span>

            <select
              value={
                draftCategory
              }
              onChange={(
                event
              ) =>
                setDraftCategory(
                  event
                    .currentTarget
                    .value
                )
              }
              className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
            >
              <option value="">
                All categories
              </option>

              {categories
                .slice()
                .sort(
                  (
                    first,
                    second
                  ) =>
                    first.name.localeCompare(
                      second.name
                    )
                )
                .map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.id
                      }
                      value={String(
                        item.id
                      )}
                    >
                      {
                        item.name
                      }
                    </option>
                  )
                )}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Stock
              </span>

              <select
                value={
                  draftStock
                }
                onChange={(
                  event
                ) =>
                  setDraftStock(
                    event
                      .currentTarget
                      .value
                  )
                }
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
              >
                <option value="">
                  All stock
                </option>
                <option value="instock">
                  In stock
                </option>
                <option value="outofstock">
                  Out of stock
                </option>
                <option value="onbackorder">
                  On backorder
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Product type
              </span>

              <select
                value={
                  draftType
                }
                onChange={(
                  event
                ) =>
                  setDraftType(
                    event
                      .currentTarget
                      .value
                  )
                }
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-semibold text-foreground"
              >
                <option value="">
                  All types
                </option>
                <option value="simple">
                  Simple
                </option>
                <option value="variable">
                  Variable
                </option>
                <option value="grouped">
                  Grouped
                </option>
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDraftCategory(
                ""
              );
              setDraftStock(
                ""
              );
              setDraftType(
                ""
              );
            }}
          >
            Clear
          </Button>

          <Button
            onClick={
              applyFilters
            }
          >
            Apply filters
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}
