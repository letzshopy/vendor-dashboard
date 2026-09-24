"use client";

import {
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import ImageUploader, {
  type MediaUploadResult,
} from "@/components/ImageUploader";
import {
  AsyncButton,
} from "@/components/ui/async-button";
import {
  BottomSheet,
} from "@/components/ui/bottom-sheet";
import {
  Button,
} from "@/components/ui/button";
import {
  ConfirmDialog,
} from "@/components/ui/confirm-dialog";
import {
  EmptyState,
} from "@/components/ui/empty-state";
import {
  Input,
} from "@/components/ui/input";
import {
  Section,
} from "@/components/ui/section";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type CategoryImage = {
  id: number;
  src: string;
};

type Category = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description?: string;
  count?: number;
  image?: CategoryImage | null;
};

type MenuItem = {
  title: string;
  url: string;
  children: MenuItem[];
};

type MenuHeading = {
  index: number;
  title: string;
};

type JsonRecord =
  Record<string, unknown>;

type EditorMode =
  | "create"
  | "edit"
  | null;

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

function asMenuItem(
  value: unknown
): MenuItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title =
    typeof value.title ===
    "string"
      ? value.title.trim()
      : "";

  if (!title) {
    return null;
  }

  return {
    title,
    url:
      typeof value.url ===
      "string"
        ? value.url
        : "",
    children:
      Array.isArray(
        value.children
      )
        ? value.children.flatMap(
            (child) => {
              const item =
                asMenuItem(
                  child
                );

              return item
                ? [item]
                : [];
            }
          )
        : [],
  };
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

function indentCategories(
  categories: Category[]
) {
  const byParent: Record<
    number,
    Category[]
  > = {};

  for (
    const category of
    categories
  ) {
    (
      byParent[
        category.parent
      ] ||= []
    ).push(category);
  }

  const result: Array<
    Category & {
      depth: number;
    }
  > = [];

  function walk(
    parent: number,
    depth: number
  ) {
    for (
      const category of (
        byParent[parent] ||
        []
      )
        .slice()
        .sort((a, b) =>
          a.name.localeCompare(
            b.name
          )
        )
    ) {
      result.push({
        ...category,
        depth,
      });

      walk(
        category.id,
        depth + 1
      );
    }
  }

  walk(0, 0);

  return result;
}

async function readPrimaryMenu(): Promise<
  MenuItem[]
> {
  const menusResponse =
    await fetch(
      "/api/menu/menus",
      {
        cache: "no-store",
      }
    );

  const menusPayload: unknown =
    await menusResponse
      .json()
      .catch(() => null);

  if (
    !menusResponse.ok ||
    !isRecord(
      menusPayload
    )
  ) {
    throw new Error(
      responseError(
        menusPayload,
        "Could not load menu headings."
      )
    );
  }

  const menus =
    Array.isArray(
      menusPayload.menus
    )
      ? menusPayload.menus
      : [];

  const mainMenu =
    menus.find(
      (menu) =>
        isRecord(menu) &&
        menu.name ===
          "Main Menu"
    );

  const menuId =
    isRecord(mainMenu)
      ? Number(
          mainMenu.id
        )
      : 0;

  let response =
    menuId > 0
      ? await fetch(
          `/api/menu/sync?menu_id=${menuId}`,
          {
            cache:
              "no-store",
          }
        )
      : null;

  let payload: unknown =
    response
      ? await response
          .json()
          .catch(
            () => null
          )
      : null;

  const needsLocationFallback =
    !response?.ok ||
    !isRecord(payload) ||
    (
      Array.isArray(
        payload.items
      ) &&
      payload.items
        .length === 0 &&
      Boolean(
        payload.note
      )
    );

  if (
    needsLocationFallback
  ) {
    response =
      await fetch(
        "/api/menu/sync?location=primary",
        {
          cache:
            "no-store",
        }
      );

    payload =
      await response
        .json()
        .catch(
          () => null
        );
  }

  if (
    !response ||
    !response.ok ||
    !isRecord(payload)
  ) {
    throw new Error(
      responseError(
        payload,
        "Could not load menu headings."
      )
    );
  }

  return Array.isArray(
    payload.items
  )
    ? payload.items.flatMap(
        (value) => {
          const item =
            asMenuItem(
              value
            );

          return item
            ? [item]
            : [];
        }
      )
    : [];
}

