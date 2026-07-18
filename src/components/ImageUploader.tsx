"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { MediaPurpose } from "@/lib/mediaPolicy";

type JsonRecord = Record<string, unknown>;

export type MediaUploadResult = {
  id: number;
  url: string;
  source_url: string;
  image_url: string;
  thumbnail: string;
  filename: string;
  purpose: MediaPurpose;
  scope: "catalog" | "system";
  protected: boolean;
};

export type ImageUploaderProps = {
  purpose?: MediaPurpose;
  onUploaded?: (
    url?: string,
    media?: MediaUploadResult,
  ) => void | Promise<void>;
  children?: ReactNode;
  label?: string;
  accept?: string;
  multiple?: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
function readUploadResult(value: unknown): MediaUploadResult | null {
  if (!isRecord(value)) return null;

  const id = Number(value.id);
  const url = String(value.url || value.source_url || "").trim();

  if (
    !Number.isInteger(id) ||
    id <= 0 ||
    !/^https?:\/\//i.test(url)
  ) {
    return null;
  }

  return {
    id,
    url,
    source_url: String(value.source_url || url),
    image_url: String(value.image_url || url),
    thumbnail: String(value.thumbnail || value.image_url || url),
    filename: String(value.filename || ""),
    purpose: value.purpose as MediaPurpose,
    scope: value.scope === "catalog" ? "catalog" : "system",
    protected: value.protected === true,
  };
}

function readError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Upload failed";
}

export default function ImageUploader({
  purpose = "site_image",
  onUploaded,
  children,
  label = "Upload media file",
  accept = "image/jpeg,image/png,image/webp,image/gif",
  multiple = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setPreviewUrl(null);
  }

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  async function handleFile(file: File) {
    clearPreview();
    const localPreview = URL.createObjectURL(file);
    previewRef.current = localPreview;
    setPreviewUrl(localPreview);
    setError(null);
    setLoading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body,
      });

      const parsed: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readError(parsed));
      }

      const result = readUploadResult(parsed);

      if (!result) {
        throw new Error("Upload returned an invalid response.");
      }

      await onUploaded?.(result.url, result);
    } catch (caught: unknown) {
      setError(
        caught instanceof Error ? caught.message : "Upload failed",
      );
    } finally {
      clearPreview();
      setLoading(false);
      setIsDragging(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const selected = multiple ? Array.from(files) : [files[0]];

    for (const file of selected) {
      await handleFile(file);
    }
  }

  function onInputChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    void handleFiles(event.target.files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (!loading) {
      void handleFiles(event.dataTransfer.files);
    }
  }

  const trigger = children ? (
    <span
      className="inline-block"
      onClick={() => !loading && inputRef.current?.click()}
    >
      {children}
    </span>
  ) : (
    <div
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition ${
        isDragging
          ? "border-violet-500 bg-violet-50 text-violet-800"
          : "border-slate-200 bg-white/80 text-slate-700 hover:border-violet-400 hover:bg-violet-50/70"
      }`}
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-[11px] text-white">
        +
      </span>
      <span className="text-sm">
        {loading ? "Uploading…" : label}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      {trigger}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={onInputChange}
      />

      {previewUrl && (
        <div className="relative mt-2 h-24 w-24 overflow-hidden rounded-xl border border-violet-200 bg-slate-100">
          {/* Local object URL: intentionally not passed to next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Upload preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 grid place-items-center bg-slate-950/45 px-2 text-center text-[11px] font-semibold text-white">
            Uploading…
          </div>
        </div>
      )}

      {error && (
        <div className="text-[11px] text-rose-600">{error}</div>
      )}
    </div>
  );
}
