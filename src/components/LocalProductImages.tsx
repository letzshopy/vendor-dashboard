"use client";

import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  optimizeContentImageForUpload,
} from "@/lib/clientImageOptimizer";

export type ImgItem = {
  id: number;
  url: string;
};

type JsonRecord = Record<string, unknown>;

type PendingImage = {
  key: string;
  name: string;
  url: string;
};

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function uploadError(
  value: unknown
): string {
  return isRecord(value) &&
    typeof value.error === "string"
    ? value.error
    : "Upload failed";
}

function normalizeUploadPayload(
  value: unknown
): ImgItem | null {
  if (!isRecord(value)) return null;

  const id = Number(
    value.id ??
      value.media_id ??
      value.image_id ??
      0
  );
  const url =
    typeof value.image_url === "string"
      ? value.image_url
      : typeof value.url === "string"
        ? value.url
        : typeof value.source_url === "string"
          ? value.source_url
          : "";

  return Number.isSafeInteger(id) &&
    id > 0 &&
    /^https?:\/\//i.test(url)
    ? { id, url }
    : null;
}

async function readUploadResponse(
  response: Response,
  fileName: string
): Promise<ImgItem> {
  const raw =
    await response.text();

  let parsed: unknown = null;

  if (raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        `"${fileName}" returned an invalid upload response.`
      );
    }
  }

  if (!response.ok) {
    throw new Error(
      `"${fileName}" could not be uploaded. ${uploadError(parsed)}`
    );
  }

  const item =
    normalizeUploadPayload(parsed);

  if (!item) {
    throw new Error(
      `"${fileName}" returned an invalid media item.`
    );
  }

  return item;
}

function uniqueImages(
  value: ImgItem[],
  max: number
): ImgItem[] {
  const seen =
    new Set<number>();

  return value
    .filter((image) => {
      if (
        !Number.isSafeInteger(image.id) ||
        image.id <= 0 ||
        !image.url ||
        seen.has(image.id)
      ) {
        return false;
      }

      seen.add(image.id);
      return true;
    })
    .slice(0, max);
}

