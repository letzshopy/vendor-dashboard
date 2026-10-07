"use client";

import {
  useRef,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import {
  useFormStatus,
} from "react-dom";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";

import {
  deleteFeedbackAction,
  toggleFeedbackStatusAction,
} from "./actions";

function ToggleButton({
  hidden,
}: {
  hidden: boolean;
}) {
  const {
    pending,
  } =
    useFormStatus();

  return (
    <AsyncButton
      type="submit"
      variant="ghost"
      size="sm"
      loading={pending}
      loadingLabel={
        hidden
          ? "Showing…"
          : "Hiding…"
      }
      className="w-full sm:w-auto"
    >
      {hidden ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
      {hidden
        ? "Show"
        : "Hide"}
    </AsyncButton>
  );
}

export default function FeedbackActionsClient({
  id,
  status,
}: {
  id: string | number;
  status: string;
}) {
  const hidden =
    status === "hide";

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(false);

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const deleteFormRef =
    useRef<HTMLFormElement>(
      null
    );

  return (
    <>
      <form
        action={
          toggleFeedbackStatusAction
        }
        className="min-w-0"
      >
        <input
          type="hidden"
          name="id"
          value={id}
        />
        <input
          type="hidden"
          name="status"
          value={
            hidden
              ? "show"
              : "hide"
          }
        />

        <ToggleButton
          hidden={hidden}
        />
      </form>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full text-destructive sm:w-auto"
        onClick={() =>
          setDeleteOpen(
            true
          )
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <form
        ref={
          deleteFormRef
        }
        action={
          deleteFeedbackAction
        }
        onSubmit={() =>
          setDeleting(true)
        }
        className="hidden"
      >
        <input
          type="hidden"
          name="id"
          value={id}
        />
      </form>

      <ConfirmDialog
        open={
          deleteOpen
        }
        onOpenChange={
          setDeleteOpen
        }
        title="Delete feedback?"
        description="This customer feedback will be removed from the dashboard and storefront."
        confirmLabel="Delete feedback"
        cancelLabel="Cancel"
        destructive
        loading={deleting}
        loadingLabel="Deleting…"
        onConfirm={() => {
          deleteFormRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
