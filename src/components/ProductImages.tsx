"use client";

import { useRef, useState } from "react";

export type ImgItem = {
  id: number;
  url: string;
};

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 1800;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create compressed image"));
        }
      },
      type,
      quality,
    );
  });
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE_BYTES) return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    const largestSide = Math.max(originalWidth, originalHeight);
    const initialScale =
      largestSide > MAX_DIMENSION ? MAX_DIMENSION / largestSide : 1;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas is not supported in this browser");
    }

    const qualitySteps = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
    const dimensionSteps = [1, 0.9, 0.8, 0.7];

    for (const dimensionFactor of dimensionSteps) {
      const scale = initialScale * dimensionFactor;
      const width = Math.max(1, Math.round(originalWidth * scale));
      const height = Math.max(1, Math.round(originalHeight * scale));

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      for (const quality of qualitySteps) {
        const blob = await canvasToBlob(
          canvas,
          "image/jpeg",
          quality,
        );

        if (blob.size <= MAX_FILE_SIZE_BYTES) {
          const baseName =
            file.name.replace(/\.[^.]+$/, "") ||
            `image-${Date.now()}`;

          return new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        }
      }
    }

    throw new Error(
      "Image is too large even after compression. Please choose a smaller image.",
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function record(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function normalizeUploadPayload(value: unknown): ImgItem | null {
  if (!isRecord(value)) return null;

  const attachment = record(value.attachment);
  const data = record(value.data);
  const nested = record(value.media || value.file || value.data);
  const attachmentGuid = record(attachment.guid);
  const nestedGuid = record(nested.guid);

  const id = [
    value.id,
    value.mediaId,
    value.media_id,
    attachment.id,
    data.id,
    nested.id,
  ]
    .map((candidate) =>
      typeof candidate === "string"
        ? Number.parseInt(candidate, 10)
        : Number(candidate),
    )
    .find(Number.isFinite);

  const url = [
    value.url,
    value.src,
    value.source_url,
    value.image_url,
    attachment.url,
    data.source_url,
    nested.url,
    nested.src,
    nested.source_url,
    attachmentGuid.rendered,
    nestedGuid.rendered,
  ].find(
    (candidate) =>
      typeof candidate === "string" &&
      /^https?:\/\//i.test(candidate),
  );

  return (
    typeof id === "number" &&
    Number.isInteger(id) &&
    id > 0 &&
    typeof url === "string"
  )
    ? { id, url }
    : null;
}

function uploadError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Upload failed";
}

async function readUploadResponse(response: Response): Promise<ImgItem> {
  const raw = await response.text();

  if (
    response.status === 413 ||
    raw.includes("FUNCTION_PAYLOAD_TOO_LARGE")
  ) {
    throw new Error("Image must be under 4 MB for dashboard upload.");
  }

  if (raw.trim().startsWith("<")) {
    throw new Error("Upload failed. Please try a smaller image.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Upload returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(uploadError(parsed));
  }

  const item = normalizeUploadPayload(parsed);

  if (!item) {
    throw new Error("Upload returned an invalid media item.");
  }

  return item;
}

export default function ProductImages({
  value,
  onChange,
  max = 5,
}: {
  value: ImgItem[];
  onChange: (next: ImgItem[]) => void;
  max?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function appendImages(uploaded: ImgItem[]) {
    const next = [...value, ...uploaded].filter(
      (image, index, images) =>
        images.findIndex((candidate) => candidate.id === image.id) ===
        index,
    );

    onChange(next.slice(0, max));
  }

  function removeAt(index: number) {
    onChange(
      value.slice(0, index).concat(value.slice(index + 1)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;

    if (destination < 0 || destination >= value.length) return;

    const next = value.slice();
    [next[index], next[destination]] = [
      next[destination],
      next[index],
    ];
    onChange(next);
  }

  async function uploadFile(file: File) {
    const body = new FormData();
    body.append("file", file);
    body.append("purpose", "product_image");

    return readUploadResponse(
      await fetch("/api/media/upload", {
        method: "POST",
        body,
      }),
    );
  }

  async function pickFiles(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = event.target.files;

    if (!files || files.length === 0) return;

    setError(null);
    setBusy(true);

    try {
      const selected = Array.from(files).slice(
        0,
        Math.max(0, max - value.length),
      );

      const uploaded: ImgItem[] = [];

      for (const originalFile of selected) {
        let file = originalFile;

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setBusyText(`Optimizing ${file.name}...`);
          file = await compressImageIfNeeded(file);
        }

        setBusyText(`Uploading ${file.name}...`);
        uploaded.push(await uploadFile(file));
      }

      appendImages(uploaded);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Upload failed",
      );
    } finally {
      setBusy(false);
      setBusyText(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function importImageUrl() {
    const sourceUrl = imageUrl.trim();

    if (!sourceUrl) {
      setError("Enter an image URL.");
      return;
    }

    if (value.length >= max) {
      setError(`A maximum of ${max} images is allowed.`);
      return;
    }

    setError(null);
    setBusy(true);
    setBusyText("Importing image...");

    try {
      const item = await readUploadResponse(
        await fetch("/api/media/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_url: sourceUrl,
            purpose: "product_image",
          }),
        }),
      );

      appendImages([item]);
      setImageUrl("");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Image import failed",
      );
    } finally {
      setBusy(false);
      setBusyText(null);
    }
  }

  return (
    <div>
      <div className="mb-2 font-medium">
        Images{" "}
        <span className="text-xs text-slate-500">
          (first = featured)
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((image, index) => (
          <div key={`${image.id}-${index}`} className="relative">
            <img
              src={image.url}
              alt=""
              className={`h-24 w-24 rounded border object-cover ${
                index === 0 ? "ring-2 ring-blue-500" : ""
              }`}
            />

            {index === 0 && (
              <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">
                Featured
              </span>
            )}

            <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
              <button
                type="button"
                aria-label="Move up"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px]"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px]"
                onClick={() => move(index, 1)}
                disabled={index === value.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px] text-red-600"
                onClick={() => removeAt(index)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {value.length < max && (
          <label className="grid h-24 w-24 cursor-pointer place-items-center rounded border hover:bg-gray-50">
            <span className="text-sm">+ Upload</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={pickFiles}
            />
          </label>
        )}
      </div>

      {value.length < max && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 text-xs font-medium text-slate-700">
            Upload by URL
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              inputMode="url"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void importImageUrl();
                }
              }}
              placeholder="https://example.com/product-image.jpg"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void importImageUrl()}
              disabled={busy || !imageUrl.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Import image
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            The image is securely copied into your Media Library.
          </p>
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500">
        Large images are automatically optimized before upload.
      </div>

      {busy && (
        <div className="mt-2 text-xs text-slate-600">
          {busyText || "Uploading..."}
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-700">{error}</div>
      )}
    </div>
  );
}