export default function LocalProductImages({
  value,
  onChange,
  max = 5,
  compact = false,
}: {
  value: ImgItem[];
  onChange: (next: ImgItem[]) => void;
  max?: number;
  compact?: boolean;
}) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);
  const pendingRef =
    useRef<PendingImage[]>([]);

  const [pendingImages, setPendingImages] =
    useState<PendingImage[]>([]);
  const [busy, setBusy] =
    useState(false);
  const [busyText, setBusyText] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);
  const [draggingIndex, setDraggingIndex] =
    useState<number | null>(null);

  useEffect(() => {
    return () => {
      for (
        const pending of
        pendingRef.current
      ) {
        URL.revokeObjectURL(
          pending.url
        );
      }
    };
  }, []);

  function appendImages(
    uploaded: ImgItem[]
  ) {
    onChange(
      uniqueImages(
        [...value, ...uploaded],
        max
      )
    );
  }

  function removeAt(
    index: number
  ) {
    onChange(
      value
        .slice(0, index)
        .concat(
          value.slice(index + 1)
        )
    );
  }

  function moveImage(
    from: number,
    to: number
  ) {
    if (
      from === to ||
      from < 0 ||
      to < 0 ||
      from >= value.length ||
      to >= value.length
    ) {
      return;
    }

    const next =
      value.slice();
    const [moved] =
      next.splice(from, 1);

    next.splice(to, 0, moved);
    onChange(next);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>,
    targetIndex: number
  ) {
    event.preventDefault();

    if (draggingIndex !== null) {
      moveImage(
        draggingIndex,
        targetIndex
      );
    }

    setDraggingIndex(null);
  }

  async function uploadSingle(
    originalFile: File
  ): Promise<ImgItem> {
    let preparedFile: File;

    try {
      const result =
        await optimizeContentImageForUpload(
          originalFile
        );

      preparedFile = result.file;
    } catch (caught: unknown) {
      const message =
        caught instanceof Error
          ? caught.message
          : "The image could not be prepared.";

      throw new Error(
        `Unable to prepare "${originalFile.name}". ${message}`
      );
    }

    const form =
      new FormData();

    form.append(
      "file",
      preparedFile,
      preparedFile.name
    );
    form.append(
      "purpose",
      "product_image"
    );

    let response: Response;

    try {
      response = await fetch(
        "/api/media/upload",
        {
          method: "POST",
          body: form,
        }
      );
    } catch {
      throw new Error(
        `"${originalFile.name}" could not be uploaded because the connection was interrupted.`
      );
    }

    return readUploadResponse(
      response,
      originalFile.name
    );
  }

  async function pickFiles(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files =
      event.target.files;

    if (
      !files ||
      files.length === 0
    ) {
      return;
    }

    const remaining =
      Math.max(
        0,
        max -
          value.length -
          pendingRef.current.length
      );

    const selected =
      Array.from(files).slice(
        0,
        remaining
      );

    event.target.value = "";

    if (
      selected.length === 0
    ) {
      setError(
        `A maximum of ${max} images is allowed.`
      );
      return;
    }

    const pending =
      selected.map(
        (file, index) => ({
          key:
            `${Date.now()}-${index}-${file.name}`,
          name: file.name,
          url:
            URL.createObjectURL(file),
        })
      );

    pendingRef.current = [
      ...pendingRef.current,
      ...pending,
    ];
    setPendingImages(
      pendingRef.current
    );
    setError(null);
    setBusy(true);

    const uploaded:
      Array<ImgItem | undefined> =
        new Array(
          selected.length
        );
    let nextIndex = 0;
    let completed = 0;
    let firstError:
      Error | null = null;

    async function worker() {
      while (true) {
        if (firstError) return;

        const index =
          nextIndex;
        nextIndex += 1;

        if (
          index >= selected.length
        ) {
          return;
        }

        const file =
          selected[index];

        try {
          setBusyText(
            `Preparing and uploading ${completed} of ${selected.length} images`
          );

          uploaded[index] =
            await uploadSingle(file);

          completed += 1;

          setBusyText(
            `Preparing and uploading ${completed} of ${selected.length} images`
          );
        } catch (caught: unknown) {
          firstError =
            caught instanceof Error
              ? caught
              : new Error(
                  "Image upload failed."
                );
        }
      }
    }

    try {
      await Promise.all(
        Array.from(
          {
            length:
              Math.min(
                2,
                selected.length
              ),
          },
          () => worker()
        )
      );

      const completedUploads =
        uploaded.flatMap(
          (item) =>
            item ? [item] : []
        );

      if (
        completedUploads.length > 0
      ) {
        appendImages(
          completedUploads
        );
      }

      if (firstError) {
        throw firstError;
      }
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Image upload failed."
      );
    } finally {
      const pendingKeys =
        new Set(
          pending.map(
            (item) => item.key
          )
        );

      for (
        const item of
        pendingRef.current
      ) {
        if (
          pendingKeys.has(
            item.key
          )
        ) {
          URL.revokeObjectURL(
            item.url
          );
        }
      }

      pendingRef.current =
        pendingRef.current.filter(
          (item) =>
            !pendingKeys.has(
              item.key
            )
        );

      setPendingImages(
        pendingRef.current
      );
      setBusy(false);
      setBusyText(null);
    }
  }

  const cardClass =
    compact
      ? "h-20 w-20"
      : "h-24 w-24";

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-bold text-[#26335F]">
          Upload from your device only
        </div>

        <div className="text-[10px] text-slate-400">
          Drag images to reorder
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {value.map(
          (image, index) => (
            <div
              key={`${image.id}-${index}`}
              draggable={!busy}
              onDragStart={() =>
                setDraggingIndex(
                  index
                )
              }
              onDragEnd={() =>
                setDraggingIndex(
                  null
                )
              }
              onDragOver={(event) =>
                event.preventDefault()
              }
              onDrop={(event) =>
                handleDrop(
                  event,
                  index
                )
              }
              className={`group relative shrink-0 cursor-grab overflow-hidden rounded-xl border bg-slate-50 active:cursor-grabbing ${cardClass} ${
                draggingIndex === index
                  ? "border-[#5366B7] opacity-60"
                  : "border-slate-200"
              }`}
            >
              {/* Uploaded WordPress media URL; intentionally not passed to next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
              />

              <div className="absolute left-1 top-1 flex items-center gap-1 rounded-lg bg-slate-950/70 px-1.5 py-1 text-[9px] font-semibold text-white">
                <GripVertical className="h-3 w-3" />
                {index === 0
                  ? compact
                    ? "Main"
                    : "Featured"
                  : index + 1}
              </div>

              <button
                type="button"
                aria-label={`Remove image ${index + 1}`}
                onClick={() =>
                  removeAt(index)
                }
                disabled={busy}
                className="absolute bottom-1 right-1 grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-rose-600 shadow-sm transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        )}

        {pendingImages.map(
          (image) => (
            <div
              key={image.key}
              className={`relative shrink-0 overflow-hidden rounded-xl border border-[#C9D0E8] bg-slate-100 ${cardClass}`}
            >
              {/* Local object URL; intentionally not passed to next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 grid place-items-center bg-slate-950/50 px-2 text-center text-[9px] font-semibold text-white">
                <Loader2 className="mb-1 h-4 w-4 animate-spin" />
                Uploading
              </div>
            </div>
          )
        )}

        {value.length +
          pendingImages.length <
          max && (
          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            disabled={busy}
            className={`grid shrink-0 place-items-center rounded-xl border border-dashed border-[#9FAAE0] bg-[#EEF1FA] px-2 text-center text-[#2E3F7D] transition hover:bg-[#E5E9F7] disabled:cursor-not-allowed disabled:opacity-50 ${cardClass}`}
          >
            <span>
              <ImagePlus className="mx-auto mb-1 h-5 w-5" />
              <span className="block text-[10px] font-semibold">
                Add images
              </span>
            </span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={pickFiles}
      />

      <div className="mt-2 text-[10px] text-slate-500">
        {value.length} of {max} images
        {busyText
          ? ` · ${busyText}`
          : ""}
      </div>

      {error && (
        <div className="mt-2 text-[11px] font-medium text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
