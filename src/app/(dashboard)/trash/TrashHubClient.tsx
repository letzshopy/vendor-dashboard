"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  ArchiveRestore,
  Box,
  Check,
  Clock3,
  Image as ImageIcon,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  Input,
} from "@/components/ui/input";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type TrashTab =
  | "products"
  | "orders"
  | "media";

type ProductTrashItem = {
  id: number;
  name: string;
  sku?: string;
  date?: string | null;
};

type OrderTrashItem = {
  id: number;
  number: string;
  total: string;
  currency?: string;
  date?: string | null;
  customer: string;
  email?: string;
  itemCount?: number;
  previousStatus?: string;
};

type PendingDelete = {
  type:
    | "products"
    | "orders";
  ids: number[];
} | null;

const TAB_ITEMS: Array<{
  value: TrashTab;
  label: string;
  icon: typeof Box;
}> = [
  {
    value: "products",
    label: "Products",
    icon: Box,
  },
  {
    value: "orders",
    label: "Orders",
    icon: ShoppingBag,
  },
  {
    value: "media",
    label: "Media",
    icon: ImageIcon,
  },
];

function formatDate(
  value?: string | null
): string {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatMoney(
  value: string,
  currency = "INR"
): string {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount
    )
  ) {
    return value || "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency,
      maximumFractionDigits:
        2,
    }
  ).format(amount);
}

function readError(
  value: unknown,
  fallback: string
): string {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value) &&
    "error" in value &&
    typeof (
      value as {
        error?: unknown;
      }
    ).error === "string"
  ) {
    return (
      value as {
        error: string;
      }
    ).error;
  }

  return fallback;
}

