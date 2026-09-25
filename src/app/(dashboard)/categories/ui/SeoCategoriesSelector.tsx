"use client";

import {
  Check,
  Pencil,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  Button,
} from "@/components/ui/button";
import {
  Input,
} from "@/components/ui/input";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type Cat = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
};

type Props = {
  categories: Cat[];
};

const MIN_CATEGORIES = 3;
const MAX_CATEGORIES = 6;

type JsonRecord =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is JsonRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(value)
  );
}

function responseError(
  value: unknown,
  fallback: string
): string {
  return (
    isRecord(value) &&
    typeof value.error ===
      "string"
      ? value.error
      : fallback
  );
}

export default function SeoCategoriesSelector({
  categories,
}: Props) {
  const [
    selectedIds,
    setSelectedIds,
  ] =
    useState<number[]>(
      []
    );

  const [
    savedIds,
    setSavedIds,
  ] =
    useState<number[]>(
      []
    );

  const [query, setQuery] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    localError,
    setLocalError,
  ] =
    useState("");

  const cleanCategories =
    useMemo(
      () =>
        categories
          .filter(
            (category) =>
              category.id >
                0 &&
              category.name &&
              category.slug !==
                "uncategorized"
          )
          .sort((a, b) =>
            a.name.localeCompare(
              b.name
            )
          ),
      [categories]
    );

  const selectedCategories =
    useMemo(
      () =>
        selectedIds
          .map((id) =>
            cleanCategories.find(
              (
                category
              ) =>
                category.id ===
                id
            )
          )
          .filter(
            Boolean
          ) as Cat[],
      [
        selectedIds,
        cleanCategories,
      ]
    );

  const suggestions =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (
        !normalized
      ) {
        return [];
      }

      return cleanCategories
        .filter(
          (category) =>
            !selectedIds.includes(
              category.id
            )
        )
        .filter(
          (category) =>
            category.name
              .toLowerCase()
              .includes(
                normalized
              )
        )
        .slice(0, 8);
    }, [
      query,
      cleanCategories,
      selectedIds,
    ]);

  useEffect(() => {
    let alive = true;

    async function loadSaved() {
      setLoading(true);
      setLocalError("");

      try {
        const response =
          await fetch(
            "/api/categories/seo",
            {
              method:
                "GET",
              cache:
                "no-store",
            }
          );

        const payload: unknown =
          await response
            .json()
            .catch(
              () => null
            );

        if (
          !response.ok ||
          (
            isRecord(
              payload
            ) &&
            payload.ok ===
              false
          )
        ) {
          throw new Error(
            responseError(
              payload,
              "Unable to load website featured categories."
            )
          );
        }

        if (
          !alive ||
          !isRecord(
            payload
          )
        ) {
          return;
        }

        const ids =
          Array.isArray(
            payload.selectedIds
          )
            ? payload.selectedIds
                .map(
                  (
                    id
                  ) =>
                    Number(
                      id
                    )
                )
                .filter(
                  (
                    id
                  ) =>
                    Number.isInteger(
                      id
                    ) &&
                    id > 0
                )
                .slice(
                  0,
                  MAX_CATEGORIES
                )
            : [];

        setSelectedIds(
          ids
        );
        setSavedIds(
          ids
        );
      } catch (
        error: unknown
      ) {
        if (alive) {
          setLocalError(
            error instanceof
              Error
              ? error.message
              : "Unable to load website featured categories."
          );
        }
      } finally {
        if (alive) {
          setLoading(
            false
          );
        }
      }
    }

    void loadSaved();

    return () => {
      alive = false;
    };
  }, []);

  function addCategory(
    category: Cat
  ) {
    setLocalError("");

    if (
      selectedIds.includes(
        category.id
      )
    ) {
      return;
    }

    if (
      selectedIds.length >=
      MAX_CATEGORIES
    ) {
      setLocalError(
        `Choose up to ${MAX_CATEGORIES} categories.`
      );
      return;
    }

    setSelectedIds(
      (
        previous
      ) => [
        ...previous,
        category.id,
      ].slice(
        0,
        MAX_CATEGORIES
      )
    );

    setQuery("");
  }

  function removeCategory(
    id: number
  ) {
    setLocalError("");

    setSelectedIds(
      (
        previous
      ) =>
        previous.filter(
          (
            item
          ) =>
            item !== id
        )
    );
  }

  function cancelEditing() {
    setSelectedIds(
      savedIds
    );
    setQuery("");
    setLocalError("");
    setEditing(false);
  }

  async function saveCategories() {
    setLocalError("");

    if (
      selectedIds.length <
      MIN_CATEGORIES
    ) {
      setLocalError(
        `Choose at least ${MIN_CATEGORIES} categories.`
      );
      return;
    }

    if (
      selectedIds.length >
      MAX_CATEGORIES
    ) {
      setLocalError(
        `Choose up to ${MAX_CATEGORIES} categories.`
      );
      return;
    }

    const feedbackId =
      "category-highlights-save";

    setSaving(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving featured categories…",
    });

    try {
      const response =
        await fetch(
          "/api/categories/seo",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                ids:
                  selectedIds.slice(
                    0,
                    MAX_CATEGORIES
                  ),
              }),
          }
        );

      const payload: unknown =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok ||
        (
          isRecord(
            payload
          ) &&
          payload.ok ===
            false
        )
      ) {
        throw new Error(
          responseError(
            payload,
            "Unable to save website featured categories."
          )
        );
      }

      const ids =
        isRecord(payload) &&
        Array.isArray(
          payload.selectedIds
        )
          ? payload.selectedIds
              .map(
                (
                  id
                ) =>
                  Number(
                    id
                  )
              )
              .filter(
                (
                  id
                ) =>
                  Number.isInteger(
                    id
                  ) &&
                  id > 0
              )
              .slice(
                0,
                MAX_CATEGORIES
              )
          : selectedIds.slice(
              0,
              MAX_CATEGORIES
            );

      setSelectedIds(
        ids
      );
      setSavedIds(
        ids
      );
      setEditing(
        false
      );
      setQuery("");

      actionFeedback.success({
        id: feedbackId,
        title:
          "Featured categories saved",
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save featured categories",
        message:
          error instanceof
            Error
            ? error.message
            : "Unable to save website featured categories.",
        durationMs: 4200,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-visible rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 px-4 py-4 md:px-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <Sparkles className="h-4.5 w-4.5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-heading">
            Website Featured Categories
          </h2>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            These categories are highlighted on your storefront and footer.
          </p>
        </div>

        {!loading &&
        !editing ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setEditing(true)
            }
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        ) : null}
      </div>

      <div className="border-t border-border px-4 py-4 md:px-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading featured categories…
          </p>
        ) : selectedCategories.length >
          0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(
              (
                category
              ) => (
                <span
                  key={
                    category.id
                  }
                  className="inline-flex min-h-9 items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-semibold text-secondary-foreground"
                >
                  <Check className="h-3.5 w-3.5" />

                  <span>
                    {
                      category.name
                    }
                  </span>

                  {editing ? (
                    <button
                      type="button"
                      onClick={() =>
                        removeCategory(
                          category.id
                        )
                      }
                      className="ls-focus-ring grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-white/70 hover:text-foreground"
                      aria-label={
                        `Remove ${category.name}`
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No featured categories selected.
          </p>
        )}

        {editing ? (
          <>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(
                  event
                ) => {
                  setQuery(
                    event.target.value
                  );
                  setLocalError(
                    ""
                  );
                }}
                disabled={
                  selectedIds.length >=
                  MAX_CATEGORIES
                }
                placeholder={
                  selectedIds.length >=
                  MAX_CATEGORIES
                    ? "Maximum categories selected"
                    : "Search categories to add"
                }
                className="pl-10"
              />

              {suggestions.length >
              0 ? (
                <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
                  {suggestions.map(
                    (
                      category
                    ) => (
                      <button
                        key={
                          category.id
                        }
                        type="button"
                        onMouseDown={(
                          event
                        ) => {
                          event.preventDefault();
                          addCategory(
                            category
                          );
                        }}
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="truncate font-semibold text-foreground">
                          {
                            category.name
                          }
                        </span>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {
                            category.count ||
                            0
                          }{" "}
                          products
                        </span>
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>

            {localError ? (
              <p className="mt-3 text-sm font-semibold text-destructive">
                {localError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted-foreground">
                Choose{" "}
                {MIN_CATEGORIES}–
                {MAX_CATEGORIES} categories.
              </span>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    cancelEditing
                  }
                  disabled={
                    saving
                  }
                >
                  Cancel
                </Button>

                <AsyncButton
                  type="button"
                  loading={
                    saving
                  }
                  loadingLabel="Saving…"
                  onClick={() =>
                    void saveCategories()
                  }
                >
                  Save
                </AsyncButton>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
