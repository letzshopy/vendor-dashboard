import type {
  LucideIcon,
} from "lucide-react";
import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "ls-page-header flex",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
            {Icon ? (
              <Icon className="h-3.5 w-3.5" />
            ) : null}
            <span>{eyebrow}</span>
          </div>
        ) : null}

        <h1 className="text-[24px] font-extrabold tracking-tight text-heading md:text-[30px]">
          {title}
        </h1>

        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
