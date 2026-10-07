"use client";

import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type {
  ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  popupClassName?: string;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  popupClassName,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection="down"
    >
      <Drawer.VirtualKeyboardProvider>
        <Drawer.Portal>
          <Drawer.Backdrop className="ls-overlay" />

          <Drawer.Viewport className="ls-drawer-viewport">
            <Drawer.Popup
              className={cn(
                "ls-drawer-popup",
                popupClassName
              )}
            >
              <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border" />

              <Drawer.Content className="max-h-[calc(86dvh-var(--ls-safe-area-bottom))] overflow-y-auto overscroll-contain px-4 pb-5 pt-3 sm:px-5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Drawer.Title className="text-lg font-bold text-heading">
                      {title}
                    </Drawer.Title>

                    {description ? (
                      <Drawer.Description className="mt-1 text-sm leading-5 text-muted-foreground">
                        {description}
                      </Drawer.Description>
                    ) : null}
                  </div>

                  <Drawer.Close
                    aria-label="Close"
                    className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                  </Drawer.Close>
                </div>

                <div className="mt-4 min-w-0">
                  {children}
                </div>
              </Drawer.Content>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.VirtualKeyboardProvider>
    </Drawer.Root>
  );
}
