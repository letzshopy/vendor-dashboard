"use client";

export type ActionFeedbackTone =
  | "loading"
  | "success"
  | "error"
  | "warning"
  | "info";

export type ActionFeedbackState = {
  id: string;
  tone: ActionFeedbackTone;
  title: string;
  message?: string;
  durationMs?: number;
  startedAt: number;
  updatedAt: number;
};

type FeedbackInput = {
  id: string;
  title: string;
  message?: string;
  durationMs?: number;
};

let snapshot: ActionFeedbackState | null =
  null;

const listeners =
  new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function show(
  tone: ActionFeedbackTone,
  input: FeedbackInput
) {
  const now = Date.now();

  const preserveStartedAt =
    tone === "loading" &&
    snapshot?.tone === "loading" &&
    snapshot.id === input.id;

  snapshot = {
    ...input,
    tone,
    startedAt:
      preserveStartedAt && snapshot
        ? snapshot.startedAt
        : now,
    updatedAt: now,
  };

  emit();
}

export const actionFeedback = {
  loading(input: FeedbackInput) {
    show("loading", input);
  },

  success(input: FeedbackInput) {
    show("success", input);
  },

  error(input: FeedbackInput) {
    show("error", input);
  },

  warning(input: FeedbackInput) {
    show("warning", input);
  },

  info(input: FeedbackInput) {
    show("info", input);
  },

  dismiss(id?: string) {
    if (
      id &&
      snapshot &&
      snapshot.id !== id
    ) {
      return;
    }

    snapshot = null;
    emit();
  },
};

export function subscribeActionFeedback(
  listener: () => void
) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getActionFeedbackSnapshot() {
  return snapshot;
}

export function getActionFeedbackServerSnapshot() {
  return null;
}
