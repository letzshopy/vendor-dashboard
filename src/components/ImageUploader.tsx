// src/components/ImageUploader.tsx
"use client";

import { useRef, useState, type ReactNode } from "react";

export type ImageUploaderProps = {
  onUploaded?: (url?: string) => void | Promise<void>;
  /** Custom trigger content. If provided, drag-drop styling is skipped. */
  children?: ReactNode;
  /** Label for the default trigger when no children are passed */
  label?: string;
  /** Accept attribute for input; default: images + PDFs */
  accept?: string;
  /** Allow selecting multiple files (will upload sequentially) */
  multiple?: boolean;
};

export default function ImageUploader({
  onUploaded,
  children,
  label = "Upload media file",
  accept = "image/*,application/pdf",
  multiple = false,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function handleFile(file: File) {
    setErr(null);
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", file.name);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: fd,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      if (onUploaded) {
        // API was originally returning { url }
        await onUploaded(data?.url);
      }
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setLoading(false);
      setIsDragging(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (multiple) {
      for (const file of Array.from(files)) {
        await handleFile(file);
      }
    } else {
      await handleFile(files[0]);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    void handleFiles(e.target.files);
    // allow selecting the same file again
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (loading) return;
    void handleFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  const trigger = children ? (
    // Custom trigger from parent (e.g. MediaClient Upload button)
    <span
      className="inline-block"
      onClick={() => !loading && inputRef.current?.click()}
    >
      {children}
    </span>
  ) : (
    // Default drag/drop pill (your old UI)
    <div
      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium shadow-sm transition
      ${
        isDragging
          ? "border-violet-500 bg-violet-50 text-violet-800"
          : "border-slate-200 bg-white/80 text-slate-700 hover:border-violet-400 hover:bg-violet-50/70"
      }`}
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
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

      {err && (
        <div className="text-[11px] text-rose-600">
          {err}
        </div>
      )}
    </div>
  );
}
