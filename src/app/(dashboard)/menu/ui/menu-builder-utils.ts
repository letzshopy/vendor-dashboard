"use client";

export type MenuItemNode = {
  id: string;
  type: "page" | "category" | "custom";
  title: string;
  url?: string;
  refId?: number;
  children: MenuItemNode[];
};

export type MoveTarget = {
  id: string | null;
  label: string;
  depth: number;
};

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function deepClone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}
export function getChildrenById(
  nodes: MenuItemNode[],
  id: string | null
): MenuItemNode[] {
  if (id === null) return nodes;

  function walk(items: MenuItemNode[]): MenuItemNode[] | null {
    for (const item of items) {
      if (item.id === id) return item.children || [];
      const found = walk(item.children || []);
      if (found) return found;
    }
    return null;
  }

  return walk(nodes) || [];
}
function normalizeUrl(url: string) {
  try {
    const u = new URL(url, "http://fake");
    let p = u.pathname || "/";
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  } catch {
    let p = url || "/";
    if (!p.startsWith("/")) {
      try {
        const u = new URL(p);
        p = u.pathname || "/";
      } catch {
        // ignore
      }
    }
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }
}

function classifyType(url?: string, title?: string): MenuItemNode["type"] {
  const u = normalizeUrl(url || "");
  const t = (title || "").toLowerCase();

  if (/product-category|\/category\//.test(u)) return "category";

  const known = [
    "/",
    "/shop",
    "/about",
    "/contact",
    "/cart",
    "/my-account",
    "/privacy-policy",
    "/terms",
  ];

  if (known.includes(u)) return "page";

  try {
    const path = new URL(u, "http://x").pathname;
    if (known.includes(path)) return "page";
  } catch {
    // ignore
  }

  if (
    ["home", "about", "contact", "cart", "account", "shop", "privacy", "terms"].some(
      (k) => t.includes(k)
    )
  ) {
    return "page";
  }

  return "custom";
}

/**
 * IMPORTANT:
 * IDs are rebuilt from tree path, not random.
 * Root items: 0, 1, 2
 * Child items: 1-0, 1-1
 * This keeps route IDs stable after reload.
 */
export function rebuildTreeIds(
  nodes: MenuItemNode[],
  parentPath = ""
): MenuItemNode[] {
  return (nodes || []).map((node, index) => {
    const pathId = parentPath ? `${parentPath}-${index}` : `${index}`;
    return {
      ...node,
      id: pathId,
      children: rebuildTreeIds(node.children || [], pathId),
    };
  });
}

export function toLocalTree(nodes: any[], parentPath = ""): MenuItemNode[] {
  return (nodes || []).map((n: any, index: number) => {
    const pathId = parentPath ? `${parentPath}-${index}` : `${index}`;

    return {
      id: pathId,
      type: classifyType(n.url, n.title),
      title: n.title || "",
      url: n.url || "",
      refId: n.refId,
      children: toLocalTree(n.children || [], pathId),
    };
  });
}

export function toWireTree(nodes: MenuItemNode[]): any[] {
  return (nodes || []).map((n) => ({
    title: n.title,
    url: n.url || "",
    children: n.children?.length ? toWireTree(n.children) : [],
  }));
}

export function findNodeById(
  nodes: MenuItemNode[],
  targetId: string
): MenuItemNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const found = findNodeById(node.children || [], targetId);
    if (found) return found;
  }
  return null;
}

function removeNodeInternal(
  nodes: MenuItemNode[],
  targetId: string
): { next: MenuItemNode[]; removed: MenuItemNode | null } {
  const next = deepClone(nodes);

  function walk(arr: MenuItemNode[]): MenuItemNode | null {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === targetId) {
        const removed = arr[i];
        arr.splice(i, 1);
        return removed;
      }

      const removed = walk(arr[i].children || []);
      if (removed) return removed;
    }
    return null;
  }

  const removed = walk(next);
  return { next, removed };
}

export function removeNodeById(
  nodes: MenuItemNode[],
  targetId: string
): { next: MenuItemNode[]; removed: MenuItemNode | null } {
  const { next, removed } = removeNodeInternal(nodes, targetId);
  return { next: rebuildTreeIds(next), removed };
}

function insertUnderParentInternal(
  nodes: MenuItemNode[],
  parentId: string | null,
  node: MenuItemNode
): MenuItemNode[] {
  const next = deepClone(nodes);

  if (!parentId) {
    next.push({ ...node, children: node.children || [] });
    return next;
  }

  function walk(arr: MenuItemNode[]): boolean {
    for (const item of arr) {
      if (item.id === parentId) {
        item.children = item.children || [];
        item.children.push({ ...node, children: node.children || [] });
        return true;
      }
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  walk(next);
  return next;
}

export function insertNodeUnderParent(
  nodes: MenuItemNode[],
  parentId: string | null,
  node: MenuItemNode
): MenuItemNode[] {
  const next = insertUnderParentInternal(nodes, parentId, node);
  return rebuildTreeIds(next);
}

export function reorderWithinParent(
  nodes: MenuItemNode[],
  parentId: string | null,
  index: number,
  dir: "up" | "down"
): MenuItemNode[] {
  const next = deepClone(nodes);

  const swapIn = (arr: MenuItemNode[]) => {
    const other = dir === "up" ? index - 1 : index + 1;
    if (index < 0 || other < 0 || index >= arr.length || other >= arr.length) {
      return;
    }
    [arr[index], arr[other]] = [arr[other], arr[index]];
  };

  if (!parentId) {
    swapIn(next);
    return rebuildTreeIds(next);
  }

  function walk(arr: MenuItemNode[]): boolean {
    for (const item of arr) {
      if (item.id === parentId) {
        item.children = item.children || [];
        swapIn(item.children);
        return true;
      }
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  walk(next);
  return rebuildTreeIds(next);
}

function isSameOrDescendant(targetId: string | null, sourceId: string) {
  if (!targetId) return false;
  return targetId === sourceId || targetId.startsWith(`${sourceId}-`);
}

export function moveNode(
  nodes: MenuItemNode[],
  sourceId: string,
  targetParentId: string | null
): MenuItemNode[] {
  if (isSameOrDescendant(targetParentId, sourceId)) return nodes;

  const { next, removed } = removeNodeInternal(nodes, sourceId);
  if (!removed) return rebuildTreeIds(next);

  const inserted = insertUnderParentInternal(next, targetParentId, {
    ...removed,
    children: removed.children || [],
  });

  return rebuildTreeIds(inserted);
}

export function flattenMoveTargets(
  nodes: MenuItemNode[],
  sourceId?: string
): MoveTarget[] {
  const out: MoveTarget[] = [{ id: null, label: "Main Menu", depth: 0 }];

  function walk(arr: MenuItemNode[], depth: number) {
    for (const item of arr) {
      if (!sourceId || !isSameOrDescendant(item.id, sourceId)) {
        out.push({
          id: item.id,
          label: item.title,
          depth,
        });
      }
      walk(item.children || [], depth + 1);
    }
  }

  walk(nodes, 0);
  return out;
}