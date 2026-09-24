"use client";

import {
  Clapperboard,
  Film,
  ImagePlus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import ShoppableVideoEditModal from "@/components/ShoppableVideoEditModal";
import {
  useUnsavedChanges,
} from "@/components/navigation/UnsavedChangesGuard";
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

type ExistingStory = {
  story_id: number;
  title: string;
  thumbnail: string;
  video_url: string;
  media_id: number;
  created_at: string;
  managed: boolean;
  thumbnail_media_id?: number;
  product_ids?: number[];
  category_ids?: number[];
  tagged_products?: Product[];
  tagged_categories?: Category[];
  oos_since?: string;
};

type Status = {
  ok: boolean;
  status: string;
  message?: string;
  group_id: number;
  group_name?: string;
  existing_count?: number;
  legacy_count?: number;
  publish_enabled?: boolean;
  max_homepage_videos?: number;
  max_upload_bytes?: number;
  allowed_mime_types?: string[];
  items?: ExistingStory[];
};

type Product = {
  id: number;
  name: string;
  thumbnail: string;
  in_stock: boolean;
};

type Category = {
  id: number;
  name: string;
};

type SearchResults<T> = {
  items: T[];
};

type ActionResponse =
  Record<string, unknown> & {
    ok?: boolean;
    error?: string;
    message?: string;
  };

type UploadTicket =
  ActionResponse & {
    upload_url?: string;
    max_upload_bytes?: number;
  };

type UploadResponse = {
  ok?: boolean;
  media_id?: number;
  url?: string;
  error?: string;
  message?: string;
};

function messageFrom(
  value: unknown,
  fallback: string
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(value)
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    if (
      typeof record.error ===
        "string" &&
      record.error.trim()
    ) {
      return record.error;
    }

    if (
      typeof record.message ===
        "string" &&
      record.message.trim()
    ) {
      return record.message;
    }
  }

  return fallback;
}

