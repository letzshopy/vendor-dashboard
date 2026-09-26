import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8"
      role="status"
      aria-label="Loading product details"
    >
      <Skeleton className="h-40 w-full" />

      <div className="mt-3 grid gap-3 md:mt-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Skeleton className="h-[360px] w-full" />
        <div className="space-y-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>

      <Skeleton className="mt-3 h-56 w-full" />
      <span className="sr-only">Loading product details…</span>
    </main>
  );
}
