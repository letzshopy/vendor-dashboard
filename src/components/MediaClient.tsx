"use client";

import {
  Dialog,
} from "@base-ui/react/dialog";
import {
  Check,
  Clipboard,
  File,
  Grid2X2,
  Images,
  List,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import ImageUploader from "@/components/ImageUploader";
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

type MediaItem = {
  id: number;
  url: string;
  title: string;
  filename: string;
  mime: string;
  size_kb?: number;
  uploaded?: string;
  width?: number;
  height?: number;
  attached_to?:
    | string
    | null;
  thumbnail?: string;
};

type ViewMode =
  | "grid"
  | "list";

type FilterType =
  | "all"
  | "image"
  | "video"
  | "doc";

const FILTERS: Array<{
  value: FilterType;
  label: string;
}> = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "image",
    label: "Images",
  },
  {
    value: "video",
    label: "Videos",
  },
  {
    value: "doc",
    label: "Documents",
  },
];

async function fetchMedia(
  query = "",
  type: FilterType =
    "all",
  signal?: AbortSignal
) {
  const params =
    new URLSearchParams();

  if (query) {
    params.set(
      "q",
      query
    );
  }

  if (type !== "all") {
    params.set(
      "type",
      type
    );
  }

  const response =
    await fetch(
      `/api/media/list?${params.toString()}`,
      {
        cache: "no-store",
        signal,
      }
    );

  if (!response.ok) {
    let message =
      `Failed to load media (${response.status})`;

    try {
      const payload =
        await response.json();

      if (
        payload?.error
      ) {
        message =
          payload.error;
      }
    } catch {
      // Keep the status fallback.
    }

    throw new Error(
      message
    );
  }

  const payload =
    await response.json();

  return Array.isArray(
    payload?.items
  )
    ? (payload.items as MediaItem[])
    : [];
}

async function deleteMany(
  ids: number[]
) {
  const response =
    await fetch(
      "/api/media/delete",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            ids,
          }),
      }
    );

  if (!response.ok) {
    let message =
      `Delete failed (${response.status})`;

    try {
      const payload =
        await response.json();

      if (
        payload?.error
      ) {
        message =
          payload.error;
      }
    } catch {
      // Keep the status fallback.
    }

    throw new Error(
      message
    );
  }
}

function humanMime(
  mime: string
) {
  if (!mime) {
    return "File";
  }

  const [group] =
    mime.split("/");

  if (
    group === "image"
  ) {
    return "Image";
  }

  if (
    group === "video"
  ) {
    return "Video";
  }

  if (
    group === "audio"
  ) {
    return "Audio";
  }

  if (
    group ===
    "application"
  ) {
    return "Document";
  }

  return (
    group
      .charAt(0)
      .toUpperCase() +
    group.slice(1)
  );
}

function MediaThumb({
  item,
  className,
}: {
  item: MediaItem;
  className: string;
}) {
  if (
    item.mime.startsWith(
      "image/"
    ) ||
    item.thumbnail
  ) {
    return (
      // Remote WordPress media URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={
          item.thumbnail ||
          item.url
        }
        alt={
          item.title ||
          item.filename
        }
        className={
          className
        }
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={
        `${className} grid place-items-center bg-muted text-muted-foreground`
      }
    >
      <File className="h-6 w-6" />
    </div>
  );
}

