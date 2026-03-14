"use client";

import { useRef, useState } from "react";

export type ImgItem = { id: number; url: string };

const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_DIMENSION = 1800;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create compressed image"));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_FILE_SIZE_BYTES) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);

    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;

    const largestSide = Math.max(originalWidth, originalHeight);
    const initialScale =
      largestSide > MAX_DIMENSION ? MAX_DIMENSION / largestSide : 1;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Canvas is not supported in this browser");
    }

    const qualitySteps = [0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
    const dimensionSteps = [1, 0.9, 0.8, 0.7];

    for (const dimFactor of dimensionSteps) {
      const scale = initialScale * dimFactor;
      const width = Math.max(1, Math.round(originalWidth * scale));
      const height = Math.max(1, Math.round(originalHeight * scale));

      canvas.width = width;
      canvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      for (const quality of qualitySteps) {
        const blob = await canvasToBlob(canvas, "image/jpeg", quality);

        if (blob.size <= MAX_FILE_SIZE_BYTES) {
          const baseName =
            file.name.replace(/\.[^.]+$/, "") || `image-${Date.now()}`;

          return new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
        }
      }
    }

    throw new Error(
      "Image is too large even after compression. Please choose a smaller image."
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
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
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (i: number) => {
    const next = value.slice(0, i).concat(value.slice(i + 1));
    onChange(next);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const normalizeUploadPayload = (j: any): ImgItem | null => {
    if (!j || typeof j !== "object") return null;

    const c =
      j.attachment ??
      j.media ??
      j.file ??
      j.data ??
      (Array.isArray(j) && j.length === 1 ? j[0] : j);

    const idCandidates = [
      j?.id,
      j?.mediaId,
      j?.media_id,
      j?.attachment?.id,
      j?.data?.id,
      c?.id,
    ]
      .map((v) => (typeof v === "string" ? parseInt(v, 10) : v))
      .filter((x) => Number.isFinite(x)) as number[];

    const urlCandidates = [
      j?.url,
      j?.src,
      j?.source_url,
      j?.guid,
      j?.guid?.rendered,
      j?.attachment?.url,
      j?.data?.source_url,
      c?.url,
      c?.src,
      c?.source_url,
      c?.guid,
      c?.guid?.rendered,
    ].filter((x) => typeof x === "string");

    const id = idCandidates[0] as number | undefined;
    const url = urlCandidates[0] as string | undefined;

    return typeof id === "number" && typeof url === "string"
      ? { id, url }
      : null;
  };

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErr(null);

    const remaining = Math.max(0, max - value.length);
    const selected = Array.from(files).slice(0, remaining);

    if (selected.length === 0) {
      resetInput();
      return;
    }

    setBusy(true);

    try {
      const uploaded: ImgItem[] = [];

      for (const originalFile of selected) {
        let fileToUpload = originalFile;

        if (originalFile.size > MAX_FILE_SIZE_BYTES) {
          setBusyText(`Optimizing ${originalFile.name}...`);
          fileToUpload = await compressImageIfNeeded(originalFile);
        }

        setBusyText(`Uploading ${fileToUpload.name}...`);

        const fd = new FormData();
        fd.append("file", fileToUpload);

        const r = await fetch("/api/media/upload", {
          method: "POST",
          body: fd,
        });

        const raw = await r.text();

        if (r.status === 413 || raw.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
          throw new Error("Image must be under 4 MB for dashboard upload.");
        }

        if (raw.trim().startsWith("<")) {
          throw new Error("Upload failed. Please try a smaller image.");
        }

        let j: any = {};
        try {
          j = JSON.parse(raw);
        } catch {
          throw new Error("Upload failed. Please try a smaller image.");
        }

        if (!r.ok) {
          const msg = String(j?.error || j?.message || "Upload failed");

          if (
            r.status === 413 ||
            msg.includes("FUNCTION_PAYLOAD_TOO_LARGE") ||
            msg.toLowerCase().includes("request entity too large")
          ) {
            throw new Error("Image must be under 4 MB for dashboard upload.");
          }

          throw new Error(msg);
        }

        const normalized = normalizeUploadPayload(j);
        if (!normalized) {
          console.warn("Unexpected upload payload:", j);
          throw new Error("Upload response malformed");
        }

        uploaded.push(normalized);
      }

      const next = [...value, ...uploaded].filter(
        (img, idx, arr) => arr.findIndex((x) => x.id === img.id) === idx
      );

      onChange(next.slice(0, max));
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      setBusyText(null);
      resetInput();
    }
  }

  return (
    <div>
      <div className="mb-2 font-medium">
        Images{" "}
        <span className="text-xs text-slate-500">(first = featured)</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={`${img.id}-${i}`} className="relative">
            <img
              src={img.url}
              alt=""
              className={`h-24 w-24 rounded border object-cover ${
                i === 0 ? "ring-2 ring-blue-500" : ""
              }`}
            />
            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">
                Featured
              </span>
            )}
            <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
              <button
                type="button"
                aria-label="Move up"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px]"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px]"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove"
                className="rounded border bg-white/90 px-1.5 py-0.5 text-[10px] text-red-600"
                onClick={() => removeAt(i)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {value.length < max && (
          <label className="grid h-24 w-24 cursor-pointer place-items-center rounded border hover:bg-gray-50">
            <span className="text-sm">+ Add</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={pickFiles}
            />
          </label>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <div className="text-xs text-slate-500">
          Large images are automatically optimized before upload.
        </div>
        <div className="text-xs font-medium text-amber-600">
          
        </div>
      </div>

      {busy && (
        <div className="mt-2 text-xs text-slate-600">
          {busyText || "Uploading..."}
        </div>
      )}

      {err && <div className="mt-2 text-xs text-red-700">{err}</div>}
    </div>
  );
}