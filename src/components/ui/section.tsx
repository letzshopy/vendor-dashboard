import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type SectionSurface =
  | "plain"
  | "subtle"
  | "card";

type SectionProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  surface?: SectionSurface;
  className?: string;
  contentClassName?: string;
};

const surfaceClasses: Record<
  SectionSurface,
  string
> = {
  plain: "ls-section",
  subtle:
    "rounded-2xl bg-surface-soft px-4 py-4 md:px-5",
  card:
    "rounded-2xl border border-border bg-card px-4 py-4 shadow-[0_6px_20px_rgba(38,51,95,0.04)] md:px-5",
};

export function Section({
  title,
  description,
  action,
  children,
  surface = "plain",
  className,
  contentClassName,
}: SectionProps) {
  return (
    <section
      className={cn(
        surfaceClasses[surface],
        className
      )}
    >
      {title || description || action ? (
        <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-[16px] font-bold text-heading">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          {action ? (
            <div className="shrink-0">
              {action}
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "min-w-0",
          contentClassName
        )}
      >
        {children}
      </div>
    </section>
  );
}
