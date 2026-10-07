import { Skeleton } from "@/components/ui/skeleton";

export default function OrderDetailLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8"
      role="status"
      aria-label="Loading order details"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
        <div className="space-y-3 p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>

          <Skeleton className="h-11 w-full" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>

      <Skeleton className="mt-3 h-72 w-full" />
      <span className="sr-only">Loading order details…</span>
    </main>
  );
}
