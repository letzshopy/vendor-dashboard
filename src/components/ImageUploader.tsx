"use client";

import { useRef, useState } from "react";

export default function ImageUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("filename", file.name);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      onUploaded(data.url);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset input so same file can be selected again
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        className="border rounded-lg p-4 text-sm flex flex-col items-center justify-center gap-2 bg-gray-50"
      >
        <div>Drag & drop an image here</div>
        <div>or</div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border px-3 py-1.5 hover:bg-white"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Choose file"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onInputChange}
          className="hidden"
        />
      </div>
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
    </div>
  );
}
