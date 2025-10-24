"use client";

import { useEffect, useState } from "react";
import ImageUploader from "@/components/ImageUploader";

type PagesForm = {
  homeBannerUrl: string;
  aboutText: string;
};

export default function PagesTab() {
  const [form, setForm] = useState<PagesForm>({ homeBannerUrl: "", aboutText: "" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings/pages", { cache: "no-store" });
      const data = await res.json();
      setForm({ homeBannerUrl: data?.homeBannerUrl || "", aboutText: data?.aboutText || "" });
      setLoaded(true);
    })();
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings/pages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    alert("Saved!");
  }

  if (!loaded) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <section className="space-y-6 max-w-3xl">
      {/* Home */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">Home</div>

        <div className="text-sm mb-1">Banner image</div>
        {form.homeBannerUrl ? (
          <div className="flex items-center gap-3">
            <img
              src={form.homeBannerUrl}
              alt="Home banner"
              className="h-20 w-36 object-cover rounded border"
            />
            <button
              className="text-sm text-blue-600 underline"
              onClick={() => setForm({ ...form, homeBannerUrl: "" })}
            >
              Change
            </button>
          </div>
        ) : (
          <ImageUploader
            onUploaded={(url) => setForm({ ...form, homeBannerUrl: url })}
            label="Upload banner"
          />
        )}
        <p className="text-xs text-slate-500 mt-2">
          Recommended ~1600×500px JPG/PNG. We’ll insert this into your Home page on publish.
        </p>
      </div>

      {/* About */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-3">About</div>
        <label className="block text-sm mb-1">About content (paragraph)</label>
        <textarea
          rows={8}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="Write about your brand in 1–3 short paragraphs…"
          value={form.aboutText}
          onChange={(e) => setForm({ ...form, aboutText: e.target.value })}
        />
        <p className="text-xs text-slate-500 mt-1">
          Keep it simple. We’ll render this on the About page. You can switch to a rich editor later.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </section>
  );
}
