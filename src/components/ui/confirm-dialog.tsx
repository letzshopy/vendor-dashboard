"use client";

import { Dialog } from "@base-ui/react/dialog";
import { AlertTriangle } from "lucide-react";

import { AsyncButton } from "@/components/ui/async-button";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  loadingLabel = "Working…",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="ls-overlay" />

        <Dialog.Viewport className="ls-dialog-viewport">
          <Dialog.Popup className="ls-dialog-popup">
            <div className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div
                  className={[
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl",
                    destructive
                      ? "bg-rose-50 text-destructive"
                      : "bg-secondary text-secondary-foreground",
                  ].join(" ")}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-lg font-bold text-heading">
                    {title}
                  </Dialog.Title>

                  {description ? (
                    <Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </Dialog.Description>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() =>
                    onOpenChange(false)
                  }
                  disabled={loading}
                >
                  {cancelLabel}
                </Button>

                <AsyncButton
                  variant={
                    destructive
                      ? "danger"
                      : "primary"
                  }
                  loading={loading}
                  loadingLabel={loadingLabel}
                  onClick={() => {
                    void onConfirm();
                  }}
                >
                  {confirmLabel}
                </AsyncButton>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
