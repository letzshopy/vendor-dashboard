import type {
  HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-xl bg-slate-200/80",
        className
      )}
      {...props}
    />
  );
}

export function PageSkeleton() {
  return (
    <div
      className="ls-page space-y-5"
      aria-label="Loading page"
      role="status"
    >
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="space-y-3 border-t border-border pt-5">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>

      <span className="sr-only">
        Loading…
      </span>
    </div>
  );
}
