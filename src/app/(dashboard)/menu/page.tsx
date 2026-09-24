"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  FolderTree,
  Link2,
  MenuSquare,
  MoreVertical,
  MoveRight,
  Plus,
  RefreshCw,
  Search,
  Trash2,
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
  PageHeader,
} from "@/components/ui/page-header";
import {
  Skeleton,
} from "@/components/ui/skeleton";
import {
  actionFeedback,
} from "@/lib/actionFeedback";

type MenuItem = {
  id: string;
  type:
    | "page"
    | "category"
    | "custom";
  title: string;
  url?: string;
  refId?: number;
  children?: MenuItem[];
};

type MenuKey =
  | "primary"
  | "footer_discover"
  | "footer_info";

type MenuDef = {
  key: MenuKey;
  label: string;
  wpName: string;
  also: string[];
  loadMode:
    | "menu_id"
    | "location";
  saveMode:
    | "menu_id"
    | "location";
};

type MoveTarget = {
  id:
    | string
    | null;
  label: string;
  depth: number;
};

type ItemActionContext = {
  item: MenuItem;
  parentId:
    | string
    | null;
  index: number;
  siblingCount: number;
  level: number;
};

type AddTab =
  | "category"
  | "page"
  | "custom";

const MENUS: MenuDef[] = [
  {
    key: "primary",
    label: "Website Menu",
    wpName: "Main Menu",
    also: [
      "Off-Canvas Menu",
    ],
    loadMode: "menu_id",
    saveMode: "location",
  },
  {
    key: "footer_discover",
    label: "Footer – Shop Links",
    wpName: "Footer Menu",
    also: [],
    loadMode: "menu_id",
    saveMode: "menu_id",
  },
  {
    key: "footer_info",
    label:
      "Footer – Information",
    wpName: "Top Menu",
    also: [],
    loadMode: "menu_id",
    saveMode: "menu_id",
  },
];

const STORAGE_KEY = (
  key: MenuKey
) =>
  "ls_menu_" +
  key +
  "_v7";

function uid() {
  return Math.random()
    .toString(36)
    .slice(2, 9);
}

function deepClone<T>(
  value: T
): T {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function removeNodeById(
  items: MenuItem[],
  id: string
): {
  next: MenuItem[];
  removed:
    | MenuItem
    | null;
} {
  const next =
    deepClone(items);

  function walk(
    list: MenuItem[]
  ): MenuItem | null {
    const index =
      list.findIndex(
        (item) =>
          item.id === id
      );

    if (index >= 0) {
      const [removed] =
        list.splice(
          index,
          1
        );

      return removed;
    }

    for (
      const item of list
    ) {
      const removed =
        walk(
          item.children ||
            []
        );

      if (removed) {
        return removed;
      }
    }

    return null;
  }

  return {
    next,
    removed:
      walk(next),
  };
}

function insertNodeUnderParent(
  items: MenuItem[],
  parentId:
    | string
    | null,
  node: MenuItem
) {
  const next =
    deepClone(items);

  if (!parentId) {
    next.push(node);
    return next;
  }

  function walk(
    list: MenuItem[]
  ): boolean {
    for (
      const item of list
    ) {
      if (
        item.id ===
        parentId
      ) {
        item.children =
          item.children ||
          [];

        item.children.push(
          node
        );

        return true;
      }

      if (
        walk(
          item.children ||
            []
        )
      ) {
        return true;
      }
    }

    return false;
  }

  walk(next);
  return next;
}

function moveNode(
  items: MenuItem[],
  nodeId: string,
  newParentId:
    | string
    | null
) {
  const {
    next,
    removed,
  } =
    removeNodeById(
      items,
      nodeId
    );

  if (!removed) {
    return items;
  }

  return insertNodeUnderParent(
    next,
    newParentId,
    removed
  );
}

function reorderWithinParent(
  items: MenuItem[],
  parentId:
    | string
    | null,
  nodeId: string,
  direction:
    | "up"
    | "down"
) {
  const next =
    deepClone(items);

  function getList(
    list: MenuItem[]
  ): MenuItem[] | null {
    if (
      parentId === null
    ) {
      return list;
    }

    for (
      const item of list
    ) {
      if (
        item.id ===
        parentId
      ) {
        return (
          item.children ||
          []
        );
      }

      const found =
        getList(
          item.children ||
            []
        );

      if (found) {
        return found;
      }
    }

    return null;
  }

  const siblings =
    getList(next);

  if (!siblings) {
    return items;
  }

  const index =
    siblings.findIndex(
      (item) =>
        item.id ===
        nodeId
    );

  if (index < 0) {
    return items;
  }

  if (
    direction === "up" &&
    index > 0
  ) {
    [
      siblings[index - 1],
      siblings[index],
    ] = [
      siblings[index],
      siblings[index - 1],
    ];
  }

  if (
    direction ===
      "down" &&
    index <
      siblings.length -
        1
  ) {
    [
      siblings[index + 1],
      siblings[index],
    ] = [
      siblings[index],
      siblings[index + 1],
    ];
  }

  return next;
}

function flattenMoveTargets(
  items: MenuItem[],
  excludeId?: string,
  depth = 0,
  out: MoveTarget[] = [
    {
      id: null,
      label: "Top level",
      depth: 0,
    },
  ]
): MoveTarget[] {
  for (
    const item of items
  ) {
    if (
      item.id ===
      excludeId
    ) {
      continue;
    }

    out.push({
      id: item.id,
      label: item.title,
      depth,
    });

    flattenMoveTargets(
      item.children ||
        [],
      excludeId,
      depth + 1,
      out
    );
  }

  return out;
}

function normalizeUrl(
  url: string
) {
  const raw =
    (url || "").trim();

  if (
    !raw ||
    raw === "#" ||
    raw.startsWith("#") ||
    raw.startsWith(
      "javascript:"
    )
  ) {
    return raw;
  }

  try {
    const parsed =
      new URL(
        raw,
        "http://fake"
      );

    let pathname =
      parsed.pathname ||
      "/";

    if (
      pathname.length > 1
    ) {
      pathname =
        pathname.replace(
          /\/+$/,
          ""
        );
    }

    return (
      pathname || "/"
    );
  } catch {
    return raw;
  }
}

function slugify(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /(^-|-$)/g,
      ""
    );
}

