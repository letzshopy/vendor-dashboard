"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type SaveHandler =
  () =>
    | boolean
    | void
    | Promise<boolean | void>;

type GuardRegistration = {
  id: string;
  dirty: boolean;
  save: SaveHandler;
  label?: string;
};

type PendingNavigation =
  | {
      kind: "href";
      href: string;
    }
  | {
      kind: "back";
    };

type UnsavedChangesContextValue = {
  register: (
    registration: GuardRegistration
  ) => void;
  unregister: (
    id: string
  ) => void;
  hasUnsavedChanges: boolean;
};

const UnsavedChangesContext =
  createContext<
    UnsavedChangesContextValue | null
  >(null);

const GUARD_STATE_KEY =
  "__ls_unsaved_guard";

function toRelativeHref(
  href: string
) {
  const url =
    new URL(
      href,
      window.location.href
    );

  return (
    url.pathname +
    url.search +
    url.hash
  );
}

export function UnsavedChangesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router =
    useRouter();

  const registrationsRef =
    useRef<
      Map<
        string,
        GuardRegistration
      >
    >(new Map());

  const [
    version,
    setVersion,
  ] =
    useState(0);

  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const pendingRef =
    useRef<
      PendingNavigation | null
    >(null);

  const guardEntryRef =
    useRef(false);

  const bypassPopRef =
    useRef(false);

  const afterGuardRemovalRef =
    useRef<
      (() => void) | null
    >(null);

  const hasUnsavedChanges =
    useMemo(
      () =>
        Array.from(
          registrationsRef.current.values()
        ).some(
          (
            registration
          ) =>
            registration.dirty
        ),
      [version]
    );

  const hasUnsavedRef =
    useRef(
      hasUnsavedChanges
    );

  useEffect(() => {
    hasUnsavedRef.current =
      hasUnsavedChanges;
  }, [
    hasUnsavedChanges,
  ]);

  const register =
    useCallback(
      (
        registration:
          GuardRegistration
      ) => {
        registrationsRef.current.set(
          registration.id,
          registration
        );

        setVersion(
          (current) =>
            current + 1
        );
      },
      []
    );

  const unregister =
    useCallback(
      (id: string) => {
        if (
          registrationsRef.current.delete(
            id
          )
        ) {
          setVersion(
            (current) =>
              current + 1
          );
        }
      },
      []
    );

  const insertBackGuard =
    useCallback(() => {
      if (
        guardEntryRef.current ||
        !hasUnsavedRef.current ||
        typeof window ===
          "undefined"
      ) {
        return;
      }

      const state =
        window.history.state &&
        typeof window.history.state ===
          "object"
          ? window.history.state
          : {};

      window.history.pushState(
        {
          ...state,
          [GUARD_STATE_KEY]:
            true,
        },
        "",
        window.location.href
      );

      guardEntryRef.current =
        true;
    }, []);

  const removeBackGuard =
    useCallback(
      (
        after?: () => void
      ) => {
        if (
          !guardEntryRef.current
        ) {
          after?.();
          return;
        }

        afterGuardRemovalRef.current =
          after || null;

        bypassPopRef.current =
          true;

        window.history.back();
      },
      []
    );

  useEffect(() => {
    if (
      hasUnsavedChanges &&
      !dialogOpen
    ) {
      insertBackGuard();
      return;
    }

    if (
      !hasUnsavedChanges &&
      guardEntryRef.current &&
      !dialogOpen
    ) {
      removeBackGuard();
    }
  }, [
    hasUnsavedChanges,
    dialogOpen,
    insertBackGuard,
    removeBackGuard,
  ]);

  useEffect(() => {
    function onBeforeUnload(
      event: BeforeUnloadEvent
    ) {
      if (
        !hasUnsavedRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue =
        "";
    }

    window.addEventListener(
      "beforeunload",
      onBeforeUnload
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        onBeforeUnload
      );
  }, []);

  useEffect(() => {
    function onPopState() {
      if (
        bypassPopRef.current
      ) {
        bypassPopRef.current =
          false;

        guardEntryRef.current =
          false;

        const after =
          afterGuardRemovalRef.current;

        afterGuardRemovalRef.current =
          null;

        after?.();
        return;
      }

      if (
        !hasUnsavedRef.current
      ) {
        guardEntryRef.current =
          false;
        return;
      }

      if (
        guardEntryRef.current
      ) {
        guardEntryRef.current =
          false;

        pendingRef.current = {
          kind: "back",
        };

        setDialogOpen(
          true
        );
      }
    }

    window.addEventListener(
      "popstate",
      onPopState
    );

    return () =>
      window.removeEventListener(
        "popstate",
        onPopState
      );
  }, []);

  useEffect(() => {
    function onWindowClick(
      event: MouseEvent
    ) {
      if (
        !hasUnsavedRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target =
        event.target as
          | HTMLElement
          | null;

      const anchor =
        target?.closest(
          "a[href]"
        ) as HTMLAnchorElement | null;

      if (
        !anchor ||
        anchor.hasAttribute(
          "download"
        ) ||
        (
          anchor.target &&
          anchor.target !==
            "_self"
        )
      ) {
        return;
      }

      const rawHref =
        anchor.getAttribute(
          "href"
        );

      if (
        !rawHref ||
        rawHref.startsWith(
          "#"
        ) ||
        rawHref.startsWith(
          "mailto:"
        ) ||
        rawHref.startsWith(
          "tel:"
        )
      ) {
        return;
      }

      let nextUrl: URL;

      try {
        nextUrl =
          new URL(
            anchor.href,
            window.location.href
          );
      } catch {
        return;
      }

      if (
        nextUrl.origin !==
        window.location.origin
      ) {
        return;
      }

      const currentUrl =
        new URL(
          window.location.href
        );

      if (
        nextUrl.pathname ===
          currentUrl.pathname &&
        nextUrl.search ===
          currentUrl.search &&
        nextUrl.hash ===
          currentUrl.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      pendingRef.current = {
        kind: "href",
        href:
          nextUrl.href,
      };

      setDialogOpen(
        true
      );
    }

    window.addEventListener(
      "click",
      onWindowClick,
      true
    );

    return () =>
      window.removeEventListener(
        "click",
        onWindowClick,
        true
      );
  }, []);

  function cancelNavigation() {
    const pending =
      pendingRef.current;

    pendingRef.current =
      null;

    setDialogOpen(
      false
    );

    if (
      pending?.kind ===
        "back"
    ) {
      window.setTimeout(
        () =>
          insertBackGuard(),
        0
      );
    }
  }

  async function saveAndContinue() {
    if (saving) {
      return;
    }

    setSaving(true);

    try {
      const dirtyRegistrations =
        Array.from(
          registrationsRef.current.values()
        ).filter(
          (
            registration
          ) =>
            registration.dirty
        );

      for (
        const registration of
        dirtyRegistrations
      ) {
        const result =
          await registration.save();

        if (
          result === false
        ) {
          throw new Error(
            registration.label
              ? `Could not save ${registration.label}.`
              : "Could not save your changes."
          );
        }
      }

      const pending =
        pendingRef.current;

      pendingRef.current =
        null;

      setDialogOpen(
        false
      );

      if (!pending) {
        return;
      }

      if (
        pending.kind ===
        "back"
      ) {
        bypassPopRef.current =
          true;

        window.history.back();
        return;
      }

      const relativeHref =
        toRelativeHref(
          pending.href
        );

      const navigate =
        () => {
          window.dispatchEvent(
            new Event(
              "letzshopy:navigation-start"
            )
          );

          router.push(
            relativeHref
          );
        };

      removeBackGuard(
        navigate
      );
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id:
          "unsaved-changes-save",
        title:
          "Could not save changes",
        message:
          error instanceof
            Error
            ? error.message
            : "Please try again.",
        durationMs: 4200,
      });
    } finally {
      setSaving(false);
    }
  }

  const value =
    useMemo<
      UnsavedChangesContextValue
    >(
      () => ({
        register,
        unregister,
        hasUnsavedChanges,
      }),
      [
        register,
        unregister,
        hasUnsavedChanges,
      ]
    );

  return (
    <UnsavedChangesContext.Provider
      value={value}
    >
      {children}

      <ConfirmDialog
        open={
          dialogOpen
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            cancelNavigation();
          }
        }}
        title="Unsaved changes"
        description="You have unsaved changes. Save them before leaving this page?"
        confirmLabel="Save changes"
        cancelLabel="Cancel"
        loading={saving}
        loadingLabel="Saving…"
        onConfirm={
          saveAndContinue
        }
      />
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges({
  id,
  dirty,
  save,
  label,
}: GuardRegistration) {
  const context =
    useContext(
      UnsavedChangesContext
    );

  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used inside UnsavedChangesProvider."
    );
  }

  const {
    register,
    unregister,
    hasUnsavedChanges,
  } = context;

  const saveRef =
    useRef(save);

  useEffect(() => {
    saveRef.current =
      save;
  }, [save]);

  useEffect(() => {
    register({
      id,
      dirty,
      label,
      save: () =>
        saveRef.current(),
    });

    return () =>
      unregister(
        id
      );
  }, [
    register,
    unregister,
    id,
    dirty,
    label,
  ]);

  return {
    hasUnsavedChanges,
  };
}
