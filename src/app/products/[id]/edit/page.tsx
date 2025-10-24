import Flash from "@/components/Flash";
import EditProductClient from "@/components/EditProductClient";

export const dynamic = "force-dynamic";

export default function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { mode?: string; saved?: string };
}) {
  const mode = (searchParams?.mode || "").toLowerCase(); // "detail" or ""
  const showSaved = "saved" in (searchParams || {}); // ✅ presence-based, like Media

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">
          {mode === "detail" ? "Product Detail" : "Edit Product"}
        </h1>
      </div>

      {/* ✅ Flash after successful save (same as Media) */}
      {showSaved ? (
        <div className="mb-3">
          <Flash message="Saved successfully." />
        </div>
      ) : null}

      <EditProductClient id={params.id} mode={mode === "detail" ? "detail" : "edit"} />
    </main>
  );
}