function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {Array.from({
        length: 12,
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function MediaClient({
  defaultView = "grid",
}: {
  defaultView?: ViewMode;
}) {
  const [
    items,
    setItems,
  ] =
    useState<MediaItem[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [query, setQuery] =
    useState("");

  const [
    debouncedQuery,
    setDebouncedQuery,
  ] =
    useState("");

  const [type, setType] =
    useState<FilterType>(
      "all"
    );

  const [view, setView] =
    useState<ViewMode>(
      defaultView
    );

  const [
    selected,
    setSelected,
  ] =
    useState<Set<number>>(
      new Set()
    );

  const [
    preview,
    setPreview,
  ] =
    useState<MediaItem | null>(
      null
    );

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const [
    copiedId,
    setCopiedId,
  ] =
    useState<number | null>(
      null
    );

  const [
    perPage,
    setPerPage,
  ] =
    useState(24);

  const [page, setPage] =
    useState(1);

  const [
    reloadKey,
    setReloadKey,
  ] =
    useState(0);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () =>
          setDebouncedQuery(
            query.trim()
          ),
        280
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [query]);

  useEffect(() => {
    const controller =
      new AbortController();

    let alive = true;

    setLoading(true);
    setError(null);
    setSelected(
      new Set()
    );

    void fetchMedia(
      debouncedQuery,
      type,
      controller.signal
    )
      .then((data) => {
        if (!alive) {
          return;
        }

        setItems(data);
        setPage(1);
      })
      .catch(
        (
          caught: unknown
        ) => {
          if (
            !alive ||
            (
              caught instanceof
                DOMException &&
              caught.name ===
                "AbortError"
            )
          ) {
            return;
          }

          setError(
            caught instanceof
              Error
              ? caught.message
              : "Failed to load media"
          );
        }
      )
      .finally(() => {
        if (alive) {
          setLoading(
            false
          );
        }
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [
    debouncedQuery,
    type,
    reloadKey,
  ]);

  useEffect(() => {
    setPage(1);
  }, [perPage]);

  const totalItems =
    items.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalItems /
          perPage
      )
    );

  const currentPage =
    Math.min(
      page,
      totalPages
    );

  const startIndex =
    totalItems === 0
      ? 0
      : (
          currentPage -
          1
        ) *
        perPage;

  const endIndex =
    Math.min(
      startIndex +
        perPage,
      totalItems
    );

  const pageItems =
    useMemo(
      () =>
        totalItems ===
        0
          ? []
          : items.slice(
              startIndex,
              endIndex
            ),
      [
        items,
        startIndex,
        endIndex,
        totalItems,
      ]
    );

  const selectedArray =
    useMemo(
      () =>
        Array.from(
          selected
        ),
      [selected]
    );

  const selectedCount =
    selectedArray.length;

  function reload() {
    setReloadKey(
      (value) =>
        value + 1
    );
  }

  function toggle(
    id: number
  ) {
    setSelected(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(id)
        ) {
          next.delete(
            id
          );
        } else {
          next.add(
            id
          );
        }

        return next;
      }
    );
  }

  function togglePage() {
    if (
      pageItems.length ===
      0
    ) {
      return;
    }

    const everySelected =
      pageItems.every(
        (item) =>
          selected.has(
            item.id
          )
      );

    setSelected(
      (current) => {
        const next =
          new Set(
            current
          );

        for (
          const item of
          pageItems
        ) {
          if (
            everySelected
          ) {
            next.delete(
              item.id
            );
          } else {
            next.add(
              item.id
            );
          }
        }

        return next;
      }
    );
  }

  async function bulkDelete() {
    if (
      selectedCount ===
      0 ||
      deleting
    ) {
      return;
    }

    const feedbackId =
      "media-bulk-delete";

    setDeleting(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Deleting media…",
      message:
        `${selectedCount} file${selectedCount === 1 ? "" : "s"}`,
    });

    try {
      await deleteMany(
        selectedArray
      );

      setDeleteOpen(
        false
      );
      setSelected(
        new Set()
      );
      reload();

      actionFeedback.success({
        id: feedbackId,
        title:
          "Media deleted",
        durationMs: 2200,
      });
    } catch (
      caught: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not delete media",
        message:
          caught instanceof
            Error
            ? caught.message
            : "Delete failed.",
        durationMs: 4200,
      });
    } finally {
      setDeleting(false);
    }
  }

  async function copyUrl(
    id: number,
    url: string
  ) {
    try {
      await navigator.clipboard.writeText(
        url
      );

      setCopiedId(
        id
      );

      window.setTimeout(
        () => {
          setCopiedId(
            (current) =>
              current === id
                ? null
                : current
          );
        },
        1800
      );
    } catch {
      actionFeedback.error({
        id:
          `media-copy-${id}`,
        title:
          "Could not copy URL",
        durationMs: 2400,
      });
    }
  }

  const fromLabel =
    totalItems === 0
      ? 0
      : startIndex + 1;

  const toLabel =
    endIndex;

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div className="min-w-0">
          <span className="text-[21px] font-extrabold tracking-tight text-heading md:text-base">
            {totalItems}
          </span>

          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            file
            {totalItems === 1
              ? ""
              : "s"}
          </span>
        </div>

        <ImageUploader
          purpose="media_library"
          multiple
          label="Upload media"
          onUploaded={async () => {
            reload();
          }}
        />
      </div>

      <div className="mt-3 flex min-w-0 flex-col gap-3 md:mt-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(
                event
              ) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search media"
              aria-label="Search media"
              className="pl-10"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={reload}
            aria-label="Refresh media"
            title="Refresh media"
          >
            <RefreshCw
              className={
                `h-4 w-4 ${loading ? "animate-spin" : ""}`
              }
            />
          </Button>

          <div className="hidden items-center rounded-xl border border-border bg-card p-1 md:flex">
            <button
              type="button"
              onClick={() =>
                setView(
                  "grid"
                )
              }
              aria-label="Grid view"
              aria-pressed={
                view === "grid"
              }
              className={
                `ls-focus-ring grid h-9 w-9 place-items-center rounded-lg transition ${view === "grid" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`
              }
            >
              <Grid2X2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setView(
                  "list"
                )
              }
              aria-label="List view"
              aria-pressed={
                view === "list"
              }
              className={
                `ls-focus-ring grid h-9 w-9 place-items-center rounded-lg transition ${view === "list" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted"}`
              }
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map(
            (
              filter
            ) => (
              <button
                key={
                  filter.value
                }
                type="button"
                onClick={() =>
                  setType(
                    filter.value
                  )
                }
                className={
                  `ls-focus-ring min-h-9 shrink-0 rounded-full px-3 text-xs font-bold transition ${type === filter.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:brightness-95"}`
                }
              >
                {
                  filter.label
                }
              </button>
            )
          )}
        </div>

        {selectedCount >
        0 ? (
          <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-secondary px-3 py-2">
            <button
              type="button"
              onClick={
                togglePage
              }
              className="ls-focus-ring inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-secondary-foreground"
            >
              <Check className="h-4 w-4" />
              {selectedCount} selected
            </button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() =>
                setDeleteOpen(
                  true
                )
              }
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        ) : totalItems >
          0 ? (
          <button
            type="button"
            onClick={
              togglePage
            }
            className="ls-focus-ring self-start rounded-xl px-1 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Select page
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <MediaGridSkeleton />
        ) : totalItems ===
          0 ? (
          <EmptyState
            icon={Images}
            title="No media found"
            description={
              query ||
              type !== "all"
                ? "Try a different search or filter."
                : "Upload your first store image."
            }
          />
        ) : view ===
            "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {pageItems.map(
              (
                item
              ) => {
                const active =
                  selected.has(
                    item.id
                  );

                return (
                  <article
                    key={
                      item.id
                    }
                    className={
                      `group overflow-hidden rounded-2xl border bg-card transition ${active ? "border-primary ring-2 ring-primary/10" : "border-border hover:border-primary/30"}`
                    }
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview(
                            item
                          )
                        }
                        className="block h-full w-full"
                        aria-label={
                          `Preview ${item.title || item.filename}`
                        }
                      >
                        <MediaThumb
                          item={item}
                          className="h-full w-full object-cover"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggle(
                            item.id
                          )
                        }
                        aria-label={
                          active
                            ? `Unselect ${item.title || item.filename}`
                            : `Select ${item.title || item.filename}`
                        }
                        aria-pressed={
                          active
                        }
                        className={
                          `ls-focus-ring absolute left-2 top-2 grid h-8 w-8 place-items-center rounded-full border shadow-sm backdrop-blur ${active ? "border-primary bg-primary text-primary-foreground" : "border-white/80 bg-white/90 text-slate-500"}`
                        }
                      >
                        {active ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded-full border border-current" />
                        )}
                      </button>

                      <span className="absolute right-2 top-2 rounded-full bg-slate-950/65 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        {humanMime(
                          item.mime
                        )}
                      </span>
                    </div>

                    <div className="min-w-0 p-3">
                      <div
                        className="truncate text-sm font-bold text-heading"
                        title={
                          item.title ||
                          item.filename
                        }
                      >
                        {item.title ||
                          item.filename ||
                          "(untitled)"}
                      </div>

                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {
                          item.filename
                        }
                      </div>

                      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-muted-foreground">
                          {item.size_kb
                            ? `${item.size_kb} KB`
                            : humanMime(
                                item.mime
                              )}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            void copyUrl(
                              item.id,
                              item.url
                            )
                          }
                          className="ls-focus-ring inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-bold text-primary hover:bg-secondary"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                          {copiedId ===
                          item.id
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="w-14 px-4 py-3">
                    Select
                  </th>
                  <th className="px-3 py-3">
                    File
                  </th>
                  <th className="px-3 py-3">
                    Type
                  </th>
                  <th className="px-3 py-3">
                    Size
                  </th>
                  <th className="px-3 py-3">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {pageItems.map(
                  (
                    item
                  ) => {
                    const active =
                      selected.has(
                        item.id
                      );

                    return (
                      <tr
                        key={
                          item.id
                        }
                        className="transition hover:bg-muted/50"
                      >
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() =>
                              toggle(
                                item.id
                              )
                            }
                            aria-pressed={
                              active
                            }
                            aria-label={
                              active
                                ? "Unselect file"
                                : "Select file"
                            }
                            className={
                              `ls-focus-ring grid h-9 w-9 place-items-center rounded-xl border ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"}`
                            }
                          >
                            {active ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="h-3.5 w-3.5 rounded-full border border-current" />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <MediaThumb
                              item={item}
                              className="h-11 w-11 shrink-0 rounded-xl object-cover"
                            />

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreview(
                                    item
                                  )
                                }
                                className="block max-w-[24rem] truncate text-left font-bold text-heading hover:text-primary"
                              >
                                {item.title ||
                                  item.filename ||
                                  "(untitled)"}
                              </button>

                              <div className="mt-0.5 max-w-[24rem] truncate text-xs text-muted-foreground">
                                {
                                  item.filename
                                }
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3.5 text-muted-foreground">
                          {humanMime(
                            item.mime
                          )}
                        </td>

                        <td className="px-3 py-3.5 text-muted-foreground">
                          {item.size_kb
                            ? `${item.size_kb} KB`
                            : "—"}
                        </td>

                        <td className="px-3 py-3.5 text-muted-foreground">
                          {item.uploaded ||
                            "—"}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPreview(
                                  item
                                )
                              }
                            >
                              Preview
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                void copyUrl(
                                  item.id,
                                  item.url
                                )
                              }
                            >
                              <Clipboard className="h-3.5 w-3.5" />
                              {copiedId ===
                              item.id
                                ? "Copied"
                                : "Copy URL"}
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
        )}
      </div>

      {totalItems >
      0 ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing{" "}
            <span className="font-bold text-foreground">
              {fromLabel}–
              {toLabel}
            </span>{" "}
            of{" "}
            <span className="font-bold text-foreground">
              {totalItems}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              <span>
                Per page
              </span>

              <select
                value={
                  perPage
                }
                onChange={(
                  event
                ) =>
                  setPerPage(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="ls-focus-ring h-10 rounded-xl border border-input bg-card px-2 text-xs font-semibold text-foreground"
              >
                <option
                  value={12}
                >
                  12
                </option>
                <option
                  value={24}
                >
                  24
                </option>
                <option
                  value={48}
                >
                  48
                </option>
                <option
                  value={96}
                >
                  96
                </option>
              </select>
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                currentPage <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current -
                        1
                    )
                )
              }
            >
              Previous
            </Button>

            <span className="min-w-16 text-center font-semibold text-foreground">
              {currentPage}/
              {totalPages}
            </span>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                currentPage >=
                totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current +
                        1
                    )
                )
              }
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(
          open
        ) => {
          if (!deleting) {
            setDeleteOpen(
              open
            );
          }
        }}
        title="Delete selected media?"
        description={
          selectedCount >
          0
            ? `Delete ${selectedCount} selected file${selectedCount === 1 ? "" : "s"}? This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete media"
        loading={deleting}
        loadingLabel="Deleting…"
        destructive
        onConfirm={
          bulkDelete
        }
      />

      <Dialog.Root
        open={
          preview !== null
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            setPreview(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="ls-overlay" />

          <Dialog.Viewport className="ls-dialog-viewport">
            <Dialog.Popup className="ls-dialog-popup !w-[min(96vw,60rem)]">
              {preview ? (
                <div className="max-h-[88dvh] overflow-y-auto">
                  <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:px-5">
                    <div className="min-w-0 flex-1">
                      <Dialog.Title className="truncate text-base font-bold text-heading">
                        {preview.title ||
                          preview.filename ||
                          `Media #${preview.id}`}
                      </Dialog.Title>

                      <Dialog.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                        {
                          preview.filename
                        }
                      </Dialog.Description>
                    </div>

                    <Dialog.Close
                      aria-label="Close preview"
                      className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>

                  <div className="bg-slate-950/5 p-3 md:p-5">
                    {preview.mime.startsWith(
                      "image/"
                    ) ? (
                      // Remote WordPress media URL.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          preview.url
                        }
                        alt={
                          preview.title ||
                          preview.filename
                        }
                        className="mx-auto max-h-[62dvh] w-auto max-w-full rounded-xl object-contain"
                      />
                    ) : (
                      <div className="grid min-h-64 place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
                        Preview unavailable for this file type.
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 px-4 py-4 text-xs text-muted-foreground md:grid-cols-2 md:px-5">
                    <div>
                      <span className="font-bold text-foreground">
                        Type:
                      </span>{" "}
                      {preview.mime}
                    </div>

                    <div className="md:text-right">
                      <span className="font-bold text-foreground">
                        Size:
                      </span>{" "}
                      {preview.size_kb
                        ? `${preview.size_kb} KB`
                        : "—"}
                    </div>

                    {preview.width &&
                    preview.height ? (
                      <div>
                        <span className="font-bold text-foreground">
                          Dimensions:
                        </span>{" "}
                        {
                          preview.width
                        }{" "}
                        ×{" "}
                        {
                          preview.height
                        }{" "}
                        px
                      </div>
                    ) : null}

                    <div className="flex justify-start md:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void copyUrl(
                            preview.id,
                            preview.url
                          )
                        }
                      >
                        <Clipboard className="h-3.5 w-3.5" />
                        {copiedId ===
                        preview.id
                          ? "Copied"
                          : "Copy URL"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