export default function TrashHubClient() {
  const router =
    useRouter();
  const searchParams =
    useSearchParams();

  const requestedTab =
    searchParams.get("tab");

  const activeTab:
    TrashTab =
    requestedTab ===
      "orders" ||
    requestedTab ===
      "media"
      ? requestedTab
      : "products";

  const [
    products,
    setProducts,
  ] =
    useState<
      ProductTrashItem[]
    >([]);

  const [
    orders,
    setOrders,
  ] =
    useState<
      OrderTrashItem[]
    >([]);

  const [
    productsLoading,
    setProductsLoading,
  ] =
    useState(true);

  const [
    ordersLoading,
    setOrdersLoading,
  ] =
    useState(true);

  const [
    productsError,
    setProductsError,
  ] =
    useState<string | null>(
      null
    );

  const [
    ordersError,
    setOrdersError,
  ] =
    useState<string | null>(
      null
    );

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    selectedProducts,
    setSelectedProducts,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    selectedOrders,
    setSelectedOrders,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    busyKey,
    setBusyKey,
  ] =
    useState<string | null>(
      null
    );

  const [
    pendingDelete,
    setPendingDelete,
  ] =
    useState<PendingDelete>(
      null
    );

  async function loadProducts() {
    setProductsLoading(
      true
    );
    setProductsError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/products/trash",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          readError(
            payload,
            "Could not load product trash."
          )
        );
      }

      setProducts(
        Array.isArray(
          payload.items
        )
          ? payload.items
          : []
      );
    } catch (
      error
    ) {
      setProductsError(
        error instanceof Error
          ? error.message
          : "Could not load product trash."
      );
    } finally {
      setProductsLoading(
        false
      );
    }
  }

  async function loadOrders() {
    setOrdersLoading(
      true
    );
    setOrdersError(
      null
    );

    try {
      const response =
        await fetch(
          "/api/trash/orders",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          readError(
            payload,
            "Could not load order trash."
          )
        );
      }

      setOrders(
        Array.isArray(
          payload.items
        )
          ? payload.items
          : []
      );
    } catch (
      error
    ) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "Could not load order trash."
      );
    } finally {
      setOrdersLoading(
        false
      );
    }
  }

  useEffect(() => {
    void Promise.all([
      loadProducts(),
      loadOrders(),
    ]);
  }, []);

  useEffect(() => {
    setQuery("");
  }, [activeTab]);

  const filteredProducts =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return products;
      }

      return products.filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(
              normalized
            ) ||
          String(
            item.sku || ""
          )
            .toLowerCase()
            .includes(
              normalized
            )
      );
    }, [
      products,
      query,
    ]);

  const filteredOrders =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return orders;
      }

      return orders.filter(
        (item) =>
          String(
            item.number ||
              item.id
          )
            .toLowerCase()
            .includes(
              normalized
            ) ||
          item.customer
            .toLowerCase()
            .includes(
              normalized
            ) ||
          String(
            item.email || ""
          )
            .toLowerCase()
            .includes(
              normalized
            )
      );
    }, [
      orders,
      query,
    ]);

  const selected =
    activeTab ===
    "products"
      ? selectedProducts
      : activeTab ===
          "orders"
        ? selectedOrders
        : new Set<number>();

  const visibleIds =
    activeTab ===
    "products"
      ? filteredProducts.map(
          (item) =>
            item.id
        )
      : activeTab ===
          "orders"
        ? filteredOrders.map(
            (item) =>
              item.id
          )
        : [];

  const allVisibleSelected =
    visibleIds.length >
      0 &&
    visibleIds.every(
      (id) =>
        selected.has(id)
    );

  function changeTab(
    tab: TrashTab
  ) {
    if (
      tab === activeTab
    ) {
      return;
    }

    window.dispatchEvent(
      new Event(
        "letzshopy:navigation-start"
      )
    );

    router.replace(
      `/trash?tab=${tab}`,
      {
        scroll: false,
      }
    );
  }

  function setSelection(
    type:
      | "products"
      | "orders",
    next: Set<number>
  ) {
    if (
      type ===
      "products"
    ) {
      setSelectedProducts(
        next
      );
    } else {
      setSelectedOrders(
        next
      );
    }
  }

  function toggleOne(
    type:
      | "products"
      | "orders",
    id: number
  ) {
    const source =
      type ===
      "products"
        ? selectedProducts
        : selectedOrders;

    const next =
      new Set(source);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setSelection(
      type,
      next
    );
  }

  function toggleAllVisible() {
    if (
      activeTab ===
      "media"
    ) {
      return;
    }

    const next =
      new Set(selected);

    if (
      allVisibleSelected
    ) {
      for (
        const id of
        visibleIds
      ) {
        next.delete(id);
      }
    } else {
      for (
        const id of
        visibleIds
      ) {
        next.add(id);
      }
    }

    setSelection(
      activeTab,
      next
    );
  }

  async function restore(
    type:
      | "products"
      | "orders",
    ids: number[]
  ) {
    if (
      ids.length === 0 ||
      busyKey
    ) {
      return;
    }

    const feedbackId =
      `trash-restore-${type}`;

    setBusyKey(
      feedbackId
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        type ===
        "products"
          ? "Restoring products…"
          : "Restoring orders…",
      message:
        `${ids.length} selected`,
    });

    try {
      const response =
        await fetch(
          type ===
            "products"
            ? "/api/products/bulk-restore"
            : "/api/trash/orders",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                type ===
                  "products"
                  ? {
                      ids,
                    }
                  : {
                      action:
                        "restore",
                      ids,
                    }
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          readError(
            payload,
            "Restore failed."
          )
        );
      }

      if (
        type ===
        "products"
      ) {
        setProducts(
          (current) =>
            current.filter(
              (item) =>
                !ids.includes(
                  item.id
                )
            )
        );

        setSelectedProducts(
          new Set()
        );
      } else {
        setOrders(
          (current) =>
            current.filter(
              (item) =>
                !ids.includes(
                  item.id
                )
            )
        );

        setSelectedOrders(
          new Set()
        );
      }

      actionFeedback.success({
        id: feedbackId,
        title:
          type ===
          "products"
            ? "Products restored"
            : "Orders restored",
        message:
          type ===
          "orders"
            ? "Restored orders return to their previous status when available."
            : undefined,
        durationMs: 3000,
      });
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Restore failed",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setBusyKey(null);
    }
  }

  async function permanentlyDelete() {
    if (
      !pendingDelete ||
      busyKey
    ) {
      return;
    }

    const {
      type,
      ids,
    } =
      pendingDelete;

    const feedbackId =
      `trash-delete-${type}`;

    setBusyKey(
      feedbackId
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Deleting permanently…",
      message:
        `${ids.length} selected`,
    });

    try {
      const response =
        await fetch(
          type ===
            "products"
            ? "/api/products/bulk-delete"
            : "/api/trash/orders",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                type ===
                  "products"
                  ? {
                      ids,
                    }
                  : {
                      action:
                        "delete",
                      ids,
                    }
              ),
          }
        );

      const payload =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (!response.ok) {
        throw new Error(
          readError(
            payload,
            "Permanent delete failed."
          )
        );
      }

      if (
        type ===
        "products"
      ) {
        setProducts(
          (current) =>
            current.filter(
              (item) =>
                !ids.includes(
                  item.id
                )
            )
        );

        setSelectedProducts(
          new Set()
        );
      } else {
        setOrders(
          (current) =>
            current.filter(
              (item) =>
                !ids.includes(
                  item.id
                )
            )
        );

        setSelectedOrders(
          new Set()
        );
      }

      setPendingDelete(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Deleted permanently",
        message:
          `${ids.length} item${ids.length === 1 ? "" : "s"} removed.`,
        durationMs: 2800,
      });
    } catch (
      error
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Permanent delete failed",
        message:
          error instanceof
          Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setBusyKey(null);
    }
  }

  const isLoading =
    activeTab ===
    "products"
      ? productsLoading
      : activeTab ===
          "orders"
        ? ordersLoading
        : false;

  const activeError =
    activeTab ===
    "products"
      ? productsError
      : activeTab ===
          "orders"
        ? ordersError
        : null;

  const activeCount =
    activeTab ===
    "products"
      ? products.length
      : activeTab ===
          "orders"
        ? orders.length
        : 0;

  const activeVisibleCount =
    activeTab ===
    "products"
      ? filteredProducts.length
      : activeTab ===
          "orders"
        ? filteredOrders.length
        : 0;

  const selectedCount =
    selected.size;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white shadow-[0_8px_24px_rgba(38,51,95,0.05)]">
        <div className="bg-[#26366E] px-3 py-3 text-white md:px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F15E4A]">
              <Trash2 className="h-5 w-5" />
            </span>

            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-indigo-100/70">
                Recovery area
              </div>

              <div className="mt-0.5 text-base font-extrabold">
                Restore or permanently remove deleted items
              </div>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Trash categories"
          className="grid grid-cols-3 border-b border-[#E5E9F2] bg-[#F8FAFD]"
        >
          {TAB_ITEMS.map(
            (
              tab
            ) => {
              const Icon =
                tab.icon;

              const count =
                tab.value ===
                "products"
                  ? products.length
                  : tab.value ===
                      "orders"
                    ? orders.length
                    : 0;

              const active =
                activeTab ===
                tab.value;

              return (
                <button
                  key={
                    tab.value
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    active
                  }
                  onClick={() =>
                    changeTab(
                      tab.value
                    )
                  }
                  className={[
                    "ls-focus-ring relative flex min-h-14 min-w-0 items-center justify-center gap-1.5 px-2 text-xs font-extrabold transition md:min-h-16 md:text-sm",
                    active
                      ? "bg-white text-[#182451]"
                      : "text-muted-foreground hover:bg-white/70",
                  ].join(
                    " "
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />

                  <span className="truncate">
                    {
                      tab.label
                    }
                  </span>

                  <span
                    className={[
                      "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-extrabold",
                      active
                        ? "bg-[#FDE9E5] text-[#D84F3E]"
                        : "bg-[#E8ECF7] text-[#536079]",
                    ].join(
                      " "
                    )}
                  >
                    {tab.value ===
                    "media"
                      ? "—"
                      : count}
                  </span>

                  {active ? (
                    <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-t-full bg-[#F15E4A]" />
                  ) : null}
                </button>
              );
            }
          )}
        </div>

        {activeTab !==
        "media" ? (
          <div className="space-y-3 p-3 md:p-4">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={
                    activeTab ===
                    "products"
                      ? "Search title or SKU"
                      : "Search order, customer or email"
                  }
                  className="pl-10"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Refresh trash"
                title="Refresh trash"
                disabled={
                  isLoading
                }
                onClick={() =>
                  void (
                    activeTab ===
                    "products"
                      ? loadProducts()
                      : loadOrders()
                  )
                }
              >
                <RefreshCw
                  className={[
                    "h-4 w-4",
                    isLoading
                      ? "animate-spin"
                      : "",
                  ].join(
                    " "
                  )}
                />
              </Button>
            </div>

            <div className="flex min-h-10 items-center justify-between gap-3">
              <button
                type="button"
                onClick={
                  toggleAllVisible
                }
                disabled={
                  activeVisibleCount ===
                  0
                }
                className="ls-focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg px-1 text-xs font-bold text-muted-foreground disabled:opacity-40"
              >
                <Check className="h-4 w-4" />
                {allVisibleSelected
                  ? "Clear shown"
                  : "Select shown"}
              </button>

              <div className="text-xs font-semibold text-muted-foreground">
                {selectedCount >
                0
                  ? `${selectedCount} selected`
                  : query
                    ? `${activeVisibleCount} shown`
                    : `${activeCount} in trash`}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {activeError ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {activeError}
        </div>
      ) : null}

      {activeTab ===
      "media" ? (
        <section className="mt-3 overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white p-4 shadow-[0_8px_24px_rgba(38,51,95,0.05)] md:mt-4 md:p-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#FFF3F0] text-[#F15E4A]">
              <ImageIcon className="h-6 w-6" />
            </span>

            <h2 className="mt-4 text-lg font-extrabold text-[#182451]">
              Media trash requires restore support
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Product and order trash are fully restorable. Media deletion currently uses the existing permanent WordPress media-delete endpoint, so Media is intentionally not routed into Trash until a safe restore backend is available.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#EEF1FA] px-3 py-2 text-xs font-bold text-[#4059A7]">
              <Clock3 className="h-4 w-4" />
              Media tab reserved — no data is being hidden or faked
            </div>
          </div>
        </section>
      ) : isLoading ? (
        <div className="mt-3 space-y-2.5 md:mt-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : activeTab ===
          "products" ? (
        filteredProducts.length ===
        0 ? (
          <div className="mt-3 md:mt-4">
            <EmptyState
              icon={
                Trash2
              }
              title={
                products.length ===
                0
                  ? "Product trash is empty"
                  : "No matching products"
              }
              description={
                products.length ===
                0
                  ? "Deleted products will appear here."
                  : "Try a different search term."
              }
            />
          </div>
        ) : (
          <div className="mt-3 md:mt-4">
            <div className="space-y-2.5 md:hidden">
              {filteredProducts.map(
                (
                  item
                ) => {
                  const active =
                    selectedProducts.has(
                      item.id
                    );

                  return (
                    <article
                      key={
                        item.id
                      }
                      className={[
                        "rounded-2xl border bg-white p-3 shadow-[0_6px_18px_rgba(38,51,95,0.05)]",
                        active
                          ? "border-[#F15E4A] ring-2 ring-[#F15E4A]/10"
                          : "border-[#E1E6F0]",
                      ].join(
                        " "
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            toggleOne(
                              "products",
                              item.id
                            )
                          }
                          aria-pressed={
                            active
                          }
                          aria-label={
                            active
                              ? "Unselect product"
                              : "Select product"
                          }
                          className={[
                            "ls-focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                            active
                              ? "border-[#F15E4A] bg-[#F15E4A] text-white"
                              : "border-[#D8DEEA] bg-[#F8FAFD] text-muted-foreground",
                          ].join(
                            " "
                          )}
                        >
                          {active ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Box className="h-4 w-4" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold text-[#182451]">
                            {item.name ||
                              "(Untitled product)"}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>
                              SKU:{" "}
                              <strong className="font-bold text-foreground">
                                {item.sku ||
                                  "—"}
                              </strong>
                            </span>
                            <span>
                              {formatDate(
                                item.date
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            Boolean(
                              busyKey
                            )
                          }
                          onClick={() =>
                            void restore(
                              "products",
                              [
                                item.id,
                              ]
                            )
                          }
                        >
                          <ArchiveRestore className="h-4 w-4" />
                          Restore
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={
                            Boolean(
                              busyKey
                            )
                          }
                          onClick={() =>
                            setPendingDelete({
                              type:
                                "products",
                              ids: [
                                item.id,
                              ],
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white md:block">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F6FB] text-left text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-14 px-4 py-3">
                      Select
                    </th>
                    <th className="px-3 py-3">
                      Product
                    </th>
                    <th className="px-3 py-3">
                      SKU
                    </th>
                    <th className="px-3 py-3">
                      Deleted
                    </th>
                    <th className="px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E9ECF3]">
                  {filteredProducts.map(
                    (
                      item
                    ) => {
                      const active =
                        selectedProducts.has(
                          item.id
                        );

                      return (
                        <tr
                          key={
                            item.id
                          }
                        >
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggleOne(
                                  "products",
                                  item.id
                                )
                              }
                              className={[
                                "ls-focus-ring grid h-9 w-9 place-items-center rounded-xl border",
                                active
                                  ? "border-[#F15E4A] bg-[#F15E4A] text-white"
                                  : "border-[#D8DEEA] text-muted-foreground",
                              ].join(
                                " "
                              )}
                            >
                              {active ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Box className="h-4 w-4" />
                              )}
                            </button>
                          </td>

                          <td className="px-3 py-3 font-bold text-[#182451]">
                            {item.name ||
                              "(Untitled product)"}
                          </td>

                          <td className="px-3 py-3 text-muted-foreground">
                            {item.sku ||
                              "—"}
                          </td>

                          <td className="px-3 py-3 text-muted-foreground">
                            {formatDate(
                              item.date
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void restore(
                                    "products",
                                    [
                                      item.id,
                                    ]
                                  )
                                }
                              >
                                Restore
                              </Button>

                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() =>
                                  setPendingDelete({
                                    type:
                                      "products",
                                    ids: [
                                      item.id,
                                    ],
                                  })
                                }
                              >
                                Delete permanently
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredOrders.length ===
        0 ? (
        <div className="mt-3 md:mt-4">
          <EmptyState
            icon={Trash2}
            title={
              orders.length ===
              0
                ? "Order trash is empty"
                : "No matching orders"
            }
            description={
              orders.length ===
              0
                ? "Deleted orders will appear here."
                : "Try a different search term."
            }
          />
        </div>
      ) : (
        <div className="mt-3 md:mt-4">
          <div className="space-y-2.5 md:hidden">
            {filteredOrders.map(
              (
                item
              ) => {
                const active =
                  selectedOrders.has(
                    item.id
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className={[
                      "rounded-2xl border bg-white p-3 shadow-[0_6px_18px_rgba(38,51,95,0.05)]",
                      active
                        ? "border-[#F15E4A] ring-2 ring-[#F15E4A]/10"
                        : "border-[#E1E6F0]",
                    ].join(
                      " "
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleOne(
                            "orders",
                            item.id
                          )
                        }
                        className={[
                          "ls-focus-ring grid h-9 w-9 shrink-0 place-items-center rounded-xl border",
                          active
                            ? "border-[#F15E4A] bg-[#F15E4A] text-white"
                            : "border-[#D8DEEA] bg-[#F8FAFD] text-muted-foreground",
                        ].join(
                          " "
                        )}
                      >
                        {active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-extrabold text-[#182451]">
                              Order #
                              {item.number ||
                                item.id}
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                              {item.customer}
                            </div>
                          </div>

                          <div className="shrink-0 text-right text-sm font-extrabold text-[#182451]">
                            {formatMoney(
                              item.total,
                              item.currency
                            )}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                          <span className="rounded-full bg-[#EEF1FA] px-2 py-1">
                            {item.itemCount ||
                              0}{" "}
                            item
                            {(item.itemCount ||
                              0) ===
                            1
                              ? ""
                              : "s"}
                          </span>

                          <span className="rounded-full bg-[#FFF3F0] px-2 py-1">
                            Restore:{" "}
                            {item.previousStatus ||
                              "Pending"}
                          </span>

                          <span className="rounded-full bg-[#F4F6FB] px-2 py-1">
                            {formatDate(
                              item.date
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          Boolean(
                            busyKey
                          )
                        }
                        onClick={() =>
                          void restore(
                            "orders",
                            [
                              item.id,
                            ]
                          )
                        }
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Restore
                      </Button>

                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={
                          Boolean(
                            busyKey
                          )
                        }
                        onClick={() =>
                          setPendingDelete({
                            type:
                              "orders",
                            ids: [
                              item.id,
                            ],
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </article>
                );
              }
            )}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[#E1E6F0] bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FB] text-left text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-14 px-4 py-3">
                    Select
                  </th>
                  <th className="px-3 py-3">
                    Order
                  </th>
                  <th className="px-3 py-3">
                    Customer
                  </th>
                  <th className="px-3 py-3">
                    Total
                  </th>
                  <th className="px-3 py-3">
                    Restore status
                  </th>
                  <th className="px-3 py-3">
                    Deleted
                  </th>
                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E9ECF3]">
                {filteredOrders.map(
                  (
                    item
                  ) => {
                    const active =
                      selectedOrders.has(
                        item.id
                      );

                    return (
                      <tr
                        key={
                          item.id
                        }
                      >
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              toggleOne(
                                "orders",
                                item.id
                              )
                            }
                            className={[
                              "ls-focus-ring grid h-9 w-9 place-items-center rounded-xl border",
                              active
                                ? "border-[#F15E4A] bg-[#F15E4A] text-white"
                                : "border-[#D8DEEA] text-muted-foreground",
                            ].join(
                              " "
                            )}
                          >
                            {active ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <ShoppingBag className="h-4 w-4" />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-3 font-extrabold text-[#182451]">
                          #
                          {item.number ||
                            item.id}
                        </td>

                        <td className="px-3 py-3">
                          <div className="font-bold text-foreground">
                            {item.customer}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {item.email ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-3 py-3 font-bold text-[#182451]">
                          {formatMoney(
                            item.total,
                            item.currency
                          )}
                        </td>

                        <td className="px-3 py-3 capitalize text-muted-foreground">
                          {item.previousStatus ||
                            "pending"}
                        </td>

                        <td className="px-3 py-3 text-muted-foreground">
                          {formatDate(
                            item.date
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void restore(
                                  "orders",
                                  [
                                    item.id,
                                  ]
                                )
                              }
                            >
                              Restore
                            </Button>

                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() =>
                                setPendingDelete({
                                  type:
                                    "orders",
                                  ids: [
                                    item.id,
                                  ],
                                })
                              }
                            >
                              Delete permanently
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab !==
        "media" &&
      selectedCount >
        0 ? (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+var(--ls-safe-area-bottom))] z-50 border-t border-[#D8DEEA] bg-white/95 px-3 py-2.5 shadow-[0_-10px_30px_rgba(17,27,63,0.12)] backdrop-blur md:static md:mt-4 md:rounded-2xl md:border md:px-4 md:shadow-none">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-[#182451]">
                {
                  selectedCount
                }{" "}
                selected
              </div>
              <div className="hidden text-xs text-muted-foreground md:block">
                Restore or permanently remove the selected items.
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <AsyncButton
                size="sm"
                variant="outline"
                loading={
                  busyKey ===
                  `trash-restore-${activeTab}`
                }
                loadingLabel="Restoring…"
                disabled={
                  Boolean(
                    busyKey
                  )
                }
                onClick={() =>
                  void restore(
                    activeTab,
                    Array.from(
                      selected
                    )
                  )
                }
              >
                <ArchiveRestore className="h-4 w-4" />
                Restore
              </AsyncButton>

              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={
                  Boolean(
                    busyKey
                  )
                }
                onClick={() =>
                  setPendingDelete({
                    type:
                      activeTab,
                    ids:
                      Array.from(
                        selected
                      ),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={
          pendingDelete !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (
            !open &&
            !busyKey
          ) {
            setPendingDelete(
              null
            );
          }
        }}
        title="Delete permanently?"
        description={
          pendingDelete
            ? `${pendingDelete.ids.length} item${pendingDelete.ids.length === 1 ? "" : "s"} will be permanently removed. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete permanently"
        loading={
          Boolean(
            pendingDelete &&
            busyKey ===
              `trash-delete-${pendingDelete.type}`
          )
        }
        loadingLabel="Deleting…"
        destructive
        onConfirm={
          permanentlyDelete
        }
      />
    </>
  );
}
