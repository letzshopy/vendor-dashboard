import { Skeleton } from "@/components/ui/skeleton";

export default function MediaLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-[1540px] pb-28 md:pb-8"
      role="status"
      aria-label="Loading media"
    >
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="mt-0 overflow-hidden rounded-2xl border border-border bg-card md:mt-5">
        <Skeleton className="h-20 w-full rounded-none" />
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border p-0">
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
        </div>

        <div className="space-y-3 p-3 md:p-4">
          <Skeleton className="h-11 w-full" />

          <div className="flex gap-2">
            <Skeleton className="h-9 w-16 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-20 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-2.5 md:p-3">
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading media…</span>
    </main>
  );
}
