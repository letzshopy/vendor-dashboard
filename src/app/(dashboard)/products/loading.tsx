import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8"
      role="status"
      aria-label="Loading products"
    >
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="mt-0 overflow-hidden rounded-xl border border-border bg-card md:mt-5 md:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-3">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="border-b border-border p-3">
          <Skeleton className="h-11 w-full" />
        </div>

        <div className="grid gap-2.5 p-3 md:grid-cols-2 lg:grid-cols-1">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="hidden h-20 w-full lg:block" />
          <Skeleton className="hidden h-20 w-full lg:block" />
        </div>
      </div>

      <span className="sr-only">Loading products…</span>
    </main>
  );
}
