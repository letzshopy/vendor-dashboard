"use client";

import {
  useState,
} from "react";
import {
  Trash2,
} from "lucide-react";

import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  Button,
} from "@/components/ui/button";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type Props = {
  id: string;
  title: string;
  action:
    (
      formData: FormData
    ) =>
      | void
      | Promise<void>;
};

export default function SaleEventDeleteButton({
  id,
  title,
  action,
}: Props) {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  async function remove() {
    if (deleting) {
      return;
    }

    setDeleting(true);

    try {
      const data =
        new FormData();

      data.set(
        "id",
        id
      );

      await action(data);
    } catch (
      error: unknown
    ) {
      setDeleting(false);

      actionFeedback.error({
        id:
          `sale-event-delete-${id}`,
        title:
          "Could not delete sale event",
        message:
          error instanceof
            Error
            ? error.message
            : "Delete failed.",
        durationMs: 4200,
      });
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() =>
          setOpen(true)
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(
          next
        ) => {
          if (!deleting) {
            setOpen(next);
          }
        }}
        title="Delete sale event?"
        description={
          `Delete “${title}”? This cannot be undone.`
        }
        confirmLabel="Delete event"
        loading={deleting}
        loadingLabel="Deleting…"
        destructive
        onConfirm={
          remove
        }
      />
    </>
  );
}
