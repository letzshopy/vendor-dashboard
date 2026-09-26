import { Skeleton } from "@/components/ui/skeleton";

export default function CreateOrderLoading() {
  return (
    <main
      className="mx-auto w-full min-w-0 max-w-7xl pb-32 md:pb-8"
      role="status"
      aria-label="Loading create order"
    >
      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="mt-0 grid gap-3 md:mt-5 md:gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3 md:space-y-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>

        <Skeleton className="hidden h-72 w-full xl:block" />
      </div>

      <span className="sr-only">Loading create order…</span>
    </main>
  );
}
