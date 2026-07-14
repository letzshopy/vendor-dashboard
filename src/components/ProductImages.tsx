"use client";

import { useEffect, useRef, useState } from "react";

import MediaLibraryPicker from "@/components/MediaLibraryPicker";

export type ImgItem = {
  id: number;
  url: string;
};

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 1800;

type JsonRecord = Record<string, unknown>;

type PendingImage = {
  key: string;
  name: string;
  url: string;
};

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
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [urlImporting, setUrlImporting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const pendingRef = useRef<PendingImage[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      for (const pending of pendingRef.current) {
        URL.revokeObjectURL(pending.url);
      }
    };
  }, []);

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

    setAddOpen(false);

    setError(null);
    setBusy(true);
    let currentPending: PendingImage[] = [];
    const uploaded: ImgItem[] = [];

    try {
      const selected = Array.from(files).slice(
        0,
        Math.max(0, max - value.length - pendingImages.length),
      );

      currentPending = selected.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        url: URL.createObjectURL(file),
      }));

      pendingRef.current = [...pendingRef.current, ...currentPending];
      setPendingImages(pendingRef.current);

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
      if (uploaded.length > 0) {
        appendImages(uploaded);
      }

      setError(
        caught instanceof Error ? caught.message : "Upload failed",
      );
    } finally {
      const selectedKeys = new Set(
        currentPending.map((item) => item.key),
      );

      const completed = pendingRef.current.filter((item) =>
        selectedKeys.has(item.key),
      );

      for (const item of completed) {
        URL.revokeObjectURL(item.url);
      }

      pendingRef.current = pendingRef.current.filter(
        (item) => !selectedKeys.has(item.key),
      );
      setPendingImages(pendingRef.current);
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
    setUrlImporting(true);
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
      setAddOpen(false);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Image import failed",
      );
    } finally {
      setUrlImporting(false);
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

        {pendingImages.map((image, index) => (
          <div key={image.key} className="relative">
            {/* Local object URL: intentionally not passed to next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt=""
              className={`h-24 w-24 rounded border object-cover ${
                value.length === 0 && index === 0
                  ? "ring-2 ring-blue-500"
                  : ""
              }`}
            />
            <div className="absolute inset-0 grid place-items-center rounded bg-slate-950/45 px-2 text-center text-[10px] font-semibold text-white">
              Uploading…
            </div>
          </div>
        ))}

        {urlImporting && (
          <div className="grid h-24 w-24 animate-pulse place-items-center rounded border border-slate-300 bg-slate-100 px-2 text-center text-[10px] font-semibold text-slate-600">
            Importing image…
          </div>
        )}

        {value.length + pendingImages.length + (urlImporting ? 1 : 0) < max && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="grid h-24 w-24 place-items-center rounded border hover:bg-gray-50"
          >
            <span className="text-sm">+ Add images</span>
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

      {addOpen && (
        <div className="fixed inset-0 z-[250] grid place-items-center bg-slate-950/60 p-3 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900">Add product images</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a file, reuse Media Library, or import a public URL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl border text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4 text-left"
              >
                <span className="block text-sm font-semibold text-violet-800">Upload from device</span>
                <span className="mt-1 block text-xs text-violet-700/75">Choose JPG, PNG, WebP or GIF.</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddOpen(false);
                  setLibraryOpen(true);
                }}
                className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 text-left"
              >
                <span className="block text-sm font-semibold text-sky-800">Choose Media Library</span>
                <span className="mt-1 block text-xs text-sky-700/75">Reuse an already uploaded image.</span>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="mb-2 block text-xs font-semibold text-slate-700">Import from image URL</label>
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
                  placeholder="https://example.com/image.jpg"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => void importImageUrl()}
                  disabled={busy || !imageUrl.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaLibraryPicker
        open={libraryOpen}
        remaining={Math.max(0, max - value.length - pendingImages.length)}
        excludedIds={value.map((image) => image.id)}
        onClose={() => setLibraryOpen(false)}
        onSelect={appendImages}
      />

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
