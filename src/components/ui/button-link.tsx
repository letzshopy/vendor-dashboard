import Link, {
  type LinkProps,
} from "next/link";
import type {
  AnchorHTMLAttributes,
} from "react";

import {
  buttonClassName,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";

type ButtonLinkProps =
  LinkProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  > & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  };

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({
        variant,
        size,
        className,
      })}
      {...props}
    />
  );
}
