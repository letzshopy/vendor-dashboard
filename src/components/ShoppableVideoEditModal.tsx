"use client";

import {
  ImagePlus,
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
  Input,
} from "@/components/ui/input";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

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
  onSaved:
    () =>
      | Promise<void>
      | void;
};

type JsonRecord =
  Record<string, unknown>;

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
      value as JsonRecord;

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

async function bridgeGet<T>(
  type:
    | "products"
    | "categories",
  query: string
): Promise<T> {
  const params =
    new URLSearchParams({
      type,
      q: query,
    });

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
        "Could not load store data."
      )
    );
  }

  return body as T;
}

async function bridgeAction(
  action:
    | "ticket"
    | "update",
  payload: JsonRecord = {}
): Promise<JsonRecord> {
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
      "object" ||
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
  kind:
    | "video"
    | "thumbnail"
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
      ticket.max_upload_bytes ||
        0
    );

  if (
    maxBytes > 0 &&
    file.size >
      maxBytes
  ) {
    throw new Error(
      "Selected file is larger than this store allows."
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
      uploadUrl,
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
      "object" ||
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
      (
        result as JsonRecord
      ).media_id || 0
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

function stableIds(
  values:
    | Product[]
    | Category[]
) {
  return values
    .map(
      (item) =>
        item.id
    )
    .sort(
      (a, b) =>
        a - b
    )
    .join(",");
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
  ] =
    useState(
      story.title || ""
    );

  const [
    selectedProducts,
    setSelectedProducts,
  ] =
    useState<Product[]>(
      story.tagged_products ||
        []
    );

  const [
    selectedCategories,
    setSelectedCategories,
  ] =
    useState<Category[]>(
      story.tagged_categories ||
        []
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
    replacementFile,
    setReplacementFile,
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
    removeThumbnail,
    setRemoveThumbnail,
  ] =
    useState(false);

  const [
    busy,
    setBusy,
  ] =
    useState(false);

  const [
    closeConfirmOpen,
    setCloseConfirmOpen,
  ] =
    useState(false);

  const initialProductIds =
    useMemo(
      () =>
        stableIds(
          story.tagged_products ||
            []
        ),
      [story.tagged_products]
    );

  const initialCategoryIds =
    useMemo(
      () =>
        stableIds(
          story.tagged_categories ||
            []
        ),
      [
        story.tagged_categories,
      ]
    );

  const selectedProductIds =
    useMemo(
      () =>
        new Set(
          selectedProducts.map(
            (item) =>
              item.id
          )
        ),
      [selectedProducts]
    );

  const selectedCategoryIds =
    useMemo(
      () =>
        new Set(
          selectedCategories.map(
            (item) =>
              item.id
          )
        ),
      [
        selectedCategories,
      ]
    );

  const hasTags =
    selectedProducts.length >
      0 ||
    selectedCategories.length >
      0;

  const dirty =
    title.trim() !==
      (story.title ||
        "").trim() ||
    Boolean(
      replacementFile
    ) ||
    Boolean(
      thumbnailFile
    ) ||
    removeThumbnail ||
    stableIds(
      selectedProducts
    ) !==
      initialProductIds ||
    stableIds(
      selectedCategories
    ) !==
      initialCategoryIds;

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
              await bridgeGet<{
                items:
                  Product[];
              }>(
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
        250
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
              await bridgeGet<{
                items:
                  Category[];
              }>(
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
        250
      );

    return () => {
      active = false;

      window.clearTimeout(
        timer
      );
    };
  }, [categoryQuery]);

  async function save(): Promise<boolean> {
    if (busy) {
      return false;
    }

    if (!hasTags) {
      actionFeedback.warning({
        id:
          "shoppable-video-edit",
        title:
          "Keep at least one product or category",
        durationMs: 3000,
      });

      return false;
    }

    const feedbackId =
      "shoppable-video-edit";

    setBusy(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        replacementFile
          ? "Uploading replacement video…"
          : "Saving video…",
    });

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
        actionFeedback.loading({
          id: feedbackId,
          title:
            "Uploading thumbnail…",
        });

        thumbnailMediaId =
          await uploadAsset(
            thumbnailFile,
            "thumbnail"
          );
      } else if (
        removeThumbnail
      ) {
        thumbnailMediaId =
          0;
      }

      actionFeedback.loading({
        id: feedbackId,
        title:
          "Saving video…",
      });

      const payload:
        JsonRecord = {
        story_id:
          story.story_id,
        title:
          title.trim(),
        product_ids:
          selectedProducts.map(
            (item) =>
              item.id
          ),
        category_ids:
          selectedCategories.map(
            (item) =>
              item.id
          ),
      };

      if (
        replacementMediaId >
        0
      ) {
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

      setCloseConfirmOpen(
        false
      );

      await onSaved();

      return true;
    } catch (
      saveError: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save video",
        message:
          saveError instanceof
            Error
            ? saveError.message
            : "Video could not be updated.",
        durationMs: 4200,
      });

      return false;
    } finally {
      setBusy(false);
    }
  }

  useUnsavedChanges({
    id:
      `shoppable-video-edit-${story.story_id}`,
    dirty,
    label:
      "shoppable video changes",
    save,
  });

  function requestClose() {
    if (busy) {
      return;
    }

    if (dirty) {
      setCloseConfirmOpen(
        true
      );
      return;
    }

    onClose();
  }

  function chooseReplacement(
    file: File | null
  ) {
    if (!file) {
      setReplacementFile(
        null
      );
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
      setReplacementFile(
        null
      );

      actionFeedback.error({
        id:
          "shoppable-video-replacement",
        title:
          "Replacement must be MP4",
        durationMs: 3000,
      });

      return;
    }

    setReplacementFile(
      file
    );
  }

  function chooseThumbnail(
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
          "shoppable-video-edit-thumbnail",
        title:
          "Use JPG, PNG or WebP",
        durationMs: 3000,
      });

      return;
    }

    setThumbnailFile(file);
    setRemoveThumbnail(
      false
    );
  }

  return (
    <>
      <BottomSheet
        open
        onOpenChange={(
          open
        ) => {
          if (!open) {
            requestClose();
          }
        }}
        title="Edit shoppable video"
        description="Update the video, cover or tagged products."
        popupClassName="md:mx-auto md:max-w-3xl"
      >
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
            <div className="flex justify-start">
              {story.thumbnail &&
              !removeThumbnail ? (
                // Remote WordPress media URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    story.thumbnail
                  }
                  alt=""
                  className="h-28 w-20 rounded-xl border border-border object-cover"
                />
              ) : (
                <span className="grid h-28 w-20 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </span>
              )}
            </div>

            <div className="space-y-3">
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
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  ref={
                    replacementInputRef
                  }
                  type="file"
                  accept="video/mp4,.mp4"
                  disabled={busy}
                  onChange={(
                    event
                  ) =>
                    chooseReplacement(
                      event.target
                        .files?.[0] ||
                        null
                    )
                  }
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    replacementInputRef.current?.click()
                  }
                >
                  <UploadCloud className="h-4 w-4" />
                  {replacementFile
                    ? "Video selected"
                    : "Replace video"}
                </Button>

                <input
                  ref={
                    thumbnailInputRef
                  }
                  type="file"
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  disabled={busy}
                  onChange={(
                    event
                  ) =>
                    chooseThumbnail(
                      event.target
                        .files?.[0] ||
                        null
                    )
                  }
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    thumbnailInputRef.current?.click()
                  }
                >
                  <ImagePlus className="h-4 w-4" />
                  {thumbnailFile
                    ? "Cover selected"
                    : "Change cover"}
                </Button>
              </div>

              {replacementFile ? (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-surface-soft px-3 py-2 text-xs">
                  <span className="truncate font-semibold text-foreground">
                    {
                      replacementFile.name
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setReplacementFile(
                        null
                      );

                      if (
                        replacementInputRef.current
                      ) {
                        replacementInputRef.current.value =
                          "";
                      }
                    }}
                    className="ls-focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label="Clear replacement video"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {thumbnailFile ? (
                <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl bg-surface-soft px-3 py-2 text-xs">
                  <span className="truncate font-semibold text-foreground">
                    {
                      thumbnailFile.name
                    }
                  </span>

                  <button
                    type="button"
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
                    className="ls-focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
                    aria-label="Clear thumbnail"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}

              {(story.thumbnail ||
                thumbnailFile) ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setThumbnailFile(
                      null
                    );
                    setRemoveThumbnail(
                      true
                    );

                    if (
                      thumbnailInputRef.current
                    ) {
                      thumbnailInputRef.current.value =
                        "";
                    }
                  }}
                  className="text-left text-xs font-semibold text-destructive"
                >
                  Remove thumbnail
                </button>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-border p-3 md:p-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-primary" />

              <h3 className="text-sm font-bold text-heading">
                Tagged products
              </h3>

              <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                {
                  selectedProducts.length
                }
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
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border">
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
                        className="ls-focus-ring flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-3 text-left last:border-b-0 hover:bg-muted disabled:opacity-45"
                      >
                        <span className="min-w-0 truncate text-sm font-semibold text-foreground">
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
                      disabled={busy}
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
                Tagged categories
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
                        className="ls-focus-ring flex min-h-11 w-full items-center justify-between gap-3 border-b border-border px-3 text-left last:border-b-0 hover:bg-muted disabled:opacity-45"
                      >
                        <span className="truncate text-sm font-semibold text-foreground">
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
                      disabled={busy}
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
              Keep at least one tagged product or category.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={
                requestClose
              }
            >
              Cancel
            </Button>

            <AsyncButton
              type="button"
              loading={busy}
              loadingLabel="Saving…"
              disabled={
                !dirty ||
                !hasTags
              }
              onClick={() =>
                void save()
              }
            >
              Save changes
            </AsyncButton>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={
          closeConfirmOpen
        }
        onOpenChange={
          setCloseConfirmOpen
        }
        title="Unsaved changes"
        description="Save your video changes before closing?"
        confirmLabel="Save changes"
        cancelLabel="Cancel"
        loading={busy}
        loadingLabel="Saving…"
        onConfirm={save}
      />
    </>
  );
}
