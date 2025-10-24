"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  accept?: string;
  maxSizeMB?: number;        // default 5
  value?: File | null;
  onChange: (file: File | null) => void;
  imagePreview?: boolean;    // show thumbnail if image/*
  helper?: string;
  buttonText?: string;       // default "Upload"
};

export default function Upload({
  label,
  accept,
  maxSizeMB = 5,
  value,
  onChange,
  imagePreview = false,
  helper,
  buttonText = "Upload",
}: Props) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(file: File | null) {
    setError(null);
    if (!file) { onChange(null); setPreview(null); return; }

    if (accept && !file.type.match(accept.replace(/\*/g, ".*"))) {
      setError("Invalid file type");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large (>${maxSizeMB} MB)`);
      return;
    }
    if (imagePreview && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
    onChange(file);
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>

      {/* Hidden file input */}
      <input
        id={id}
        type="file"
        className="hidden"
        accept={accept}
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />

      {/* Visible button + filename + check */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => (document.getElementById(id) as HTMLInputElement)?.click()}
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
        >
          {buttonText}
        </button>

        {value && (
          <div className="flex items-center gap-2 text-sm">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-600">
              <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
            </svg>
            <span className="font-medium">{value.name}</span>
            <span className="text-gray-500">
              ({(value.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        )}
      </div>

      {helper && <p className="text-xs text-gray-500">{helper}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {preview && (
        <div className="mt-2">
          <img src={preview} alt="preview" className="h-16 w-16 rounded object-cover border" />
        </div>
      )}
    </div>
  );
}