function typeLabel(
  type: MenuItem["type"]
) {
  if (
    type === "page"
  ) {
    return "Page";
  }

  if (
    type === "category"
  ) {
    return "Category";
  }

  return "Link";
}

function MenuSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {Array.from({
        length: 6,
      }).map(
        (
          _,
          index
        ) => (
          <div
            key={index}
            className="flex min-h-[68px] items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <Skeleton className="h-9 w-9 rounded-xl" />

            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>

            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        )
      )}
    </div>
  );
}

export default function MenuLayoutPage() {
  const [
    menuKey,
    setMenuKey,
  ] =
    useState<MenuKey>(
      "primary"
    );

  const [
    items,
    setItems,
  ] =
    useState<MenuItem[]>(
      []
    );

  const [
    cats,
    setCats,
  ] =
    useState<
      {
        id: number;
        name: string;
      }[]
    >([]);

  const [
    pages,
    setPages,
  ] =
    useState<
      {
        id: number;
        name: string;
        url: string;
      }[]
    >([]);

  const [
    custom,
    setCustom,
  ] =
    useState({
      title: "",
      url: "",
    });

  const [
    syncing,
    setSyncing,
  ] =
    useState(false);

  const [
    loadingMenu,
    setLoadingMenu,
  ] =
    useState(false);

  const [
    bootLoading,
    setBootLoading,
  ] =
    useState(true);

  const [
    menuMap,
    setMenuMap,
  ] =
    useState<
      Record<
        string,
        number
      >
    >({});

  const [
    dirty,
    setDirty,
  ] =
    useState(false);

  const [
    menuPickerOpen,
    setMenuPickerOpen,
  ] =
    useState(false);

  const [
    addOpen,
    setAddOpen,
  ] =
    useState(false);

  const [
    addTab,
    setAddTab,
  ] =
    useState<AddTab>(
      "category"
    );

  const [
    addSearch,
    setAddSearch,
  ] =
    useState("");

  const [
    actionContext,
    setActionContext,
  ] =
    useState<
      ItemActionContext | null
    >(null);

  const [
    moveOpen,
    setMoveOpen,
  ] =
    useState(false);

  const [
    removeTarget,
    setRemoveTarget,
  ] =
    useState<
      ItemActionContext | null
    >(null);

  const [
    pendingMenuKey,
    setPendingMenuKey,
  ] =
    useState<
      MenuKey | null
    >(null);

  const [
    discardOpen,
    setDiscardOpen,
  ] =
    useState(false);

  const currentDef =
    useMemo(
      () =>
        MENUS.find(
          (menu) =>
            menu.key ===
            menuKey
        )!,
      [menuKey]
    );

  const pageUrlSet =
    useMemo(
      () =>
        new Set(
          pages.map(
            (page) =>
              normalizeUrl(
                page.url
              )
          )
        ),
      [pages]
    );

  const filteredPages =
    useMemo(() => {
      const query =
        addSearch
          .trim()
          .toLowerCase();

      const source =
        !query
          ? pages
          : pages.filter(
              (page) =>
                page.name
                  .toLowerCase()
                  .includes(
                    query
                  )
            );

      return source.slice(
        0,
        80
      );
    }, [
      pages,
      addSearch,
    ]);

  const filteredCats =
    useMemo(() => {
      const query =
        addSearch
          .trim()
          .toLowerCase();

      const source =
        !query
          ? cats
          : cats.filter(
              (category) =>
                category.name
                  .toLowerCase()
                  .includes(
                    query
                  )
            );

      return source.slice(
        0,
        80
      );
    }, [
      cats,
      addSearch,
    ]);

  const moveTargets =
    useMemo(
      () =>
        actionContext
          ? flattenMoveTargets(
              items,
              actionContext
                .item.id
            )
          : [],
      [
        items,
        actionContext,
      ]
    );

  function classifyType(
    url?: string,
    sourceType?: string
  ): MenuItem["type"] {
    const raw =
      (url || "").trim();

    const normalized =
      normalizeUrl(raw);

    const source =
      (
        sourceType ||
        ""
      ).toLowerCase();

    if (
      source.includes(
        "category"
      ) ||
      source.includes(
        "product_cat"
      )
    ) {
      return "category";
    }

    if (
      source.includes(
        "page"
      )
    ) {
      return "page";
    }

    if (
      source.includes(
        "custom"
      )
    ) {
      return "custom";
    }

    if (
      !raw ||
      raw === "#" ||
      raw.startsWith(
        "#"
      ) ||
      raw.startsWith(
        "javascript:"
      )
    ) {
      return "custom";
    }

    if (
      /\/product-category\/|product_cat|\/category\//i.test(
        normalized
      )
    ) {
      return "category";
    }

    if (
      pageUrlSet.has(
        normalized
      )
    ) {
      return "page";
    }

    return "custom";
  }

  function toLocalTree(
    nodes: unknown[]
  ): MenuItem[] {
    return (
      nodes || []
    ).map(
      (
        rawNode: unknown
      ) => {
        const node =
          rawNode as {
            title?: string;
            url?: string;
            refId?: number;
            type?: string;
            children?: unknown[];
          };

        return {
          id: uid(),
          type:
            classifyType(
              node.url,
              node.type
            ),
          title:
            node.title ||
            "Untitled",
          url: node.url,
          refId:
            node.refId,
          children:
            node.children
              ? toLocalTree(
                  node.children
                )
              : [],
        };
      }
    );
  }

  function reclassifyTree(
    item: MenuItem
  ): MenuItem {
    return {
      ...item,
      type:
        classifyType(
          item.url,
          item.type
        ),
      children:
        item.children?.map(
          reclassifyTree
        ) || [],
    };
  }

  useEffect(() => {
    async function boot() {
      try {
        const [
          catsResponse,
          pagesResponse,
          menusResponse,
        ] =
          await Promise.all([
            fetch(
              "/api/taxonomies/categories"
            ),
            fetch(
              "/api/wp/pages"
            ),
            fetch(
              "/api/menu/menus"
            ),
          ]);

        const catsJson =
          await catsResponse
            .json()
            .catch(
              () => ({
                items: [],
              })
            );

        const pagesJson =
          await pagesResponse
            .json()
            .catch(
              () => ({
                items: [],
              })
            );

        const menusJson =
          await menusResponse
            .json()
            .catch(
              () => ({
                menus: [],
              })
            );

        setCats(
          (
            catsJson.items ||
            []
          ).map(
            (
              item: {
                id: number;
                name: string;
              }
            ) => ({
              id:
                item.id,
              name:
                item.name,
            })
          )
        );

        setPages(
          pagesJson.items ||
            []
        );

        const map:
          Record<
            string,
            number
          > = {};

        for (
          const menu of
          menusJson.menus ||
          []
        ) {
          map[menu.name] =
            menu.id;
        }

        setMenuMap(map);
      } catch (
        caught: unknown
      ) {
        actionFeedback.error({
          id:
            "menu-builder-boot",
          title:
            "Could not load menu tools",
          message:
            caught instanceof
              Error
              ? caught.message
              : "Please try again.",
          durationMs: 4200,
        });
      } finally {
        setBootLoading(
          false
        );
      }
    }

    void boot();
  }, []);

  useEffect(() => {
    if (
      items.length ===
      0
    ) {
      return;
    }

    setItems(
      (
        current
      ) =>
        deepClone(
          current
        ).map(
          reclassifyTree
        )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrlSet.size]);

  async function loadMenu(
    def: MenuDef,
    announce = false
  ) {
    setLoadingMenu(
      true
    );

    const feedbackId =
      "menu-load";

    if (announce) {
      actionFeedback.loading({
        id: feedbackId,
        title:
          "Reloading menu…",
      });
    }

    try {
      let response:
        | Response
        | null = null;

      let data:
        | {
            items?: unknown[];
            note?: unknown;
            error?: string;
          }
        | null = null;

      async function tryFetch(
        url: string
      ) {
        const nextResponse =
          await fetch(
            url,
            {
              cache:
                "no-store",
            }
          );

        const nextData =
          await nextResponse
            .json()
            .catch(
              () => ({})
            );

        return {
          response:
            nextResponse,
          data:
            nextData,
        };
      }

      if (
        def.loadMode ===
        "menu_id"
      ) {
        const id =
          menuMap[
            def.wpName
          ];

        if (id) {
          const first =
            await tryFetch(
              "/api/menu/sync?menu_id=" +
                id
            );

          response =
            first.response;
          data =
            first.data;
        }

        const shouldFallback =
          def.key ===
            "primary" &&
          (
            !response ||
            !response.ok ||
            (
              (
                data?.items
                  ?.length ??
                0
              ) === 0 &&
              Boolean(
                data?.note
              )
            )
          );

        if (
          shouldFallback
        ) {
          const second =
            await tryFetch(
              "/api/menu/sync?location=" +
                encodeURIComponent(
                  def.key
                )
            );

          response =
            second.response;
          data =
            second.data;
        }

        if (
          !response &&
          def.key !==
            "primary"
        ) {
          setItems([]);
          setDirty(false);

          if (announce) {
            actionFeedback.warning({
              id: feedbackId,
              title:
                "Menu is not available yet",
              message:
                def.label,
              durationMs: 3200,
            });
          }

          return;
        }
      } else {
        const direct =
          await tryFetch(
            "/api/menu/sync?location=" +
              encodeURIComponent(
                def.key
              )
          );

        response =
          direct.response;
        data =
          direct.data;
      }

      if (
        response?.ok
      ) {
        const local =
          toLocalTree(
            data?.items ||
              []
          );

        setItems(local);
        setDirty(false);

        localStorage.setItem(
          STORAGE_KEY(
            def.key
          ),
          JSON.stringify(
            local
          )
        );

        if (announce) {
          actionFeedback.success({
            id: feedbackId,
            title:
              "Menu reloaded",
            durationMs: 1800,
          });
        }

        return;
      }

      const raw =
        localStorage.getItem(
          STORAGE_KEY(
            def.key
          )
        );

      setItems(
        raw
          ? JSON.parse(raw)
          : []
      );
      setDirty(false);

      actionFeedback.warning({
        id: feedbackId,
        title:
          "Showing last dashboard copy",
        message:
          data?.error ||
          "Could not reach the saved WordPress menu.",
        durationMs: 4200,
      });
    } catch (
      caught: unknown
    ) {
      const raw =
        localStorage.getItem(
          STORAGE_KEY(
            def.key
          )
        );

      setItems(
        raw
          ? JSON.parse(raw)
          : []
      );
      setDirty(false);

      actionFeedback.warning({
        id: feedbackId,
        title:
          "Showing last dashboard copy",
        message:
          caught instanceof
            Error
            ? caught.message
            : "Could not load the WordPress menu.",
        durationMs: 4200,
      });
    } finally {
      setLoadingMenu(
        false
      );
    }
  }

  useEffect(() => {
    if (bootLoading) {
      return;
    }

    const def =
      MENUS.find(
        (menu) =>
          menu.key ===
          menuKey
      )!;

    void loadMenu(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    menuKey,
    menuMap,
    bootLoading,
  ]);

  async function saveAndSync() {
    if (
      syncing ||
      loadingMenu
    ) {
      return;
    }

    const def =
      MENUS.find(
        (menu) =>
          menu.key ===
          menuKey
      )!;

    localStorage.setItem(
      STORAGE_KEY(
        menuKey
      ),
      JSON.stringify(
        items
      )
    );

    function toWire(
      list: MenuItem[]
    ): unknown[] {
      return list.map(
        (item) => ({
          title:
            item.title,
          url:
            item.url ||
            "",
          children:
            item.children
              ?.length
              ? toWire(
                  item.children
                )
              : [],
        })
      );
    }

    const feedbackId =
      "menu-save";

    setSyncing(true);

    actionFeedback.loading({
      id: feedbackId,
      title:
        "Saving menu…",
    });

    try {
      const body:
        Record<
          string,
          unknown
        > = {
        items:
          toWire(items),
        location_label:
          def.wpName,
        also_location_labels:
          def.also,
      };

      if (
        def.saveMode ===
        "location"
      ) {
        body.location =
          def.key;
      } else {
        const id =
          menuMap[
            def.wpName
          ];

        if (!id) {
          throw new Error(
            "This menu is not available yet."
          );
        }

        body.menu_id =
          id;
      }

      const response =
        await fetch(
          "/api/menu/sync",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                body
              ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => ({})
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ||
            "Menu save failed."
        );
      }

      setDirty(false);

      actionFeedback.success({
        id: feedbackId,
        title:
          "Menu saved",
        durationMs: 2200,
      });
    } catch (
      caught: unknown
    ) {
      actionFeedback.error({
        id: feedbackId,
        title:
          "Could not save menu",
        message:
          caught instanceof
            Error
            ? caught.message
            : "Menu save failed.",
        durationMs: 4200,
      });
    } finally {
      setSyncing(false);
    }
  }

  function requestMenuChange(
    nextKey: MenuKey
  ) {
    if (
      nextKey ===
      menuKey
    ) {
      setMenuPickerOpen(
        false
      );
      return;
    }

    if (dirty) {
      setPendingMenuKey(
        nextKey
      );
      setDiscardOpen(
        true
      );
      setMenuPickerOpen(
        false
      );
      return;
    }

    setMenuKey(nextKey);
    setMenuPickerOpen(
      false
    );
  }

  function confirmDiscard() {
    if (!pendingMenuKey) {
      setDiscardOpen(
        false
      );
      return;
    }

    setDirty(false);
    setMenuKey(
      pendingMenuKey
    );
    setPendingMenuKey(
      null
    );
    setDiscardOpen(false);
  }

  function openAdd(
    tab: AddTab =
      "category"
  ) {
    setAddTab(tab);
    setAddSearch("");
    setCustom({
      title: "",
      url: "",
    });
    setAddOpen(true);
  }

  function addPageById(
    id: number
  ) {
    const page =
      pages.find(
        (item) =>
          item.id === id
      );

    if (!page) {
      return;
    }

    setItems(
      (current) => [
        ...current,
        {
          id: uid(),
          type: "page",
          title:
            page.name,
          url:
            page.url,
          children: [],
        },
      ]
    );

    setDirty(true);
    setAddOpen(false);
    setAddSearch("");
  }

  function addCategory(
    id: number
  ) {
    const category =
      cats.find(
        (item) =>
          item.id === id
      );

    if (!category) {
      return;
    }

    setItems(
      (current) => [
        ...current,
        {
          id: uid(),
          type:
            "category",
          title:
            category.name,
          refId:
            category.id,
          url:
            "/product-category/" +
            slugify(
              category.name
            ),
          children: [],
        },
      ]
    );

    setDirty(true);
    setAddOpen(false);
    setAddSearch("");
  }

  function addCustom() {
    const title =
      custom.title.trim();

    const url =
      custom.url.trim();

    if (
      !title ||
      !url
    ) {
      return;
    }

    setItems(
      (current) => [
        ...current,
        {
          id: uid(),
          type:
            "custom",
          title,
          url,
          children: [],
        },
      ]
    );

    setDirty(true);
    setCustom({
      title: "",
      url: "",
    });
    setAddOpen(false);
  }

  function toggleActions(
    context:
      ItemActionContext
  ) {
    setActionContext(
      (
        current
      ) =>
        current?.item.id ===
        context.item.id
          ? null
          : context
    );
  }

  function moveItem(
    direction:
      | "up"
      | "down"
  ) {
    if (!actionContext) {
      return;
    }

    setItems(
      (current) =>
        reorderWithinParent(
          current,
          actionContext
            .parentId,
          actionContext
            .item.id,
          direction
        )
    );

    setDirty(true);
    setActionContext(null);
  }

  function moveItemTo(
    parentId:
      | string
      | null
  ) {
    if (!actionContext) {
      return;
    }

    setItems(
      (current) =>
        moveNode(
          current,
          actionContext
            .item.id,
          parentId
        )
    );

    setDirty(true);
    setMoveOpen(false);
    setActionContext(
      null
    );
  }

  function confirmRemove() {
    if (!removeTarget) {
      return;
    }

    setItems(
      (current) =>
        removeNodeById(
          current,
          removeTarget
            .item.id
        ).next
    );

    setDirty(true);
    setRemoveTarget(
      null
    );
    setActionContext(
      null
    );

    actionFeedback.success({
      id:
        "menu-item-remove",
      title:
        "Removed from menu",
      durationMs: 1600,
    });
  }

  function Row({
    item,
    level,
    index,
    siblingCount,
    parentId,
  }: {
    item: MenuItem;
    level: number;
    index: number;
    siblingCount: number;
    parentId:
      | string
      | null;
  }) {
    const childCount =
      item.children?.length ||
      0;

    const context:
      ItemActionContext = {
      item,
      parentId,
      index,
      siblingCount,
      level,
    };

    const actionsVisible =
      actionContext?.item.id ===
      item.id;

    return (
      <>
        <div
          className="relative flex min-h-[66px] items-center gap-3 overflow-hidden border-b border-border px-3 py-2.5 last:border-b-0 md:px-4"
          style={{
            paddingLeft:
              12 +
              Math.min(
                level * 18,
                54
              ),
          }}
        >
          {level > 0 ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-px w-3 -translate-y-1/2 bg-border"
              style={{
                left:
                  Math.max(
                    8,
                    12 +
                      Math.min(
                        (
                          level -
                          1
                        ) *
                          18,
                        36
                      )
                  ),
              }}
            />
          ) : null}

          <span
            className={
              "grid h-9 w-9 shrink-0 place-items-center rounded-xl " +
              (
                item.type ===
                "category"
                  ? "bg-secondary text-secondary-foreground"
                  : item.type ===
                      "page"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              )
            }
          >
            {item.type ===
            "category" ? (
              <FolderTree className="h-4 w-4" />
            ) : item.type ===
              "page" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-heading">
              {item.title}
            </div>

            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                {typeLabel(
                  item.type
                )}
              </span>

              {childCount >
              0 ? (
                <>
                  <span>
                    •
                  </span>
                  <span>
                    {childCount}{" "}
                    sub-item
                    {childCount ===
                    1
                      ? ""
                      : "s"}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              toggleActions(
                context
              )
            }
            aria-label={
              actionsVisible
                ? "Close actions for " +
                  item.title
                : "Manage " +
                  item.title
            }
            aria-expanded={
              actionsVisible
            }
            className="ls-focus-ring grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {actionsVisible ? (
              <X className="h-5 w-5" />
            ) : (
              <MoreVertical className="h-5 w-5" />
            )}
          </button>

          <div
            className={
              "absolute inset-y-0 right-0 z-10 flex items-center gap-1 border-l border-border bg-card/98 px-2 shadow-[-10px_0_24px_rgba(38,51,95,0.08)] backdrop-blur transition-transform duration-200 ease-out " +
              (
                actionsVisible
                  ? "translate-x-0"
                  : "pointer-events-none translate-x-full"
              )
            }
            aria-hidden={
              !actionsVisible
            }
          >
            <button
              type="button"
              disabled={
                index === 0
              }
              onClick={() =>
                moveItem(
                  "up"
                )
              }
              className="ls-focus-ring grid h-10 w-10 place-items-center rounded-xl text-primary hover:bg-secondary disabled:opacity-30"
              aria-label={
                "Move " +
                item.title +
                " up"
              }
              title="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={
                index ===
                siblingCount - 1
              }
              onClick={() =>
                moveItem(
                  "down"
                )
              }
              className="ls-focus-ring grid h-10 w-10 place-items-center rounded-xl text-primary hover:bg-secondary disabled:opacity-30"
              aria-label={
                "Move " +
                item.title +
                " down"
              }
              title="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActionContext(
                  context
                );
                setMoveOpen(
                  true
                );
              }}
              className="ls-focus-ring grid h-10 w-10 place-items-center rounded-xl text-primary hover:bg-secondary"
              aria-label={
                "Move " +
                item.title +
                " to another menu position"
              }
              title="Move to"
            >
              <MoveRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setRemoveTarget(
                  context
                );
                setActionContext(
                  null
                );
              }}
              className="ls-focus-ring grid h-10 w-10 place-items-center rounded-xl text-destructive hover:bg-rose-50"
              aria-label={
                "Remove " +
                item.title +
                " from menu"
              }
              title="Remove from menu"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setActionContext(
                  null
                )
              }
              className="ls-focus-ring grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close menu item actions"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(item.children ||
          []).map(
          (
            child,
            childIndex
          ) => (
            <Row
              key={
                child.id
              }
              item={
                child
              }
              level={
                level + 1
              }
              index={
                childIndex
              }
              siblingCount={
                (
                  item.children ||
                  []
                ).length
              }
              parentId={
                item.id
              }
            />
          )
        )}
      </>
    );
  }

  const busy =
    bootLoading ||
    loadingMenu;

  return (
    <main className="ls-page mx-auto max-w-[1200px] pb-40 md:pb-8">
      <div className="hidden md:block">
        <PageHeader
          eyebrow="Catalog"
          icon={MenuSquare}
          title="Menu Layout"
          description="Arrange what shoppers see in your website menus."
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void loadMenu(
                    currentDef,
                    true
                  )
                }
                disabled={
                  loadingMenu ||
                  syncing
                }
              >
                <RefreshCw
                  className={
                    "h-4 w-4 " +
                    (
                      loadingMenu
                        ? "animate-spin"
                        : ""
                    )
                  }
                />
                Reload
              </Button>

              <AsyncButton
                type="button"
                loading={
                  syncing
                }
                loadingLabel="Saving…"
                disabled={
                  !dirty ||
                  loadingMenu
                }
                onClick={() =>
                  void saveAndSync()
                }
              >
                Save Menu
              </AsyncButton>
            </div>
          }
        />
      </div>

      <section className="md:mt-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setMenuPickerOpen(
                true
              )
            }
            className="ls-focus-ring flex min-h-12 min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 text-left shadow-[0_4px_14px_rgba(38,51,95,0.04)]"
          >
            <span className="min-w-0">
              <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Editing
              </span>

              <span className="mt-0.5 block truncate text-sm font-bold text-heading">
                {
                  currentDef.label
                }
              </span>
            </span>

            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() =>
              void loadMenu(
                currentDef,
                true
              )
            }
            disabled={
              loadingMenu ||
              syncing
            }
            aria-label="Reload menu"
            title="Reload menu"
            className="md:hidden"
          >
            <RefreshCw
              className={
                "h-4 w-4 " +
                (
                  loadingMenu
                    ? "animate-spin"
                    : ""
                )
              }
            />
          </Button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <div className="text-xs font-semibold text-muted-foreground">
            {dirty
              ? "Unsaved changes"
              : "All changes saved"}
          </div>

          <div className="text-xs font-semibold text-muted-foreground">
            {items.length}{" "}
            top-level item
            {items.length ===
            1
              ? ""
              : "s"}
          </div>
        </div>
      </section>

      <section className="mt-3 overflow-hidden rounded-2xl border border-border bg-card md:mt-4">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-heading">
              Your menu
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap ⋮ to move or remove an item.
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() =>
              openAdd()
            }
            className="hidden md:inline-flex"
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>

        {busy ? (
          <MenuSkeleton />
        ) : items.length ===
          0 ? (
          <EmptyState
            icon={MenuSquare}
            title="This menu is empty"
            description="Add a page, category or custom link."
            action={
              <Button
                type="button"
                onClick={() =>
                  openAdd()
                }
              >
                <Plus className="h-4 w-4" />
                Add menu item
              </Button>
            }
          />
        ) : (
          <div>
            {items.map(
              (
                item,
                index
              ) => (
                <Row
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                  level={0}
                  index={
                    index
                  }
                  siblingCount={
                    items.length
                  }
                  parentId={
                    null
                  }
                />
              )
            )}
          </div>
        )}

        {!busy &&
        items.length >
          0 ? (
          <div className="border-t border-border p-3 md:hidden">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() =>
                openAdd()
              }
            >
              <Plus className="h-4 w-4" />
              Add Menu Item
            </Button>
          </div>
        ) : null}
      </section>

      {dirty ? (
        <div className="fixed inset-x-3 bottom-[calc(5.1rem+var(--ls-safe-area-bottom))] z-[55] md:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_16px_40px_rgba(38,51,95,0.18)] backdrop-blur-xl">
            <div className="min-w-0 flex-1 px-1">
              <div className="text-xs font-bold text-heading">
                Unsaved changes
              </div>
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                Save to update your website.
              </div>
            </div>

            <AsyncButton
              type="button"
              loading={
                syncing
              }
              loadingLabel="Saving…"
              disabled={
                loadingMenu
              }
              onClick={() =>
                void saveAndSync()
              }
            >
              Save Menu
            </AsyncButton>
          </div>
        </div>
      ) : null}

      <BottomSheet
        open={
          menuPickerOpen
        }
        popupClassName="md:mx-auto md:max-w-xl"
        onOpenChange={
          setMenuPickerOpen
        }
        title="Choose menu"
        description="Select the part of your website you want to arrange."
      >
        <div className="space-y-2">
          {MENUS.map(
            (menu) => {
              const active =
                menu.key ===
                menuKey;

              return (
                <button
                  key={
                    menu.key
                  }
                  type="button"
                  onClick={() =>
                    requestMenuChange(
                      menu.key
                    )
                  }
                  className={
                    "ls-focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left " +
                    (
                      active
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:bg-muted"
                    )
                  }
                >
                  <span className="text-sm font-bold text-heading">
                    {
                      menu.label
                    }
                  </span>

                  {active ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : null}
                </button>
              );
            }
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        open={addOpen}
        onOpenChange={
          setAddOpen
        }
        popupClassName="md:mx-auto md:max-w-3xl"
        title="Add Menu Item"
        description="Choose what you want to add."
      >
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                value:
                  "category",
                label:
                  "Category",
                icon:
                  FolderTree,
              },
              {
                value:
                  "page",
                label:
                  "Page",
                icon:
                  FileText,
              },
              {
                value:
                  "custom",
                label:
                  "Link",
                icon:
                  Link2,
              },
            ] as const
          ).map(
            (tab) => {
              const Icon =
                tab.icon;

              const active =
                addTab ===
                tab.value;

              return (
                <button
                  key={
                    tab.value
                  }
                  type="button"
                  onClick={() => {
                    setAddTab(
                      tab.value
                    );
                    setAddSearch(
                      ""
                    );
                  }}
                  className={
                    "ls-focus-ring flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-bold " +
                    (
                      active
                        ? "border-primary bg-secondary text-secondary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {
                    tab.label
                  }
                </button>
              );
            }
          )}
        </div>

        {addTab !==
        "custom" ? (
          <>
            <div className="relative mt-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={
                  addSearch
                }
                onChange={(
                  event
                ) =>
                  setAddSearch(
                    event.target.value
                  )
                }
                placeholder={
                  addTab ===
                  "category"
                    ? "Search categories"
                    : "Search pages"
                }
                className="pl-10"
              />
            </div>

            <div className="mt-3 max-h-[44dvh] overflow-y-auto overscroll-contain rounded-xl border border-border">
              {(addTab ===
              "category"
                ? filteredCats
                : filteredPages
              ).length ===
              0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No matches found.
                </div>
              ) : addTab ===
                "category" ? (
                filteredCats.map(
                  (
                    category
                  ) => (
                    <button
                      key={
                        category.id
                      }
                      type="button"
                      onClick={() =>
                        addCategory(
                          category.id
                        )
                      }
                      className="ls-focus-ring flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-3 text-left last:border-b-0 hover:bg-muted"
                    >
                      <span className="truncate text-sm font-semibold text-foreground">
                        {
                          category.name
                        }
                      </span>

                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  )
                )
              ) : (
                filteredPages.map(
                  (page) => (
                    <button
                      key={
                        page.id
                      }
                      type="button"
                      onClick={() =>
                        addPageById(
                          page.id
                        )
                      }
                      className="ls-focus-ring flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-3 text-left last:border-b-0 hover:bg-muted"
                    >
                      <span className="truncate text-sm font-semibold text-foreground">
                        {
                          page.name
                        }
                      </span>

                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  )
                )
              )}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Name
              </label>

              <Input
                value={
                  custom.title
                }
                onChange={(
                  event
                ) =>
                  setCustom(
                    (
                      current
                    ) => ({
                      ...current,
                      title:
                        event.target.value,
                    })
                  )
                }
                placeholder="Example: Size Guide"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-heading">
                Link
              </label>

              <Input
                value={
                  custom.url
                }
                onChange={(
                  event
                ) =>
                  setCustom(
                    (
                      current
                    ) => ({
                      ...current,
                      url:
                        event.target.value,
                    })
                  )
                }
                placeholder="https://..."
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={
                !custom.title.trim() ||
                !custom.url.trim()
              }
              onClick={
                addCustom
              }
            >
              Add to Menu
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={moveOpen}
        popupClassName="md:mx-auto md:max-w-xl"
        onOpenChange={(
          open
        ) => {
          setMoveOpen(
            open
          );

          if (!open) {
            setActionContext(
              null
            );
          }
        }}
        title={
          actionContext
            ? "Move " +
              actionContext
                .item.title
            : "Move item"
        }
        description="Choose where this item should appear."
      >
        <div className="max-h-[55dvh] overflow-y-auto overscroll-contain rounded-xl border border-border">
          {moveTargets.map(
            (target) => {
              const active =
                target.id ===
                actionContext
                  ?.parentId;

              return (
                <button
                  key={
                    target.id ||
                    "root"
                  }
                  type="button"
                  onClick={() =>
                    moveItemTo(
                      target.id
                    )
                  }
                  className={
                    "ls-focus-ring flex min-h-12 w-full items-center justify-between gap-3 border-b border-border px-3 text-left last:border-b-0 " +
                    (
                      active
                        ? "bg-secondary"
                        : "bg-card hover:bg-muted"
                    )
                  }
                >
                  <span
                    className="min-w-0 truncate text-sm font-semibold text-foreground"
                    style={{
                      paddingLeft:
                        Math.min(
                          target.depth *
                            14,
                          42
                        ),
                    }}
                  >
                    {
                      target.label
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
      </BottomSheet>

      <ConfirmDialog
        open={
          removeTarget !==
          null
        }
        onOpenChange={(
          open
        ) => {
          if (!open) {
            setRemoveTarget(
              null
            );
          }
        }}
        title="Remove menu item?"
        description={
          removeTarget
            ? "Remove “" +
              removeTarget
                .item.title +
              "” from this menu? This does not delete the page or category."
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={
          confirmRemove
        }
      />

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={(
          open
        ) => {
          setDiscardOpen(
            open
          );

          if (!open) {
            setPendingMenuKey(
              null
            );
          }
        }}
        title="Discard unsaved changes?"
        description="Your current menu changes have not been saved."
        confirmLabel="Discard changes"
        destructive
        onConfirm={
          confirmDiscard
        }
      />
    </main>
  );
}