function removeCategoryLink(
  items: MenuItem[],
  url: string
): MenuItem[] {
  return items
    .filter(
      (item) =>
        item.url !== url
    )
    .map((item) => ({
      ...item,
      children:
        removeCategoryLink(
          item.children,
          url
        ),
    }));
}

async function placeCategoryInMenu(
  category: Category,
  headingIndex:
    | number
    | null
) {
  if (
    headingIndex === null
  ) {
    return;
  }

  const url =
    `/product-category/${category.slug}`;

  const items =
    removeCategoryLink(
      await readPrimaryMenu(),
      url
    );

  const heading =
    items[headingIndex];

  if (!heading) {
    throw new Error(
      "The selected menu heading is no longer available."
    );
  }

  heading.children.push({
    title: category.name,
    url,
    children: [],
  });

  const response =
    await fetch(
      "/api/menu/sync",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            items,
            location:
              "primary",
            location_label:
              "Main Menu",
            also_location_labels:
              [
                "Off-Canvas Menu",
              ],
          }),
      }
    );

  const payload: unknown =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      responseError(
        payload,
        "Could not update the store menu."
      )
    );
  }
}

function CategoryImagePreview({
  image,
}: {
  image?:
    | CategoryImage
    | null;
}) {
  if (!image?.src) {
    return (
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <Tag className="h-5 w-5" />
      </div>
    );
  }

  return (
    // WooCommerce category images are remote WordPress media URLs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt=""
      className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
    />
  );
}

function FieldLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-xs font-bold text-heading">
      {children}
    </label>
  );
}

