"use client";

import {
  CheckCircle2,
  Clapperboard,
  Film,
  Loader2,
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

type ExistingStory = {
  story_id: number;
  title: string;
  thumbnail: string;
  video_url: string;
  media_id: number;
  created_at: string;
  managed: boolean;
  product_ids?: number[];
  category_ids?: number[];
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

type ActionResponse = Record<string, unknown> & {
  ok?: boolean;
  error?: string;
  message?: string;
};

type UploadTicket = ActionResponse & {
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
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    const record =
      value as Record<string, unknown>;

    if (
      typeof record.error === "string" &&
      record.error.trim()
    ) {
      return record.error;
    }

    if (
      typeof record.message === "string" &&
      record.message.trim()
    ) {
      return record.message;
    }
  }

  return fallback;
}

async function readBridge<T>(
  type: "status" | "products" | "categories",
  query = ""
): Promise<T> {
  const params =
    new URLSearchParams({ type });

  if (query) {
    params.set("q", query);
  }

  const response = await fetch(
    `/api/shoppable-videos/bridge?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  const body: unknown = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !body ||
    typeof body !== "object"
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

async function runAction<T extends ActionResponse>(
  action: "ticket" | "publish" | "adopt" | "delete",
  payload: Record<string, unknown> = {}
): Promise<T> {
  const response = await fetch(
    "/api/shoppable-videos/bridge",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        action,
        ...payload,
      }),
    }
  );

  const body: unknown = await response
    .json()
    .catch(() => null);

  if (
    !response.ok ||
    !body ||
    typeof body !== "object"
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

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  const mb = bytes / (1024 * 1024);

  return mb >= 1
    ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function ShoppableVideosClient() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [
    status,
    setStatus,
  ] = useState<Status | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    statusError,
    setStatusError,
  ] = useState("");

  const [
    actionError,
    setActionError,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] = useState<File | null>(null);

  const [
    productQuery,
    setProductQuery,
  ] = useState("");

  const [
    categoryQuery,
    setCategoryQuery,
  ] = useState("");

  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState<Product[]>([]);

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<Category[]>([]);

  const maxBytes =
    status?.max_upload_bytes || 0;

  const canPublish =
    Boolean(status?.publish_enabled) &&
    Boolean(selectedFile) &&
    (
      selectedProducts.length > 0 ||
      selectedCategories.length > 0
    ) &&
    !busy;

  const loadStatus =
    useCallback(async () => {
      setLoading(true);
      setStatusError("");

      try {
        const next =
          await readBridge<Status>(
            "status"
          );

        setStatus(next);
      } catch (error) {
        setStatusError(
          error instanceof Error
            ? error.message
            : "Could not load shoppable videos."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (
      productQuery.trim().length < 2
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
                response.items || []
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
      window.clearTimeout(timer);
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
                response.items || []
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
      window.clearTimeout(timer);
    };
  }, [categoryQuery]);

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          selectedProducts.map(
            (product) => product.id
          )
        ),
      [selectedProducts]
    );

  const selectedCategoryIds =
    useMemo(
      () =>
        new Set(
          selectedCategories.map(
            (category) => category.id
          )
        ),
      [selectedCategories]
    );

  function selectFile(file: File | null) {
    setActionError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.type !== "video/mp4" &&
      !file.name
        .toLowerCase()
        .endsWith(".mp4")
    ) {
      setSelectedFile(null);
      setActionError(
        "Select an MP4 video. MP4 (H.264/AAC) is recommended for reliable iPhone and Android playback."
      );
      return;
    }

    if (
      maxBytes > 0 &&
      file.size > maxBytes
    ) {
      setSelectedFile(null);
      setActionError(
        `Video must be ${formatBytes(
          maxBytes
        )} or smaller.`
      );
      return;
    }

    setSelectedFile(file);

    if (!title.trim()) {
      setTitle(
        file.name
          .replace(/\.mp4$/i, "")
          .replace(/[-_]+/g, " ")
          .slice(0, 180)
      );
    }
  }

  async function adoptExisting() {
    const legacy =
      status?.legacy_count || 0;

    if (legacy <= 0 || busy) {
      return;
    }

    const confirmed =
      window.confirm(
        `Manage the existing ${legacy} ReelsWP video(s) with LetzShopy? After adoption they become part of the 10-video retention and 7-day out-of-stock lifecycle.`
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const response =
        await runAction<ActionResponse>(
          "adopt"
        );

      const adopted = Array.isArray(
        response.adopted
      )
        ? response.adopted.length
        : legacy;

      setSuccess(
        `${adopted} existing video(s) are now managed by LetzShopy.`
      );

      await loadStatus();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Existing videos could not be adopted."
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishVideo() {
    if (
      !canPublish ||
      !selectedFile
    ) {
      return;
    }

    setBusy(true);
    setActionError("");
    setSuccess("");

    try {
      const ticket =
        await runAction<UploadTicket>(
          "ticket"
        );

      if (!ticket.upload_url) {
        throw new Error(
          "The store did not return a video upload destination."
        );
      }

      const ticketMax =
        Number(
          ticket.max_upload_bytes || 0
        );

      if (
        ticketMax > 0 &&
        selectedFile.size > ticketMax
      ) {
        throw new Error(
          `Video must be ${formatBytes(
            ticketMax
          )} or smaller.`
        );
      }

      const body = new FormData();

      body.append(
        "file",
        selectedFile,
        selectedFile.name.slice(0, 180)
      );

      const uploadResponse =
        await fetch(
          ticket.upload_url,
          {
            method: "POST",
            body,
            mode: "cors",
            cache: "no-store",
          }
        );

      const uploadBody: unknown =
        await uploadResponse
          .json()
          .catch(() => null);

      if (
        !uploadResponse.ok ||
        !uploadBody ||
        typeof uploadBody !== "object"
      ) {
        throw new Error(
          messageFrom(
            uploadBody,
            "Video upload failed."
          )
        );
      }

      const upload =
        uploadBody as UploadResponse;

      const mediaId =
        Number(upload.media_id || 0);

      if (
        !Number.isInteger(mediaId) ||
        mediaId <= 0
      ) {
        throw new Error(
          "Video upload returned an invalid media ID."
        );
      }

      await runAction<ActionResponse>(
        "publish",
        {
          media_id: mediaId,
          title: title.trim(),
          product_ids:
            selectedProducts.map(
              (product) => product.id
            ),
          category_ids:
            selectedCategories.map(
              (category) => category.id
            ),
        }
      );

      setSuccess(
        "Video published to the homepage shoppable feed."
      );

      setSelectedFile(null);
      setTitle("");
      setSelectedProducts([]);
      setSelectedCategories([]);
      setProductQuery("");
      setCategoryQuery("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadStatus();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Video could not be published."
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeStory(
    story: ExistingStory
  ) {
    if (!story.managed || busy) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${
          story.title ||
          `Video #${story.story_id}`
        }" from the homepage feed and remove its managed video file from WordPress?`
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setActionError("");
    setSuccess("");

    try {
      await runAction<ActionResponse>(
        "delete",
        {
          story_id: story.story_id,
        }
      );

      setSuccess(
        "Video removed from the feed and managed media storage."
      );

      await loadStatus();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Video could not be deleted."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
      <header className="rounded-[28px] border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-5 md:p-7">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-indigo-600 p-3 text-white">
            <Clapperboard className="h-6 w-6" />
          </span>

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Shoppable Videos
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Upload short videos, tag products and publish them directly to your storefront.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Homepage feed
            </div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {status?.existing_count ?? "—"} / {status?.max_homepage_videos ?? 10}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Feed
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {status?.group_name || "Checking…"}
            </div>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Storage rule
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              Latest 10 only
            </div>
          </div>
        </div>
      </header>

      {statusError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {statusError}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {actionError}
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading shoppable video settings…
        </div>
      ) : null}

      {!loading &&
      status &&
      !status.ok ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {status.message ||
            "Shoppable Videos is not configured for this store yet."}
        </div>
      ) : null}

      {!loading &&
      status?.ok &&
      (status.legacy_count || 0) > 0 ? (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-lg font-bold text-amber-950">
            Connect your existing ReelsWP videos
          </h2>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            We found {status.legacy_count} existing video(s) in this homepage feed. Connect them once so the dashboard can safely maintain the latest 10 videos and remove videos after seven continuous days with no available tagged products.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void adoptExisting()
            }
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Manage existing videos
          </button>
        </section>
      ) : null}

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Publish a shoppable video
          </h2>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          MP4 is required. The video uploads directly to your own store.
          {maxBytes > 0
            ? ` Maximum size: ${formatBytes(
                maxBytes
              )}.`
            : ""}
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Video
              </span>

              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,.mp4"
                disabled={
                  !status?.publish_enabled ||
                  busy
                }
                onChange={(event) =>
                  selectFile(
                    event.target
                      .files?.[0] ||
                      null
                  )
                }
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white disabled:opacity-55"
              />
            </label>

            {selectedFile ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-950">
                <div className="font-semibold">
                  {selectedFile.name}
                </div>
                <div className="mt-1 text-xs text-indigo-700">
                  {formatBytes(
                    selectedFile.size
                  )}
                </div>
              </div>
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Video title
              </span>

              <input
                value={title}
                maxLength={180}
                disabled={busy}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Example: New cotton saree collection"
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </label>

            {!status?.publish_enabled &&
            status?.ok ? (
              <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                Uploading unlocks after the existing feed is connected above.
              </p>
            ) : null}
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShoppingBag className="h-4 w-4 text-indigo-600" />
                Tag products
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Search and select more than one product.
              </p>

              <div className="relative mt-3">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />

                <input
                  value={productQuery}
                  disabled={busy}
                  onChange={(event) =>
                    setProductQuery(
                      event.target.value
                    )
                  }
                  placeholder="Search product name"
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm"
                />
              </div>

              {products.length > 0 ? (
                <div className="mt-2 max-h-56 space-y-2 overflow-auto rounded-xl border border-slate-100 p-2">
                  {products.map(
                    (product) => {
                      const selected =
                        selectedProductIds.has(
                          product.id
                        );

                      return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={
                            selected ||
                            !product.in_stock ||
                            busy
                          }
                          onClick={() =>
                            setSelectedProducts(
                              (current) => [
                                ...current,
                                product,
                              ]
                            )
                          }
                          className="flex min-h-12 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {product.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.thumbnail}
                              alt=""
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <span className="h-10 w-10 rounded-lg bg-slate-100" />
                          )}

                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                            {product.name}
                          </span>

                          <span className="text-xs text-slate-500">
                            {!product.in_stock
                              ? "Out of stock"
                              : selected
                                ? "Selected"
                                : "Add +"}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedProducts.map(
                  (product) => (
                    <button
                      key={product.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setSelectedProducts(
                          (current) =>
                            current.filter(
                              (item) =>
                                item.id !==
                                product.id
                            )
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800"
                    >
                      {product.name}
                      <X className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Tag className="h-4 w-4 text-violet-600" />
                Tag categories
                <span className="font-normal text-slate-400">
                  (optional)
                </span>
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Category tags dynamically include its currently available products.
              </p>

              <input
                value={categoryQuery}
                disabled={busy}
                onChange={(event) =>
                  setCategoryQuery(
                    event.target.value
                  )
                }
                placeholder="Search product category"
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />

              {categories.length > 0 ? (
                <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-xl border border-slate-100 p-2">
                  {categories.map(
                    (category) => {
                      const selected =
                        selectedCategoryIds.has(
                          category.id
                        );

                      return (
                        <button
                          key={category.id}
                          type="button"
                          disabled={
                            selected ||
                            busy
                          }
                          onClick={() =>
                            setSelectedCategories(
                              (current) => [
                                ...current,
                                category,
                              ]
                            )
                          }
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-violet-50 disabled:opacity-50"
                        >
                          <span>
                            {category.name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {selected
                              ? "Selected"
                              : "Add +"}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedCategories.map(
                  (category) => (
                    <button
                      key={category.id}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        setSelectedCategories(
                          (current) =>
                            current.filter(
                              (item) =>
                                item.id !==
                                category.id
                            )
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800"
                    >
                      {category.name}
                      <X className="h-3 w-3" />
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <p className="text-xs leading-5 text-slate-500">
            When the 11th video is published, the oldest managed video is removed. If all tagged products become unavailable, its seven-day cleanup countdown begins.
          </p>

          <button
            type="button"
            disabled={!canPublish}
            onClick={() =>
              void publishVideo()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
            Upload & publish
          </button>
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Current homepage videos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Newest videos are shown first on the storefront.
            </p>
          </div>

          <button
            type="button"
            disabled={loading || busy}
            onClick={() =>
              void loadStatus()
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(status?.items || []).map(
            (item) => (
              <article
                key={item.story_id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3"
              >
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail}
                    alt=""
                    className="h-20 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Film className="h-6 w-6 text-slate-400" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {item.title ||
                      `Video #${item.story_id}`}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.managed
                      ? "Managed by LetzShopy"
                      : "Existing ReelsWP video"}
                  </p>

                  {item.oos_since ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Out-of-stock cleanup countdown active
                    </p>
                  ) : null}
                </div>

                {item.managed ? (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label="Delete video"
                    onClick={() =>
                      void removeStory(item)
                    }
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </article>
            )
          )}

          {(status?.items || []).length ===
          0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No shoppable videos yet.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
