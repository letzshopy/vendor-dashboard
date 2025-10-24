// src/app/media/page.tsx
import MediaClient from "@/components/MediaClient";

export default function MediaPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-semibold mb-4">Media</h1>
      <MediaClient defaultView="grid" />
    </div>
  );
}
