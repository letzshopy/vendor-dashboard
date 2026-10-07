"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Button,
  type ButtonProps,
} from "@/components/ui/button";

export interface AsyncButtonProps
  extends ButtonProps {
  loading?: boolean;
  loadingLabel?: string;
}

export const AsyncButton = React.forwardRef<
  HTMLButtonElement,
  AsyncButtonProps
>(function AsyncButton(
  {
    loading = false,
    loadingLabel = "Working…",
    disabled,
    children,
    ...props
  },
  ref
) {
  return (
    <Button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
          <span>{loadingLabel}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
});
