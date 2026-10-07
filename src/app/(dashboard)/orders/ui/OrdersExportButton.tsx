"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  Download,
} from "lucide-react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type Category = {
  id: number;
  name: string;
  parent: number;
};

type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "last_month"
  | "custom";

function filenameFromDisposition(
  value: string | null
) {
  if (!value) {
    return "orders.csv";
  }

  const match =
    value.match(
      /filename\*?=(?:UTF-8''|")?([^";]+)/i
    );

  if (!match?.[1]) {
    return "orders.csv";
  }

  try {
    return decodeURIComponent(
      match[1]
        .trim()
        .replace(
          /^"|"$/g,
          ""
        )
    );
  } catch {
    return "orders.csv";
  }
}

export default function OrdersExportButton({
  categories: categoriesProp = [],
}: {
  categories?: Category[];
}) {
  const [
    open,
    setOpen,
  ] =
    useState(false);
  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    status,
    setStatus,
  ] =
    useState("all");
  const [
    datePreset,
    setDatePreset,
  ] =
    useState<DatePreset>(
      "all"
    );
  const [
    from,
    setFrom,
  ] =
    useState("");
  const [
    to,
    setTo,
  ] =
    useState("");
  const [
    category,
    setCategory,
  ] =
    useState("");

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      categoriesProp
    );

  useEffect(() => {
    setCategories(
      categoriesProp
    );
  }, [
    categoriesProp,
  ]);

  useEffect(() => {
    if (
      !open ||
      categoriesProp.length >
        0
    ) {
      return;
    }

    const controller =
      new AbortController();

    async function loadCategories() {
      try {
        const response =
          await fetch(
            "/api/categories",
            {
              cache:
                "no-store",
              signal:
                controller.signal,
            }
          );
        const payload =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          response.ok &&
          payload?.ok &&
          Array.isArray(
            payload.items
          )
        ) {
          setCategories(
            payload.items
          );
        }
      } catch (
        error
      ) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }
      }
    }

    void loadCategories();

    return () =>
      controller.abort();
  }, [
    open,
    categoriesProp,
  ]);

  useEffect(() => {
    if (
      datePreset !==
      "custom"
    ) {
      setFrom("");
      setTo("");
    }
  }, [
    datePreset,
  ]);

  function buildQuery() {
    const query =
      new URLSearchParams();

    if (
      status &&
      status !==
        "all"
    ) {
      query.set(
        "status",
        status
      );
    }

    if (category) {
      query.set(
        "category",
        category
      );
    }

    if (
      datePreset ===
      "custom"
    ) {
      if (from) {
        query.set(
          "from",
          from
        );
      }

      if (to) {
        query.set(
          "to",
          to
        );
      }
    } else if (
      datePreset !==
      "all"
    ) {
      query.set(
        "preset",
        datePreset
      );
    }

    return query.toString();
  }

  async function download() {
    if (busy) {
      return;
    }

    if (
      datePreset ===
        "custom" &&
      from &&
      to &&
      from > to
    ) {
      actionFeedback.warning({
        id:
          "orders-export-date",
        title:
          "Check the date range",
        message:
          "Start date cannot be after end date.",
        durationMs: 3200,
      });
      return;
    }

    const feedbackId =
      "orders-export";

    setBusy(true);
    actionFeedback.loading({
      id: feedbackId,
      title:
        "Preparing order export…",
      message:
        "Building your CSV file.",
    });

    try {
      const query =
        buildQuery();
      const url =
        `/api/export/orders${query ? `?${query}` : ""}`;
      const response =
        await fetch(
          url,
          {
            cache:
              "no-store",
          }
        );

      if (
        !response.ok
      ) {
        const payload =
          await response
            .json()
            .catch(
              () => null
            );

        throw new Error(
          typeof payload
            ?.error ===
          "string"
            ? payload.error
            : "Order export failed."
        );
      }

      const blob =
        await response.blob();
      const objectUrl =
        URL.createObjectURL(
          blob
        );
      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        objectUrl;
      anchor.download =
        filenameFromDisposition(
          response.headers.get(
            "content-disposition"
          )
        );
      anchor.rel =
        "noopener";
      document.body.appendChild(
        anchor
      );
      anchor.click();
      anchor.remove();

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            objectUrl
          ),
        1000
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Order export ready",
        message:
          "CSV download started.",
        durationMs: 2600,
      });

      setOpen(false);
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Export failed",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setBusy(false);
    }
  }

  const customEnabled =
    datePreset ===
    "custom";
  const invalidRange =
    Boolean(
      customEnabled &&
        from &&
        to &&
        from > to
    );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setOpen(true)
        }
      >
        <Download className="h-4 w-4" />
        Export
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={
          setOpen
        }
        title="Export orders"
        description="Download a filtered CSV for reports or accounting."
        popupClassName="md:mx-auto md:max-w-2xl"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-heading">
                Order status
              </span>

              <select
                value={
                  status
                }
                onChange={(
                  event
                ) =>
                  setStatus(
                    event
                      .currentTarget
                      .value
                  )
                }
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
              >
                <option value="all">
                  All statuses
                </option>
                <option value="processing">
                  Processing
                </option>
                <option value="completed">
                  Completed
                </option>
                <option value="on-hold">
                  On hold
                </option>
                <option value="pending">
                  Pending payment
                </option>
                <option value="cancelled">
                  Cancelled
                </option>
                <option value="refunded">
                  Refunded
                </option>
                <option value="failed">
                  Failed
                </option>
              </select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-heading">
                Date filter
              </span>

              <select
                value={
                  datePreset
                }
                onChange={(
                  event
                ) =>
                  setDatePreset(
                    event
                      .currentTarget
                      .value as DatePreset
                  )
                }
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
              >
                <option value="all">
                  All dates
                </option>
                <option value="today">
                  Today
                </option>
                <option value="yesterday">
                  Yesterday
                </option>
                <option value="this_week">
                  This week
                </option>
                <option value="this_month">
                  This month
                </option>
                <option value="last_month">
                  Last month
                </option>
                <option value="custom">
                  Custom range
                </option>
              </select>
            </label>
          </div>

          <div className="space-y-4">
            <label>
              <span className="mb-1.5 block text-xs font-bold text-heading">
                Product category
              </span>

              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event
                      .currentTarget
                      .value
                  )
                }
                className="ls-focus-ring h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground"
              >
                <option value="">
                  All categories
                </option>

                {categories.map(
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

            <div>
              <span className="mb-1.5 block text-xs font-bold text-heading">
                Custom range
              </span>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={
                    from
                  }
                  onChange={(
                    event
                  ) =>
                    setFrom(
                      event
                        .currentTarget
                        .value
                    )
                  }
                  disabled={
                    !customEnabled
                  }
                />

                <Input
                  type="date"
                  value={
                    to
                  }
                  onChange={(
                    event
                  ) =>
                    setTo(
                      event
                        .currentTarget
                        .value
                    )
                  }
                  disabled={
                    !customEnabled
                  }
                />
              </div>

              {invalidRange ? (
                <p className="mt-1.5 text-xs font-semibold text-destructive">
                  Start date cannot be after end date.
                </p>
              ) : !customEnabled ? (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Choose Custom range to enter dates.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            disabled={
              busy
            }
            onClick={() =>
              setOpen(false)
            }
          >
            Cancel
          </Button>

          <AsyncButton
            loading={
              busy
            }
            loadingLabel="Preparing…"
            disabled={
              invalidRange
            }
            onClick={
              download
            }
          >
            <Download className="h-4 w-4" />
            Download CSV
          </AsyncButton>
        </div>
      </BottomSheet>
    </>
  );
}
