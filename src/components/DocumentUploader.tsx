"use client";

import { useRef, useState } from "react";

export default function DocumentUploader({
  onUploaded,
  label = "Upload file",
  accept = "image/*,.pdf",
}: {
  onUploaded: (url: string, filename?: string) => void;
  label?: string;
  accept?: string;
}) {
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
      onUploaded(data.url, data.filename);
    } catch (e: any) {
      setErr(e.message || "Upload failed");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Uploading…" : label}
      </button>
      <input ref={inputRef} type="file" accept={accept} onChange={onChange} className="hidden" />
      {err && <div className="text-xs text-red-600">{err}</div>}
    </div>
  );
}
