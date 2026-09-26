import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <main
      className="mx-auto min-w-0 max-w-[1540px] pb-24 md:pb-8"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="space-y-2 pb-4 pt-1 md:pb-5">
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <Skeleton className="h-44 w-full rounded-2xl md:h-36" />

      <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>

      <div className="mt-4 flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] xl:gap-5">
        <div className="contents xl:block xl:space-y-5">
          <Skeleton className="order-4 h-80 w-full rounded-2xl xl:order-none" />
          <Skeleton className="order-3 h-72 w-full rounded-2xl xl:order-none" />
        </div>

        <aside className="contents xl:block xl:space-y-5">
          <Skeleton className="order-1 h-64 w-full rounded-2xl xl:order-none" />
          <Skeleton className="order-2 h-64 w-full rounded-2xl xl:order-none" />
          <Skeleton className="order-5 h-56 w-full rounded-2xl xl:order-none" />
        </aside>
      </div>

      <span className="sr-only">Loading dashboard…</span>
    </main>
  );
}
