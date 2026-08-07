"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Loader2,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import {
  actionFeedback,
  getActionFeedbackServerSnapshot,
  getActionFeedbackSnapshot,
  subscribeActionFeedback,
  type ActionFeedbackTone,
} from "@/lib/actionFeedback";

const LOADING_DELAY_MS = 450;

const DEFAULT_DURATION: Record<
  Exclude<ActionFeedbackTone, "loading">,
  number
> = {
  success: 2800,
  error: 5200,
  warning: 4200,
  info: 3200,
};

const toneClass: Record<
  ActionFeedbackTone,
  string
> = {
  loading:
    "bg-[#2E3F7D] text-white ring-[#2E3F7D]/20",
  success:
    "bg-[#177245] text-white ring-emerald-950/10",
  error:
    "bg-[#B42318] text-white ring-red-950/10",
  warning:
    "bg-[#A15C00] text-white ring-amber-950/10",
  info:
    "bg-[#2E3F7D] text-white ring-[#2E3F7D]/20",
};

function FeedbackIcon({
  tone,
}: {
  tone: ActionFeedbackTone;
}) {
  const iconClass =
    "h-5 w-5 shrink-0";

  if (tone === "loading") {
    return (
      <Loader2
        className={`${iconClass} animate-spin`}
      />
    );
  }

  if (tone === "success") {
    return (
      <CheckCircle2
        className={iconClass}
      />
    );
  }

  if (tone === "error") {
    return (
      <CircleAlert
        className={iconClass}
      />
    );
  }

  if (tone === "warning") {
    return (
      <AlertTriangle
        className={iconClass}
      />
    );
  }

  return (
    <Info
      className={iconClass}
    />
  );
}

export default function ActionFeedbackHost() {
  const feedback = useSyncExternalStore(
    subscribeActionFeedback,
    getActionFeedbackSnapshot,
    getActionFeedbackServerSnapshot
  );

  const [visible, setVisible] =
    useState(false);

  useEffect(() => {
    if (!feedback) {
      setVisible(false);
      return;
    }

    if (feedback.tone !== "loading") {
      setVisible(true);
      return;
    }

    const elapsed =
      Date.now() -
      feedback.startedAt;

    if (elapsed >= LOADING_DELAY_MS) {
      setVisible(true);
      return;
    }

    setVisible(false);

    const timer = window.setTimeout(
      () => {
        setVisible(true);
      },
      LOADING_DELAY_MS - elapsed
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [feedback]);

  useEffect(() => {
    if (
      !feedback ||
      feedback.tone === "loading"
    ) {
      return;
    }

    const duration =
      feedback.durationMs ??
      DEFAULT_DURATION[feedback.tone];

    const timer = window.setTimeout(
      () => {
        actionFeedback.dismiss(
          feedback.id
        );
      },
      duration
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [feedback]);

  if (!feedback || !visible) {
    return null;
  }

  const assertive =
    feedback.tone === "error";

  return (
    <div
      className="pointer-events-none fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-[120] md:bottom-auto md:left-auto md:right-5 md:top-5 md:w-[390px]"
      aria-live={
        assertive
          ? "assertive"
          : "polite"
      }
      aria-atomic="true"
    >
      <div
        role={
          assertive
            ? "alert"
            : "status"
        }
        className={`pointer-events-auto overflow-hidden rounded-2xl shadow-2xl ring-1 ${toneClass[feedback.tone]}`}
      >
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15">
            <FeedbackIcon
              tone={feedback.tone}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold leading-5">
              {feedback.title}
            </div>

            {feedback.message && (
              <div className="mt-0.5 text-[12px] font-medium leading-5 text-white/85">
                {feedback.message}
              </div>
            )}
          </div>

          {feedback.tone !== "loading" && (
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() =>
                actionFeedback.dismiss(
                  feedback.id
                )
              }
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {feedback.tone === "loading" && (
          <div className="h-1 overflow-hidden bg-white/10">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-white/75" />
          </div>
        )}
      </div>
    </div>
  );
}
