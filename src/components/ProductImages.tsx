"use client";

import { useRef, useState } from "react";

export type ImgItem = { id: number; url: string };

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
    return typeof id === "number" && typeof url === "string" ? { id, url } : null;
  };

  async function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErr(null);
    const remaining = Math.max(0, max - value.length);
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      resetInput();
      return;
    }

    setBusy(true);
    try {
      const uploaded: ImgItem[] = [];
      for (const f of toUpload) {
        const fd = new FormData();
        fd.append("file", f);

        const r = await fetch("/api/media/upload", { method: "POST", body: fd });
        const raw = await r.text();

        if (raw.trim().startsWith("<")) {
          throw new Error("Upload failed (HTML response). Check WP auth.");
        }

        let j: any = {};
        try {
          j = JSON.parse(raw);
        } catch {
          throw new Error("Upload failed (non-JSON response).");
        }

        if (!r.ok) {
          throw new Error(j?.error || j?.message || "Upload failed");
        }

        const normalized = normalizeUploadPayload(j);
        if (!normalized) {
          console.warn("Unexpected upload payload:", j);
          throw new Error("Upload response malformed");
        }
        uploaded.push(normalized);
      }

      // de-dup by id; cap to max
      const next = [...value, ...uploaded].filter(
        (img, idx, arr) => arr.findIndex((x) => x.id === img.id) === idx
      );
      onChange(next.slice(0, max));
    } catch (e: any) {
      setErr(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      resetInput();
    }
  }

  return (
    <div>
      <div className="font-medium mb-2">
        Images <span className="text-xs text-slate-500">(first = featured)</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={`${img.id}-${i}`} className="relative">
            <img
              src={img.url}
              alt=""
              className={`h-24 w-24 object-cover rounded border ${
                i === 0 ? "ring-2 ring-blue-500" : ""
              }`}
            />
            {i === 0 && (
              <span className="absolute top-1 left-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">
                Featured
              </span>
            )}
            <div className="absolute bottom-1 left-1 right-1 flex justify-between gap-1">
              <button
                type="button"
                aria-label="Move up"
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/90 border"
                onClick={() => move(i, -1)}
                disabled={i === 0}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/90 border"
                onClick={() => move(i, 1)}
                disabled={i === value.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                aria-label="Remove"
                className="text-[10px] px-1.5 py-0.5 rounded bg-white/90 border text-red-600"
                onClick={() => removeAt(i)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        {value.length < max && (
          <label className="h-24 w-24 border rounded grid place-items-center cursor-pointer hover:bg-gray-50">
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

      {busy && <div className="text-xs text-slate-600 mt-2">Uploading…</div>}
      {err && <div className="text-xs text-red-700 mt-2">{err}</div>}
    </div>
  );
}
