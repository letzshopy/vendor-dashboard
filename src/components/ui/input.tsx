import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input(
  { className, type, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "ls-focus-ring h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(25,35,75,0.03)] placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        className
      )}
      {...props}
    />
  );
});