async function readBridge<T>(
  type:
    | "status"
    | "products"
    | "categories",
  query = ""
): Promise<T> {
  const params =
    new URLSearchParams({
      type,
    });

  if (query) {
    params.set(
      "q",
      query
    );
  }

  const response =
    await fetch(
      `/api/shoppable-videos/bridge?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

  const body: unknown =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok ||
    !body ||
    typeof body !==
      "object"
  ) {
    throw new Error(
      messageFrom(
        body,
        "The store's shoppable video bridge is not ready."
      )
    );
  }

  return body as T;
}

async function runAction<
  T extends ActionResponse,
>(
  action:
    | "ticket"
    | "publish"
    | "update"
    | "adopt"
    | "delete",
  payload: Record<
    string,
    unknown
  > = {}
): Promise<T> {
  const response =
    await fetch(
      "/api/shoppable-videos/bridge",
      {
        method:
          "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        cache: "no-store",
        body:
          JSON.stringify({
            action,
            ...payload,
          }),
      }
    );

  const body: unknown =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok ||
    !body ||
    typeof body !==
      "object"
  ) {
    throw new Error(
      messageFrom(
        body,
        "The shoppable video action could not be completed."
      )
    );
  }

  return body as T;
}

function formatBytes(
  bytes: number
) {
  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <= 0
  ) {
    return "";
  }

  const mb =
    bytes /
    (1024 * 1024);

  return mb >= 1
    ? `${mb.toFixed(
        mb >= 10 ? 0 : 1
      )} MB`
    : `${Math.round(
        bytes / 1024
      )} KB`;
}

async function uploadStoreAsset(
  file: File,
  kind:
    | "video"
    | "thumbnail"
) {
  const ticket =
    await runAction<UploadTicket>(
      "ticket",
      { kind }
    );

  if (
    !ticket.upload_url
  ) {
    throw new Error(
      "The store did not return an upload destination."
    );
  }

  const maxBytes =
    Number(
      ticket.max_upload_bytes ||
        0
    );

  if (
    maxBytes > 0 &&
    file.size >
      maxBytes
  ) {
    throw new Error(
      `File must be ${formatBytes(
        maxBytes
      )} or smaller.`
    );
  }

  const body =
    new FormData();

  body.append(
    "file",
    file,
    file.name.slice(
      0,
      180
    )
  );

  const response =
    await fetch(
      ticket.upload_url,
      {
        method:
          "POST",
        body,
        mode: "cors",
        cache:
          "no-store",
      }
    );

  const result: unknown =
    await response
      .json()
      .catch(
        () => null
      );

  if (
    !response.ok ||
    !result ||
    typeof result !==
      "object"
  ) {
    throw new Error(
      messageFrom(
        result,
        "File upload failed."
      )
    );
  }

  const upload =
    result as UploadResponse;

  const mediaId =
    Number(
      upload.media_id ||
        0
    );

  if (
    !Number.isInteger(
      mediaId
    ) ||
    mediaId <= 0
  ) {
    throw new Error(
      "Upload returned an invalid media ID."
    );
  }

  return mediaId;
}

function FeedSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({
        length: 6,
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={index}
            className="flex min-h-28 items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <Skeleton className="h-24 w-16 shrink-0 rounded-xl" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function ShoppableVideosClient() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const thumbnailInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const legacyAdoptionAttemptedRef =
    useRef(false);

  const [
    status,
    setStatus,
  ] =
    useState<Status | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    statusError,
    setStatusError,
  ] =
    useState("");

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    addOpen,
    setAddOpen,
  ] =
    useState(false);

  const [
    closeDraftOpen,
    setCloseDraftOpen,
  ] =
    useState(false);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<ExistingStory | null>(
      null
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    thumbnailFile,
    setThumbnailFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    editingStory,
    setEditingStory,
  ] =
    useState<ExistingStory | null>(
      null
    );

  const [
    productQuery,
    setProductQuery,
  ] =
    useState("");

  const [
    categoryQuery,
    setCategoryQuery,
  ] =
    useState("");

  const [
    products,
    setProducts,
  ] =
    useState<Product[]>(
      []
    );

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>(
      []
    );

  const [
    selectedProducts,
    setSelectedProducts,
  ] =
    useState<Product[]>(
      []
    );

  const [
    selectedCategories,
    setSelectedCategories,
  ] =
    useState<Category[]>(
      []
    );

  const maxBytes =
    status?.max_upload_bytes ||
    0;

  const publishReady =
    Boolean(status?.ok) &&
    (
      status?.legacy_count ||
      0
    ) === 0;

  const hasTags =
    selectedProducts.length >
      0 ||
    selectedCategories.length >
      0;

  const draftDirty =
    addOpen &&
    Boolean(
      title.trim() ||
      selectedFile ||
      thumbnailFile ||
      selectedProducts.length ||
      selectedCategories.length
    );

  const canPublish =
    publishReady &&
    Boolean(
      selectedFile
    ) &&
    hasTags &&
    !busy;

  const existingCount =
    status?.existing_count ??
    status?.items?.length ??
    0;

  const maxVideos =
    status?.max_homepage_videos ??
    10;

  const loadStatus =
    useCallback(
      async () => {
        setLoading(true);
        setStatusError("");

        try {
          const next =
            await readBridge<Status>(
              "status"
            );

          setStatus(next);
        } catch (
          error: unknown
        ) {
          setStatusError(
            error instanceof
              Error
              ? error.message
              : "Could not load shoppable videos."
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const legacyCount =
      status?.ok
        ? status.legacy_count ||
          0
        : 0;

    if (
      legacyCount <= 0 ||
      legacyAdoptionAttemptedRef.current
    ) {
      return;
    }

    legacyAdoptionAttemptedRef.current =
      true;

    let active = true;

    void (async () => {
      setBusy(true);

      actionFeedback.loading({
        id:
          "shoppable-video-adopt",
        title:
          "Preparing shoppable videos…",
      });

      try {
        await runAction<ActionResponse>(
          "adopt"
        );

        if (active) {
          await loadStatus();

          actionFeedback.success({
            id:
              "shoppable-video-adopt",
            title:
              "Shoppable videos ready",
            durationMs: 1800,
          });
        }
      } catch (
        error: unknown
      ) {
        if (active) {
          actionFeedback.error({
            id:
              "shoppable-video-adopt",
            title:
              "Could not finish setup",
            message:
              error instanceof
                Error
                ? error.message
                : "Shoppable video setup could not be completed.",
            durationMs: 4200,
          });
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    status,
    loadStatus,
  ]);

  useEffect(() => {
    if (
      productQuery
        .trim()
        .length < 2
    ) {
      setProducts([]);
      return;
    }

    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await readBridge<
                SearchResults<Product>
              >(
                "products",
                productQuery.trim()
              );

            if (active) {
              setProducts(
                response.items ||
                  []
              );
            }
          } catch {
            if (active) {
              setProducts([]);
            }
          }
        },
        300
      );

    return () => {
      active = false;

      window.clearTimeout(
        timer
      );
    };
  }, [productQuery]);

  useEffect(() => {
    let active = true;

    const timer =
      window.setTimeout(
        async () => {
          try {
            const response =
              await readBridge<
                SearchResults<Category>
              >(
                "categories",
                categoryQuery.trim()
              );

            if (active) {
              setCategories(
                response.items ||
                  []
              );
            }
          } catch {
            if (active) {
              setCategories([]);
            }
          }
        },
        300
      );

    return () => {
      active = false;

      window.clearTimeout(
        timer
      );
    };
  }, [categoryQuery]);

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          selectedProducts.map(
            (product) =>
              product.id
          )
        ),
      [selectedProducts]
    );

  const selectedCategoryIds =
    useMemo(
      () =>
        new Set(
          selectedCategories.map(
            (category) =>
              category.id
          )
        ),
      [
        selectedCategories,
      ]
    );

  function resetDraft() {
    setSelectedFile(null);
    setThumbnailFile(null);
    setTitle("");
    setSelectedProducts([]);
    setSelectedCategories([]);
    setProductQuery("");
    setCategoryQuery("");
    setProducts([]);
    setCategories([]);

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }

    if (
      thumbnailInputRef.current
    ) {
      thumbnailInputRef.current.value =
        "";
    }
  }

  function selectFile(
    file: File | null
  ) {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !==
        "video/mp4" &&
      !file.name
        .toLowerCase()
        .endsWith(
          ".mp4"
        )
    ) {
      setSelectedFile(null);

      actionFeedback.error({
        id:
          "shoppable-video-file",
        title:
          "Select an MP4 video",
        message:
          "MP4 (H.264/AAC) is recommended for reliable iPhone and Android playback.",
        durationMs: 4200,
      });

      return;
    }

    if (
      maxBytes > 0 &&
      file.size >
        maxBytes
    ) {
      setSelectedFile(null);

      actionFeedback.error({
        id:
          "shoppable-video-file",
        title:
          "Video is too large",
        message:
          `Maximum size is ${formatBytes(
            maxBytes
          )}.`,
        durationMs: 4200,
      });

      return;
    }

    setSelectedFile(file);

    if (!title.trim()) {
      setTitle(
        file.name
          .replace(
            /\.mp4$/i,
            ""
          )
          .replace(
            /[-_]+/g,
            " "
          )
          .slice(
            0,
            180
          )
      );
    }
  }

  function selectThumbnail(
    file: File | null
  ) {
    if (!file) {
      setThumbnailFile(
        null
      );
      return;
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(
        file.type
      )
    ) {
      setThumbnailFile(
        null
      );

      actionFeedback.error({
        id:
          "shoppable-thumbnail-file",
        title:
          "Unsupported thumbnail",
        message:
          "Use JPG, PNG or WebP.",
        durationMs: 3200,
      });

      return;
    }

    setThumbnailFile(file);
  }

  async function publishVideo(): Promise<boolean> {
    if (busy) {
      return false;
    }

    if (
      !publishReady
    ) {
      actionFeedback.warning({
        id:
          "shoppable-video-publish",
        title:
          "Store is still preparing",
        durationMs: 2600,
      });

      return false;
    }

    if (!selectedFile) {
      actionFeedback.warning({
        id:
          "shoppable-video-publish",
        title:
          "Choose an MP4 video",
        durationMs: 2600,
      });

      return false;
    }

    if (!hasTags) {
      actionFeedback.warning({
        id:
          "shoppable-video-publish",
        title:
          "Tag a product or category",
        durationMs: 2600,
      });

      return false;
    }

    const feedbackId =
      "shoppable-video-publish";

    setBusy(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Uploading video…",
    });

    try {
      const mediaId =
        await uploadStoreAsset(
          selectedFile,
          "video"
        );

      let thumbnailMediaId =
        0;

      if (thumbnailFile) {
        actionFeedback.loading({
          id: feedbackId,
          title:
            "Uploading thumbnail…",
        });

        thumbnailMediaId =
          await uploadStoreAsset(
            thumbnailFile,
            "thumbnail"
          );
      }

      actionFeedback.loading({
        id: feedbackId,
        title:
          "Publishing video…",
      });

      await runAction<ActionResponse>(
        "publish",
        {
          media_id:
            mediaId,
          thumbnail_media_id:
            thumbnailMediaId,
          title:
            title.trim(),
          product_ids:
            selectedProducts.map(
              (product) =>
                product.id
            ),
          category_ids:
            selectedCategories.map(
              (category) =>
                category.id
            ),
        }
      );

      resetDraft();
      setAddOpen(false);
      setCloseDraftOpen(
        false
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Video published",
        message:
          "Added to your homepage shoppable feed.",
        durationMs: 2400,
      });

      await loadStatus();

      return true;
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not publish video",
        message:
          error instanceof
            Error
            ? error.message
            : "Video could not be published.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setBusy(false);
    }
  }

  useUnsavedChanges({
    id:
      "shoppable-video-create",
    dirty:
      draftDirty,
    label:
      "shoppable video draft",
    save: publishVideo,
  });

  function requestCloseAdd() {
    if (busy) {
      return;
    }

    if (draftDirty) {
      setCloseDraftOpen(
        true
      );
      return;
    }

    setAddOpen(false);
    resetDraft();
  }

  async function deleteStory() {
    const story =
      deleteTarget;

    if (
      !story ||
      !story.managed ||
      busy
    ) {
      return;
    }

    const feedbackId =
      `shoppable-video-delete-${story.story_id}`;

    setBusy(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Deleting video…",
      message:
        story.title ||
        `Video #${story.story_id}`,
    });

    try {
      await runAction<ActionResponse>(
        "delete",
        {
          story_id:
            story.story_id,
        }
      );

      setDeleteTarget(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Video deleted",
        durationMs: 2200,
      });

      await loadStatus();
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not delete video",
        message:
          error instanceof
            Error
            ? error.message
            : "Video could not be deleted.",
        durationMs: 4200,
      });
    } finally {
      setBusy(false);
    }
  }

  const items =
    status?.items || [];

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div className="min-w-0">
          <span className="text-[21px] font-extrabold tracking-tight text-heading md:text-base">
            {existingCount}
          </span>

          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            of {maxVideos} videos
          </span>
        </div>

        <Button
          type="button"
          onClick={() =>
            setAddOpen(true)
          }
          disabled={
            !status?.publish_enabled ||
            busy
          }
        >
          <Plus className="h-4 w-4" />
          Add video
        </Button>
      </div>

      {statusError ? (
        <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-destructive">
          {statusError}
        </div>
      ) : null}

      {!loading &&
      status &&
      !status.ok ? (
        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800">
          {status.message ||
            "Shoppable Videos is not configured for this store yet."}
        </div>
      ) : null}

      <section className="mt-3 overflow-hidden rounded-2xl border border-border bg-card md:mt-4">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-heading">
              Homepage videos
            </h2>

            <p className="mt-0.5 text-xs text-muted-foreground">
              Newest videos appear first.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              void loadStatus()
            }
            disabled={
              loading ||
              busy
            }
            aria-label="Refresh videos"
            title="Refresh videos"
          >
            <RefreshCw
              className={
                `h-4 w-4 ${loading ? "animate-spin" : ""}`
              }
            />
          </Button>
        </div>

        <div className="p-3 md:p-4">
          {loading ? (
            <FeedSkeleton />
          ) : items.length ===
            0 ? (
            <EmptyState
              icon={Clapperboard}
              title="No shoppable videos yet"
              description="Add a short video and tag at least one product or category."
              action={
                <Button
                  type="button"
                  onClick={() =>
                    setAddOpen(
                      true
                    )
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add video
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map(
                (item) => {
                  const productCount =
                    item.tagged_products?.length ||
                    item.product_ids?.length ||
                    0;

                  const categoryCount =
                    item.tagged_categories?.length ||
                    item.category_ids?.length ||
                    0;

                  return (
                    <article
                      key={
                        item.story_id
                      }
                      className="flex min-h-28 min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/30"
                    >
                      {item.thumbnail ? (
                        // Remote WordPress media URL.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            item.thumbnail
                          }
                          alt=""
                          className="h-24 w-16 shrink-0 rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <span className="grid h-24 w-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                          <Film className="h-5 w-5" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-heading">
                          {item.title ||
                            `Video #${item.story_id}`}
                        </p>

                        <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            {productCount}{" "}
                            product
                            {productCount ===
                            1
                              ? ""
                              : "s"}
                          </span>

                          <span>
                            {categoryCount}{" "}
                            categor
                            {categoryCount ===
                            1
                              ? "y"
                              : "ies"}
                          </span>
                        </div>

                        {item.oos_since ? (
                          <p className="mt-1.5 text-[11px] font-semibold text-amber-700">
                            Cleanup countdown active
                          </p>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {item.managed
                              ? "Managed by LetzShopy"
                              : "Existing reel"}
                          </p>
                        )}

                        {item.managed ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setEditingStory(
                                  item
                                )
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                setDeleteTarget(
                                  item
                                )
                              }
                              className="text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      <div className="mt-3 flex items-center gap-2 px-1 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span>
          Publishing video 11 removes the oldest managed video.
        </span>
      </div>

      <BottomSheet
        open={addOpen}
        onOpenChange={(
          open
        ) => {
          if (open) {
            setAddOpen(
              true
            );
          } else {
            requestCloseAdd();
          }
        }}
        title="Add shoppable video"
        description="Upload one MP4 and connect it to products."
        popupClassName="md:mx-auto md:max-w-3xl"
      >
        <div className="space-y-5">
          <section>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Video
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,.mp4"
              disabled={
                !publishReady ||
                busy
              }
              onChange={(
                event
              ) =>
                selectFile(
                  event.target
                    .files?.[0] ||
                    null
                )
              }
              className="hidden"
            />

            <button
              type="button"
              disabled={
                !publishReady ||
                busy
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
              className="ls-focus-ring flex min-h-16 w-full items-center gap-3 rounded-2xl border border-dashed border-input bg-surface-soft px-4 text-left hover:border-primary/40 disabled:opacity-50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <UploadCloud className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-heading">
                  {selectedFile
                    ? selectedFile.name
                    : "Choose MP4 video"}
                </span>

                <span className="mt-1 block text-xs text-muted-foreground">
                  {selectedFile
                    ? formatBytes(
                        selectedFile.size
                      )
                    : maxBytes > 0
                      ? `Maximum ${formatBytes(
                          maxBytes
                        )}`
                      : "Uploads directly to your store"}
                </span>
              </span>
            </button>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Video title
              </label>

              <Input
                value={title}
                maxLength={180}
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="New cotton saree collection"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Thumbnail{" "}
                <span className="font-medium text-muted-foreground">
                  (optional)
                </span>
              </label>

              <input
                ref={
                  thumbnailInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={
                  !publishReady ||
                  busy
                }
                onChange={(
                  event
                ) =>
                  selectThumbnail(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    !publishReady ||
                    busy
                  }
                  onClick={() =>
                    thumbnailInputRef.current?.click()
                  }
                  className="ls-focus-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-input bg-card px-3 text-left text-sm hover:bg-muted disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4 shrink-0 text-primary" />

                  <span className="min-w-0 flex-1 truncate">
                    {thumbnailFile
                      ? thumbnailFile.name
                      : "Choose cover image"}
                  </span>
                </button>

                {thumbnailFile ? (
                  <button
                    type="button"
                    aria-label="Remove thumbnail"
                    onClick={() => {
                      setThumbnailFile(
                        null
                      );

                      if (
                        thumbnailInputRef.current
                      ) {
                        thumbnailInputRef.current.value =
                          "";
                      }
                    }}
                    className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border p-3 md:p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />

              <h3 className="text-sm font-bold text-heading">
                Tag products
              </h3>

              <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                {
                  selectedProducts.length
                }{" "}
                selected
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={
                  productQuery
                }
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setProductQuery(
                    event.target.value
                  )
                }
                placeholder="Search products"
                className="pl-10"
              />
            </div>

            {products.length >
            0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border">
                {products.map(
                  (
                    product
                  ) => {
                    const selected =
                      selectedProductIds.has(
                        product.id
                      );

                    return (
                      <button
                        key={
                          product.id
                        }
                        type="button"
                        disabled={
                          selected ||
                          !product.in_stock ||
                          busy
                        }
                        onClick={() =>
                          setSelectedProducts(
                            (
                              current
                            ) => [
                              ...current,
                              product,
                            ]
                          )
                        }
                        className="ls-focus-ring flex min-h-12 w-full items-center gap-3 border-b border-border px-3 text-left last:border-b-0 hover:bg-muted disabled:opacity-45"
                      >
                        {product.thumbnail ? (
                          // Remote WooCommerce product image.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              product.thumbnail
                            }
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="h-9 w-9 shrink-0 rounded-lg bg-muted" />
                        )}

                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                          {
                            product.name
                          }
                        </span>

                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {!product.in_stock
                            ? "Out of stock"
                            : selected
                              ? "Added"
                              : "Add"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}

            {selectedProducts.length >
            0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProducts.map(
                  (
                    product
                  ) => (
                    <button
                      key={
                        product.id
                      }
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        setSelectedProducts(
                          (
                            current
                          ) =>
                            current.filter(
                              (
                                item
                              ) =>
                                item.id !==
                                product.id
                            )
                        )
                      }
                      className="ls-focus-ring inline-flex min-h-9 items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                    >
                      <span className="max-w-[14rem] truncate">
                        {
                          product.name
                        }
                      </span>

                      <X className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border p-3 md:p-4">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />

              <h3 className="text-sm font-bold text-heading">
                Tag categories
              </h3>

              <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                Optional
              </span>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={
                  categoryQuery
                }
                disabled={busy}
                onChange={(
                  event
                ) =>
                  setCategoryQuery(
                    event.target.value
                  )
                }
                placeholder="Search categories"
                className="pl-10"
              />
            </div>

            {categories.length >
            0 ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-border">
                {categories.map(
                  (
                    category
                  ) => {
                    const selected =
                      selectedCategoryIds.has(
                        category.id
                      );

                    return (
                      <button
                        key={
                          category.id
                        }
                        type="button"
                        disabled={
                          selected ||
                          busy
                        }
                        onClick={() =>
                          setSelectedCategories(
                            (
                              current
                            ) => [
                              ...current,
                              category,
                            ]
                          )
                        }
                        className="ls-focus-ring flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-3 text-left text-sm last:border-b-0 hover:bg-muted disabled:opacity-45"
                      >
                        <span className="truncate font-semibold text-foreground">
                          {
                            category.name
                          }
                        </span>

                        <span className="shrink-0 text-xs font-semibold text-primary">
                          {selected
                            ? "Added"
                            : "Add"}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>
            ) : null}

            {selectedCategories.length >
            0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCategories.map(
                  (
                    category
                  ) => (
                    <button
                      key={
                        category.id
                      }
                      type="button"
                      disabled={
                        busy
                      }
                      onClick={() =>
                        setSelectedCategories(
                          (
                            current
                          ) =>
                            current.filter(
                              (
                                item
                              ) =>
                                item.id !==
                                category.id
                            )
                        )
                      }
                      className="ls-focus-ring inline-flex min-h-9 items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground"
                    >
                      {
                        category.name
                      }

                      <X className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            ) : null}
          </section>

          {!hasTags ? (
            <p className="text-xs font-semibold text-amber-700">
              Tag at least one product or category.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={
                requestCloseAdd
              }
            >
              Cancel
            </Button>

            <AsyncButton
              type="button"
              loading={busy}
              loadingLabel="Publishing…"
              disabled={
                !canPublish
              }
              onClick={() =>
                void publishVideo()
              }
            >
              <UploadCloud className="h-4 w-4" />
              Publish video
            </AsyncButton>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={
          closeDraftOpen
        }
        onOpenChange={
          setCloseDraftOpen
        }
        title="Unsaved video"
        description="Publish this video before closing?"
        confirmLabel="Publish video"
        cancelLabel="Cancel"
        loading={busy}
        loadingLabel="Publishing…"
        onConfirm={async () => {
          await publishVideo();
        }}
      />

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (
            !open &&
            !busy
          ) {
            setDeleteTarget(
              null
            );
          }
        }}
        title="Delete video?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.title || `Video #${deleteTarget.story_id}`}” from the homepage feed? Its managed video file will also be removed.`
            : undefined
        }
        confirmLabel="Delete video"
        loading={busy}
        loadingLabel="Deleting…"
        destructive
        onConfirm={
          deleteStory
        }
      />

      {editingStory ? (
        <ShoppableVideoEditModal
          story={
            editingStory
          }
          onClose={() =>
            setEditingStory(
              null
            )
          }
          onSaved={async () => {
            setEditingStory(
              null
            );

            actionFeedback.success({
              id:
                "shoppable-video-edit",
              title:
                "Video updated",
              durationMs: 2200,
            });

            await loadStatus();
          }}
        />
      ) : null}
    </>
  );
}