export default function CategoriesClient({
  initial,
}: {
  initial: Category[];
}) {
  const [rows, setRows] =
    useState<Category[]>(
      initial
    );

  const [query, setQuery] =
    useState("");

  const [
    editorMode,
    setEditorMode,
  ] =
    useState<EditorMode>(
      null
    );

  const [name, setName] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    newImage,
    setNewImage,
  ] =
    useState<CategoryImage | null>(
      null
    );

  const [
    newMenuHeading,
    setNewMenuHeading,
  ] =
    useState("");

  const [
    editId,
    setEditId,
  ] =
    useState<number | null>(
      null
    );

  const [
    editName,
    setEditName,
  ] =
    useState("");

  const [
    editSlug,
    setEditSlug,
  ] =
    useState("");

  const [
    editParent,
    setEditParent,
  ] =
    useState(0);

  const [
    editDescription,
    setEditDescription,
  ] =
    useState("");

  const [
    editImage,
    setEditImage,
  ] =
    useState<CategoryImage | null>(
      null
    );

  const [
    editMenuHeading,
    setEditMenuHeading,
  ] =
    useState("");

  const [
    menuHeadings,
    setMenuHeadings,
  ] =
    useState<MenuHeading[]>(
      []
    );

  const [
    menuError,
    setMenuError,
  ] =
    useState<
      string | null
    >(null);

  const [
    busyAction,
    setBusyAction,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<Category | null>(
      null
    );

  const flat = useMemo(
    () =>
      indentCategories(
        rows
      ),
    [rows]
  );

  const filtered =
    useMemo(() => {
      const normalized =
        query
          .trim()
          .toLowerCase();

      if (!normalized) {
        return flat;
      }

      return flat.filter(
        (category) =>
          category.name
            .toLowerCase()
            .includes(
              normalized
            ) ||
          category.slug
            .toLowerCase()
            .includes(
              normalized
            )
      );
    }, [
      flat,
      query,
    ]);

  useEffect(() => {
    let cancelled =
      false;

    void readPrimaryMenu()
      .then((items) => {
        if (
          cancelled
        ) {
          return;
        }

        setMenuHeadings(
          items.map(
            (
              item,
              index
            ) => ({
              index,
              title:
                item.title,
            })
          )
        );
      })
      .catch(
        (
          error: unknown
        ) => {
          if (
            !cancelled
          ) {
            setMenuError(
              error instanceof
                Error
                ? error.message
                : "Could not load menu headings."
            );
          }
        }
      );

    return () => {
      cancelled =
        true;
    };
  }, []);

  function uploadedImage(
    _url?: string,
    media?: MediaUploadResult
  ): CategoryImage | null {
    return media
      ? {
          id: media.id,
          src: media.url,
        }
      : null;
  }

  function resetCreateForm() {
    setName("");
    setDescription("");
    setNewImage(null);
    setNewMenuHeading("");
  }

  function openCreate() {
    resetCreateForm();
    setEditorMode(
      "create"
    );
  }

  function startEdit(
    category: Category
  ) {
    setEditId(
      category.id
    );
    setEditName(
      category.name
    );
    setEditSlug(
      category.slug
    );
    setEditParent(
      category.parent
    );
    setEditDescription(
      category.description ||
        ""
    );
    setEditImage(
      category.image ||
        null
    );
    setEditMenuHeading(
      ""
    );
    setEditorMode(
      "edit"
    );
  }

  function closeEditor() {
    if (busyAction) {
      return;
    }

    setEditorMode(null);
    setEditId(null);
  }

  async function createCategory(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !name.trim() ||
      busyAction
    ) {
      return;
    }

    const feedbackId =
      "category-create";

    setBusyAction(
      "create"
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Creating category…",
    });

    try {
      const response =
        await fetch(
          "/api/categories/create",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  name.trim(),
                description:
                  description.trim(),
                parent: 0,
                image_id:
                  newImage?.id,
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
        !isRecord(
          payload
        ) ||
        !isRecord(
          payload.category
        )
      ) {
        throw new Error(
          responseError(
            payload,
            "Category creation failed."
          )
        );
      }

      const category =
        payload.category as Category;

      setRows(
        (
          current
        ) => [
          ...current,
          category,
        ]
      );

      if (
        newMenuHeading
      ) {
        actionFeedback.loading({
          id:
            feedbackId,
          title:
            "Adding category to menu…",
        });

        await placeCategoryInMenu(
          category,
          Number(
            newMenuHeading
          )
        );
      }

      resetCreateForm();
      setEditorMode(
        null
      );

      actionFeedback.success({
        id: feedbackId,
        title:
          "Category created",
        message:
          category.name,
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not create category",
        message:
          error instanceof
            Error
            ? error.message
            : "Category creation failed.",
        durationMs: 4200,
      });
    } finally {
      setBusyAction(
        null
      );
    }
  }

  async function saveEdit() {
    if (
      !editId ||
      !editName.trim() ||
      busyAction
    ) {
      return;
    }

    const feedbackId =
      `category-edit-${editId}`;

    setBusyAction(
      "edit"
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving category…",
    });

    try {
      const response =
        await fetch(
          `/api/categories/${editId}/update`,
          {
            method:
              "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                name:
                  editName.trim(),
                slug:
                  editSlug.trim(),
                parent:
                  editParent,
                description:
                  editDescription.trim(),
                image_id:
                  editImage?.id,
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
        !isRecord(
          payload
        ) ||
        !isRecord(
          payload.category
        )
      ) {
        throw new Error(
          responseError(
            payload,
            "Category update failed."
          )
        );
      }

      const category =
        payload.category as Category;

      setRows(
        (
          current
        ) =>
          current.map(
            (item) =>
              item.id ===
              category.id
                ? category
                : item
          )
      );

      if (
        editMenuHeading
      ) {
        actionFeedback.loading({
          id:
            feedbackId,
          title:
            "Updating menu placement…",
        });

        await placeCategoryInMenu(
          category,
          Number(
            editMenuHeading
          )
        );
      }

      setEditorMode(
        null
      );
      setEditId(null);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Category saved",
        message:
          category.name,
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save category",
        message:
          error instanceof
            Error
            ? error.message
            : "Category update failed.",
        durationMs: 4200,
      });
    } finally {
      setBusyAction(
        null
      );
    }
  }

  async function removeCategory() {
    const category =
      deleteTarget;

    if (
      !category ||
      busyAction
    ) {
      return;
    }

    const feedbackId =
      `category-delete-${category.id}`;

    setBusyAction(
      "delete"
    );

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Deleting category…",
      message:
        category.name,
    });

    try {
      const response =
        await fetch(
          `/api/categories/${category.id}/delete`,
          {
            method:
              "DELETE",
          }
        );

      const payload: unknown =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok
      ) {
        throw new Error(
          responseError(
            payload,
            "Category deletion failed."
          )
        );
      }

      setRows(
        (
          current
        ) =>
          current
            .filter(
              (item) =>
                item.id !==
                category.id
            )
            .map(
              (item) =>
                item.parent ===
                category.id
                  ? {
                      ...item,
                      parent: 0,
                    }
                  : item
            )
      );

      setDeleteTarget(
        null
      );
      setEditorMode(
        null
      );
      setEditId(null);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Category deleted",
        message:
          category.name,
        durationMs: 2200,
      });
    } catch (
      error: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not delete category",
        message:
          error instanceof
            Error
            ? error.message
            : "Category deletion failed.",
        durationMs: 4200,
      });
    } finally {
      setBusyAction(
        null
      );
    }
  }

  function parentName(
    category: Category
  ) {
    if (
      !category.parent
    ) {
      return "";
    }

    return (
      rows.find(
        (item) =>
          item.id ===
          category.parent
      )?.name || ""
    );
  }

  function menuSelect(
    value: string,
    onChange: (
      value: string
    ) => void
  ) {
    const selected =
      value
        ? menuHeadings.find(
            (heading) =>
              String(
                heading.index
              ) === value
          )
        : null;

    return (
      <div>
        <FieldLabel>
          Add to Website Menu{" "}
          <span className="font-medium text-muted-foreground">
            (optional)
          </span>
        </FieldLabel>

        <details className="group overflow-hidden rounded-xl border border-input bg-card">
          <summary className="ls-focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm [&::-webkit-details-marker]:hidden">
            <span
              className={
                selected
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground"
              }
            >
              {selected
                ? selected.title
                : "Not added to menu"}
            </span>

            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>

          <div className="max-h-56 overflow-y-auto border-t border-border p-1.5">
            <button
              type="button"
              onClick={(event) => {
                onChange("");
                const details =
                  event.currentTarget.closest(
                    "details"
                  );
                details?.removeAttribute(
                  "open"
                );
              }}
              className="ls-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm hover:bg-muted"
            >
              <span className="text-muted-foreground">
                Not added to menu
              </span>

              {!value ? (
                <Check className="h-4 w-4 text-primary" />
              ) : null}
            </button>

            {menuHeadings.map(
              (heading) => {
                const optionValue =
                  String(
                    heading.index
                  );

                const active =
                  value ===
                  optionValue;

                return (
                  <button
                    key={
                      heading.index
                    }
                    type="button"
                    onClick={(
                      event
                    ) => {
                      onChange(
                        optionValue
                      );
                      const details =
                        event.currentTarget.closest(
                          "details"
                        );
                      details?.removeAttribute(
                        "open"
                      );
                    }}
                    className="ls-focus-ring flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-semibold text-foreground hover:bg-muted"
                  >
                    <span className="truncate">
                      {
                        heading.title
                      }
                    </span>

                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                );
              }
            )}
          </div>
        </details>

        {menuError ? (
          <p className="mt-1.5 text-xs text-amber-700">
            {menuError}
          </p>
        ) : null}
      </div>
    );
  }

  function imageUploader(
    image:
      | CategoryImage
      | null,
    onChange: (
      image:
        | CategoryImage
        | null
    ) => void
  ) {
    return (
      <div>
        <FieldLabel>
          Category image{" "}
          <span className="font-medium text-muted-foreground">
            (optional)
          </span>
        </FieldLabel>

        <div className="flex items-center gap-3">
          <CategoryImagePreview
            image={image}
          />

          <ImageUploader
            purpose="category_image"
            label={
              image
                ? "Replace image"
                : "Upload image"
            }
            onUploaded={(
              url,
              media
            ) =>
              onChange(
                uploadedImage(
                  url,
                  media
                )
              )
            }
          />
        </div>
      </div>
    );
  }

  const editorContent =
    editorMode ===
    "create" ? (
      <form
        onSubmit={
          createCategory
        }
        className="space-y-4"
      >
        <div>
          <FieldLabel>
            Name *
          </FieldLabel>

          <Input
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
            autoFocus
            required
            placeholder="Category name"
          />
        </div>

        <div>
          <FieldLabel>
            Description
          </FieldLabel>

          <textarea
            value={
              description
            }
            onChange={(
              event
            ) =>
              setDescription(
                event.target.value
              )
            }
            rows={3}
            className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
            placeholder="Optional short description"
          />
        </div>

        {imageUploader(
          newImage,
          setNewImage
        )}

        {menuSelect(
          newMenuHeading,
          setNewMenuHeading
        )}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={
              closeEditor
            }
            disabled={
              busyAction ===
              "create"
            }
          >
            Cancel
          </Button>

          <AsyncButton
            type="submit"
            loading={
              busyAction ===
              "create"
            }
            loadingLabel="Creating…"
          >
            Add category
          </AsyncButton>
        </div>
      </form>
    ) : editorMode ===
        "edit" &&
      editId ? (
      <div className="space-y-4">
        <div>
          <FieldLabel>
            Name *
          </FieldLabel>

          <Input
            value={
              editName
            }
            onChange={(
              event
            ) =>
              setEditName(
                event.target.value
              )
            }
            autoFocus
          />
        </div>

        <div>
          <FieldLabel>
            Slug
          </FieldLabel>

          <Input
            value={
              editSlug
            }
            onChange={(
              event
            ) =>
              setEditSlug(
                event.target.value
              )
            }
            placeholder="category-slug"
          />
        </div>

        <div>
          <FieldLabel>
            Description
          </FieldLabel>

          <textarea
            value={
              editDescription
            }
            onChange={(
              event
            ) =>
              setEditDescription(
                event.target.value
              )
            }
            rows={3}
            className="ls-focus-ring w-full resize-y rounded-xl border border-input bg-card px-3 py-2.5 text-sm text-foreground"
          />
        </div>

        {imageUploader(
          editImage,
          setEditImage
        )}

        {menuSelect(
          editMenuHeading,
          setEditMenuHeading
        )}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="justify-center text-destructive"
            onClick={() => {
              const category =
                rows.find(
                  (item) =>
                    item.id ===
                    editId
                );

              if (
                category
              ) {
                setDeleteTarget(
                  category
                );
              }
            }}
            disabled={
              Boolean(
                busyAction
              )
            }
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={
                closeEditor
              }
              disabled={
                busyAction ===
                "edit"
              }
            >
              Cancel
            </Button>

            <AsyncButton
              type="button"
              loading={
                busyAction ===
                "edit"
              }
              loadingLabel="Saving…"
              onClick={() =>
                void saveEdit()
              }
            >
              Save changes
            </AsyncButton>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <div className="flex items-center justify-between gap-3 py-0.5">
        <div className="min-w-0">
          <span className="text-[21px] font-extrabold tracking-tight text-heading md:text-base">
            {rows.length}
          </span>
          <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
            categor
            {rows.length === 1
              ? "y"
              : "ies"}
          </span>
        </div>

        <Button
          type="button"
          onClick={
            openCreate
          }
        >
          <Plus className="h-4 w-4" />
          Add category
        </Button>
      </div>

      <Section
        surface="card"
        className="mt-3 overflow-hidden !p-0 md:mt-4"
        contentClassName="min-w-0"
      >
        <div className="border-b border-border px-4 py-3 md:px-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(
                event
              ) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search categories"
              aria-label="Search categories"
              className="pl-10"
            />
          </div>
        </div>

        {filtered.length ===
        0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No categories found"
            description={
              query
                ? "Try another category name or slug."
                : "Add your first product category."
            }
            action={
              !query ? (
                <Button
                  onClick={
                    openCreate
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add category
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {filtered.map(
                (
                  category
                ) => {
                  const parent =
                    parentName(
                      category
                    );

                  return (
                    <div
                      key={
                        category.id
                      }
                      className="flex min-h-[76px] items-center gap-2 px-4 py-2.5"
                    >
                      <Link
                        href={
                          `/categories/${category.id}`
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 active:bg-muted"
                      >
                        <CategoryImagePreview
                          image={
                            category.image
                          }
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-bold text-heading">
                            {
                              category.name
                            }
                          </span>

                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {
                              category.slug
                            }{" "}
                            ·{" "}
                            {
                              category.count ??
                              0
                            }{" "}
                            product
                            {(category.count ??
                              0) ===
                            1
                              ? ""
                              : "s"}
                          </span>

                          {parent ? (
                            <span className="mt-1 block truncate text-[11px] font-semibold text-secondary-foreground">
                              Under{" "}
                              {
                                parent
                              }
                            </span>
                          ) : null}
                        </span>

                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          startEdit(
                            category
                          )
                        }
                        aria-label={
                          `Edit ${category.name}`
                        }
                        className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-surface-soft text-left text-xs font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">
                      Category
                    </th>
                    <th className="px-3 py-3">
                      Parent
                    </th>
                    <th className="px-3 py-3 text-right">
                      Products
                    </th>
                    <th className="px-5 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {filtered.map(
                    (
                      category
                    ) => {
                      const parent =
                        parentName(
                          category
                        );

                      return (
                        <tr
                          key={
                            category.id
                          }
                          className="transition hover:bg-muted/50"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex min-w-0 items-center gap-3">
                              <CategoryImagePreview
                                image={
                                  category.image
                                }
                              />

                              <div className="min-w-0">
                                <Link
                                  href={
                                    `/categories/${category.id}`
                                  }
                                  className="block truncate font-bold text-heading hover:text-primary"
                                >
                                  {
                                    category.name
                                  }
                                </Link>

                                <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {
                                    category.slug
                                  }
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-3.5 text-muted-foreground">
                            {parent ||
                              "—"}
                          </td>

                          <td className="px-3 py-3.5 text-right font-semibold text-foreground">
                            {
                              category.count ??
                              0
                            }
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={
                                  `/categories/${category.id}`
                                }
                                className="ls-focus-ring inline-flex min-h-10 items-center rounded-xl px-3 text-xs font-bold text-primary hover:bg-secondary"
                              >
                                Details
                              </Link>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  startEdit(
                                    category
                                  )
                                }
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <BottomSheet
        open={
          editorMode !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            closeEditor();
          }
        }}
        title={
          editorMode ===
          "create"
            ? "Add category"
            : "Edit category"
        }
        description={
          editorMode ===
          "create"
            ? "Create a product category."
            : "Update category details."
        }
      >
        {editorContent}
      </BottomSheet>

      <ConfirmDialog
        open={
          deleteTarget !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (
            !open &&
            !busyAction
          ) {
            setDeleteTarget(
              null
            );
          }
        }}
        title="Delete category?"
        description={
          deleteTarget
            ? `Delete “${deleteTarget.name}”? Products will not be deleted.`
            : undefined
        }
        confirmLabel="Delete category"
        loading={
          busyAction ===
          "delete"
        }
        loadingLabel="Deleting…"
        destructive
        onConfirm={
          removeCategory
        }
      />
    </>
  );
}
