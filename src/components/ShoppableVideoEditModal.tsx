"use client";

import {
  ImagePlus,
  Loader2,
  Search,
  ShoppingBag,
  Tag,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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

type Story = {
  story_id: number;
  title: string;
  thumbnail: string;
  video_url: string;
  media_id: number;
  managed: boolean;
  tagged_products?: Product[];
  tagged_categories?: Category[];
};

type Props = {
  story: Story;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
};

type JsonRecord = Record<string, unknown>;

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
      value as JsonRecord;

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

async function bridgeGet<T>(
  type: "products" | "categories",
  query: string
): Promise<T> {
  const params = new URLSearchParams({
    type,
    q: query,
  });

  const response = await fetch(
    `/api/shoppable-videos/bridge?${params.toString()}`,
    {
      cache: "no-store",
    }
  );

  const body: unknown =
    await response
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
        "Could not load store data."
      )
    );
  }

  return body as T;
}

async function bridgeAction(
  action: "ticket" | "update",
  payload: JsonRecord = {}
): Promise<JsonRecord> {
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

  const body: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new Error(
      messageFrom(
        body,
        "The video could not be updated."
      )
    );
  }

  return body as JsonRecord;
}

async function uploadAsset(
  file: File,
  kind: "video" | "thumbnail"
) {
  const ticket =
    await bridgeAction(
      "ticket",
      { kind }
    );

  const uploadUrl =
    typeof ticket.upload_url ===
    "string"
      ? ticket.upload_url
      : "";

  if (!uploadUrl) {
    throw new Error(
      "The store did not return an upload destination."
    );
  }

  const maxBytes =
    Number(
      ticket.max_upload_bytes || 0
    );

  if (
    maxBytes > 0 &&
    file.size > maxBytes
  ) {
    throw new Error(
      "Selected file is larger than this store allows."
    );
  }

  const body = new FormData();
  body.append(
    "file",
    file,
    file.name.slice(0, 180)
  );

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      body,
      mode: "cors",
      cache: "no-store",
    }
  );

  const result: unknown =
    await response
      .json()
      .catch(() => null);

  if (
    !response.ok ||
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error(
      messageFrom(
        result,
        "File upload failed."
      )
    );
  }

  const mediaId =
    Number(
      (result as JsonRecord)
        .media_id || 0
    );

  if (
    !Number.isInteger(mediaId) ||
    mediaId <= 0
  ) {
    throw new Error(
      "Upload returned an invalid media ID."
    );
  }

  return mediaId;
}

