import {
  Skeleton,
} from "@/components/ui/skeleton";

export default function PackSlipsLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-[1540px] pb-28 md:pb-8"
      role="status"
      aria-label="Loading packing slips"
    >
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="mt-0 overflow-hidden rounded-2xl border border-border bg-card md:mt-5">
        <Skeleton className="h-20 w-full rounded-none" />

        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
          <Skeleton className="h-16 w-full rounded-none" />
        </div>

        <div className="space-y-3 p-3 md:p-4">
          <Skeleton className="h-11 w-full" />

          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-9 w-20 shrink-0 rounded-xl" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2.5 md:mt-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>

      <span className="sr-only">
        Loading packing slips…
      </span>
    </main>
  );
}
