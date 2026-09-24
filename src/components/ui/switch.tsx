"use client";

import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

type SwitchProps =
  Omit<
    BaseSwitch.Root.Props,
    "className"
  > & {
    className?: string;
    thumbClassName?: string;
  };

export function Switch({
  className,
  thumbClassName,
  ...props
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={cn(
        "ls-focus-ring relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full bg-slate-300 p-1 transition-colors data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 data-[checked]:translate-x-5",
          thumbClassName
        )}
      />
    </BaseSwitch.Root>
  );
}
