import * as React from "react";

import { cn } from "@/lib/utils";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "ls-focus-ring h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