export default function ShoppableVideoEditModal({
  story,
  onClose,
  onSaved,
}: Props) {
  const replacementInputRef =
    useRef<HTMLInputElement | null>(
      null
    );
  const thumbnailInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    title,
    setTitle,
  ] = useState(story.title || "");

  const [
    selectedProducts,
    setSelectedProducts,
  ] = useState<Product[]>(
    story.tagged_products || []
  );

  const [
    selectedCategories,
    setSelectedCategories,
  ] = useState<Category[]>(
    story.tagged_categories || []
  );

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
    replacementFile,
    setReplacementFile,
  ] = useState<File | null>(null);

  const [
    thumbnailFile,
    setThumbnailFile,
  ] = useState<File | null>(null);

  const [
    removeThumbnail,
    setRemoveThumbnail,
  ] = useState(false);

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          selectedProducts.map(
            (item) => item.id
          )
        ),
      [selectedProducts]
    );

  const selectedCategoryIds =
    useMemo(
      () =>
        new Set(
          selectedCategories.map(
            (item) => item.id
          )
        ),
      [selectedCategories]
    );

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
              await bridgeGet<{
                items: Product[];
              }>(
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
        250
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
              await bridgeGet<{
                items: Category[];
              }>(
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
        250
      );

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [categoryQuery]);

  const hasTags =
    selectedProducts.length > 0 ||
    selectedCategories.length > 0;

  async function save() {
    if (!hasTags || busy) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const replacementMediaId =
        replacementFile
          ? await uploadAsset(
              replacementFile,
              "video"
            )
          : 0;

      let thumbnailMediaId:
        | number
        | undefined;

      if (thumbnailFile) {
        thumbnailMediaId =
          await uploadAsset(
            thumbnailFile,
            "thumbnail"
          );
      } else if (removeThumbnail) {
        thumbnailMediaId = 0;
      }

      const payload: JsonRecord = {
        story_id: story.story_id,
        title: title.trim(),
        product_ids:
          selectedProducts.map(
            (item) => item.id
          ),
        category_ids:
          selectedCategories.map(
            (item) => item.id
          ),
      };

      if (replacementMediaId > 0) {
        payload.replacement_media_id =
          replacementMediaId;
      }

      if (
        thumbnailMediaId !==
        undefined
      ) {
        payload.thumbnail_media_id =
          thumbnailMediaId;
      }

      await bridgeAction(
        "update",
        payload
      );

      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Video could not be updated."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-950/55 p-3 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit shoppable video"
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[26px] bg-white p-5 shadow-2xl md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Edit shoppable video
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Replace the video, change its cover image or update tagged products.
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
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
                className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            </label>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <UploadCloud className="h-4 w-4 text-indigo-600" />
                Replace video
                <span className="font-normal text-slate-400">
                  (optional)
                </span>
              </span>

              <input
                ref={replacementInputRef}
                type="file"
                accept="video/mp4,.mp4"
                disabled={busy}
                onChange={(event) => {
                  const file =
                    event.target.files?.[0] ||
                    null;

                  if (
                    file &&
                    file.type !==
                      "video/mp4" &&
                    !file.name
                      .toLowerCase()
                      .endsWith(".mp4")
                  ) {
                    setError(
                      "Replacement video must be MP4."
                    );
                    setReplacementFile(null);
                    return;
                  }

                  setError("");
                  setReplacementFile(file);
                }}
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-semibold file:text-white"
              />
            </label>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                {story.thumbnail &&
                !removeThumbnail &&
                !thumbnailFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={story.thumbnail}
                    alt=""
                    className="h-20 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="flex h-20 w-14 items-center justify-center rounded-xl bg-slate-100">
                    <ImagePlus className="h-5 w-5 text-slate-400" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-800">
                    Thumbnail image
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    JPG, PNG or WebP.
                  </div>
                </div>
              </div>

              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                disabled={busy}
                onChange={(event) => {
                  const file =
                    event.target.files?.[0] ||
                    null;

                  if (
                    file &&
                    ![
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                    ].includes(file.type)
                  ) {
                    setError(
                      "Thumbnail must be JPG, PNG or WebP."
                    );
                    setThumbnailFile(null);
                    return;
                  }

                  setError("");
                  setThumbnailFile(file);
                  setRemoveThumbnail(false);
                }}
                className="mt-3 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:font-semibold file:text-white"
              />

              {(story.thumbnail ||
                thumbnailFile) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setThumbnailFile(null);
                    setRemoveThumbnail(true);

                    if (
                      thumbnailInputRef.current
                    ) {
                      thumbnailInputRef.current.value =
                        "";
                    }
                  }}
                  className="mt-3 text-xs font-semibold text-rose-700"
                >
                  Remove thumbnail
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShoppingBag className="h-4 w-4 text-indigo-600" />
                Tagged products
              </h3>

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
                <div className="mt-2 max-h-44 space-y-1 overflow-auto rounded-xl border border-slate-100 p-2">
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
                          className="flex w-full items-center justify-between rounded-lg p-2 text-left text-sm hover:bg-indigo-50 disabled:opacity-50"
                        >
                          <span className="truncate">
                            {product.name}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-slate-500">
                            {selected
                              ? "Selected"
                              : product.in_stock
                                ? "Add +"
                                : "Out of stock"}
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
                Tagged categories
              </h3>

              <input
                value={categoryQuery}
                disabled={busy}
                onChange={(event) =>
                  setCategoryQuery(
                    event.target.value
                  )
                }
                placeholder="Search category"
                className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />

              {categories.length > 0 ? (
                <div className="mt-2 max-h-36 space-y-1 overflow-auto rounded-xl border border-slate-100 p-2">
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

        {!hasTags ? (
          <p className="mt-4 text-xs font-semibold text-amber-700">
            Keep at least one tagged product or category.
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-5">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={busy || !hasTags}
            onClick={() =>
              void save()
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
