// src/components/CopyUrlBox.tsx
"use client";

import { useRef } from "react";

export default function CopyUrlBox({ url }: { url: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert("URL copied");
    } catch {
      // fallback: select text so user can Ctrl+C
      inputRef.current?.select();
    }
  };

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        readOnly
        value={url}
        className="w-full rounded border px-3 py-2 text-xs"
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        type="button"
        onClick={copy}
        className="mt-2 rounded-xl border px-3 py-1.5 text-sm"
      >
        Copy URL
      </button>
    </div>
  );
}
