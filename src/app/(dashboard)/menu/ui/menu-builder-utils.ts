"use client";

export type MenuItemNode = {
  id: string;
  title: string;
  type: "page" | "category" | "custom";
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

export function normalizeUrl(url: string) {
  try {
    const u = new URL(url, "http://fake");
    let p = u.pathname || "/";
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  } catch {
    let p = url || "/";
    if (p.length > 1) p = p.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }
}

export function findNodeById(
  nodes: MenuItemNode[],
  id: string
): MenuItemNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeById(node.children || [], id);
    if (found) return found;
  }
  return null;
}

export function getChildrenById(
  nodes: MenuItemNode[],
  id: string | null
): MenuItemNode[] {
  if (!id) return nodes;
  const node = findNodeById(nodes, id);
  return node?.children || [];
}

export function removeNodeById(
  nodes: MenuItemNode[],
  id: string
): { next: MenuItemNode[]; removed: MenuItemNode | null } {
  const next = deepClone(nodes);

  function walk(arr: MenuItemNode[]): MenuItemNode | null {
    const idx = arr.findIndex((x) => x.id === id);
    if (idx >= 0) {
      const [removed] = arr.splice(idx, 1);
      return removed;
    }
    for (const node of arr) {
      const removed = walk(node.children);
      if (removed) return removed;
    }
    return null;
  }

  const removed = walk(next);
  return { next, removed };
}

export function insertNodeUnderParent(
  nodes: MenuItemNode[],
  parentId: string | null,
  node: MenuItemNode
): MenuItemNode[] {
  const next = deepClone(nodes);

  if (!parentId) {
    next.push(node);
    return next;
  }

  function walk(arr: MenuItemNode[]): boolean {
    for (const item of arr) {
      if (item.id === parentId) {
        item.children = item.children || [];
        item.children.push(node);
        return true;
      }
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  walk(next);
  return next;
}

export function updateNodeById(
  nodes: MenuItemNode[],
  id: string,
  patch: Partial<MenuItemNode>
): MenuItemNode[] {
  const next = deepClone(nodes);

  function walk(arr: MenuItemNode[]) {
    for (const item of arr) {
      if (item.id === id) {
        Object.assign(item, patch);
        return true;
      }
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  walk(next);
  return next;
}

export function reorderWithinParent(
  nodes: MenuItemNode[],
  parentId: string | null,
  index: number,
  dir: "up" | "down"
): MenuItemNode[] {
  const next = deepClone(nodes);
  const siblings = getChildrenById(next, parentId);
  const swapWith = dir === "up" ? index - 1 : index + 1;

  if (swapWith < 0 || swapWith >= siblings.length) return next;

  [siblings[index], siblings[swapWith]] = [siblings[swapWith], siblings[index]];
  return next;
}

export function getDepthOfNode(
  nodes: MenuItemNode[],
  id: string,
  depth = 0
): number {
  for (const node of nodes) {
    if (node.id === id) return depth;
    const childDepth = getDepthOfNode(node.children || [], id, depth + 1);
    if (childDepth !== -1) return childDepth;
  }
  return -1;
}

export function isDescendant(
  nodes: MenuItemNode[],
  ancestorId: string,
  targetId: string
): boolean {
  const ancestor = findNodeById(nodes, ancestorId);
  if (!ancestor) return false;

  function walk(arr: MenuItemNode[]): boolean {
    for (const item of arr) {
      if (item.id === targetId) return true;
      if (walk(item.children || [])) return true;
    }
    return false;
  }

  return walk(ancestor.children || []);
}

export function moveNode(
  nodes: MenuItemNode[],
  nodeId: string,
  targetParentId: string | null,
  maxDepth = 2
): MenuItemNode[] {
  if (targetParentId === nodeId) return nodes;
  if (targetParentId && isDescendant(nodes, nodeId, targetParentId)) return nodes;

  const { next, removed } = removeNodeById(nodes, nodeId);
  if (!removed) return nodes;

  const targetDepth = targetParentId
    ? getDepthOfNode(next, targetParentId)
    : -1;

  if (targetDepth >= maxDepth) return nodes;

  return insertNodeUnderParent(next, targetParentId, removed);
}

export function flattenMoveTargets(
  nodes: MenuItemNode[],
  excludeId?: string
): MoveTarget[] {
  const out: MoveTarget[] = [{ id: null, label: "Root Level", depth: 0 }];

  function walk(arr: MenuItemNode[], depth: number) {
    for (const item of arr) {
      if (item.id !== excludeId) {
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

export function classifyType(
  url?: string,
  title?: string,
  pageUrlSet?: Set<string>
): MenuItemNode["type"] {
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

  if (pageUrlSet?.has(u) || known.includes(u)) return "page";

  if (
    ["home", "about", "contact", "cart", "account", "shop", "privacy", "terms"].some(
      (k) => t.includes(k)
    )
  ) {
    return "page";
  }

  return "custom";
}

export function toLocalTree(nodes: any[], pageUrlSet?: Set<string>): MenuItemNode[] {
  return (nodes || []).map((n: any) => ({
    id: uid(),
    title: n.title || "",
    type: classifyType(n.url, n.title, pageUrlSet),
    url: n.url || "",
    refId: n.refId,
    children: toLocalTree(n.children || [], pageUrlSet),
  }));
}

export function toWireTree(nodes: MenuItemNode[]): any[] {
  return nodes.map((n) => ({
    title: n.title,
    url: n.url || "",
    children: n.children?.length ? toWireTree(n.children) : [],
  }));
}