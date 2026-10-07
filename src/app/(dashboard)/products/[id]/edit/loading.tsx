import { Skeleton } from "@/components/ui/skeleton";

export default function ProductEditLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl pb-28 md:pb-8"
      role="status"
      aria-label="Loading product editor"
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Skeleton className="h-20 w-full rounded-none" />
        <div className="space-y-4 p-4 md:p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      <span className="sr-only">Loading product editor…</span>
    </main>
  );
}
