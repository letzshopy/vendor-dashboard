import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize =
  | "sm"
  | "md"
  | "lg"
  | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:brightness-90",
  accent:
    "bg-accent text-accent-foreground shadow-sm hover:brightness-95 active:brightness-90",
  secondary:
    "bg-secondary text-secondary-foreground hover:brightness-[0.98] active:brightness-95",
  outline:
    "border border-border bg-card text-foreground hover:bg-muted",
  ghost:
    "bg-transparent text-foreground hover:bg-muted",
  danger:
    "bg-destructive text-destructive-foreground shadow-sm hover:brightness-95 active:brightness-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-xl px-3 text-xs",
  md: "min-h-11 rounded-xl px-4 text-sm",
  lg: "min-h-12 rounded-xl px-5 text-sm",
  icon: "h-11 w-11 rounded-xl p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "ls-focus-ring inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition disabled:pointer-events-none disabled:opacity-55",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
});
