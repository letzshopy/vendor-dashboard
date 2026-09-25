import {
  Skeleton,
} from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-7xl pb-28 md:pb-8"
      aria-label="Loading orders"
      role="status"
    >
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-[30rem] max-w-full" />
      </div>

      <div className="space-y-3 md:mt-5">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border md:hidden">
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
          <Skeleton className="h-16 rounded-none" />
        </div>

        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-10 w-24 shrink-0" />
          <Skeleton className="h-10 w-28 shrink-0" />
          <Skeleton className="h-10 w-24 shrink-0" />
          <Skeleton className="h-10 w-28 shrink-0" />
        </div>

        <div className="rounded-xl border border-border bg-card p-2.5 md:rounded-2xl md:p-3">
          <Skeleton className="h-11 w-full" />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card md:rounded-2xl">
          <div className="flex items-center justify-between border-b border-border p-3 md:p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-10 w-24" />
          </div>

          <div className="grid gap-2.5 p-2.5 md:grid-cols-2 md:p-3 lg:grid-cols-1">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="hidden h-20 w-full lg:block" />
            <Skeleton className="hidden h-20 w-full lg:block" />
          </div>
        </div>
      </div>

      <span className="sr-only">
        Loading orders…
      </span>
    </main>
  );
}
