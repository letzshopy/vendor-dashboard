// src/app/media/page.tsx
import MediaClient from "@/components/MediaClient";

export const dynamic = "force-dynamic";

export default function MediaPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 via-sky-50 to-rose-50 px-5 py-4">
        <h1 className="text-xl font-semibold text-slate-900">Media</h1>
        <p className="mt-1 text-sm text-slate-600">
          Upload, preview and reuse images across your store. Use bulk actions
          to copy URLs or delete unused files.
        </p>
      </div>

      <MediaClient defaultView="grid" />
    </main>
  );
}
