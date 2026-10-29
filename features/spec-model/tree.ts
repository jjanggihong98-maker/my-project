import { flatten } from "./fields";
import type { Bounds, NodeKind, Point, SpecNode } from "./types";

export function findNode(root: SpecNode, id: string): SpecNode | undefined {
  return flatten(root).find((n) => n.id === id);
}

export function parentOf(root: SpecNode, id: string): SpecNode | undefined {
  return flatten(root).find((n) => n.children.some((c) => c.id === id));
}

/** outer 안에 inner가 tolerance 이내로 들어가는지 */
export function contains(outer: Bounds, inner: Bounds, tolerance = 0): boolean {
  return (
    inner[0] >= outer[0] - tolerance &&
    inner[1] >= outer[1] - tolerance &&
    inner[0] + inner[2] <= outer[0] + outer[2] + tolerance &&
    inner[1] + inner[3] <= outer[1] + outer[3] + tolerance
  );
}

export function containsPoint(bounds: Bounds, point: Point): boolean {
  return (
    point[0] >= bounds[0] &&
    point[0] <= bounds[0] + bounds[2] &&
    point[1] >= bounds[1] &&
    point[1] <= bounds[1] + bounds[3]
  );
}

export function area(bounds: Bounds): number {
  return bounds[2] * bounds[3];
}

function mapNode(
  node: SpecNode,
  id: string,
  update: (n: SpecNode) => SpecNode
): SpecNode {
  if (node.id === id) return update(node);
  return { ...node, children: node.children.map((c) => mapNode(c, id, update)) };
}

function shift(node: SpecNode, dx: number, dy: number): SpecNode {
  return {
    ...node,
    bounds: [node.bounds[0] + dx, node.bounds[1] + dy, node.bounds[2], node.bounds[3]],
    children: node.children.map((c) => shift(c, dx, dy)),
  };
}

function uniqueId(root: SpecNode, kind: NodeKind): string {
  const used = new Set(flatten(root).map((n) => n.id));
  let n = 1;
  while (used.has(`${kind}_${n}`)) n += 1;
  return `${kind}_${n}`;
}

/** 새 박스를 그 박스를 완전히 담는 가장 안쪽 노드의 자식으로 넣는다. 없으면 루트의 자식이다. */
export function addNode(
  root: SpecNode,
  kind: NodeKind,
  bounds: Bounds
): { root: SpecNode; id: string } {
  const id = uniqueId(root, kind);
  const created: SpecNode = {
    id,
    kind,
    bounds,
    values: {},
    children: [],
    ...(kind === "text" ? { text: "" } : {}),
  };

  function insert(node: SpecNode): SpecNode {
    const inner = node.children
      .filter((c) => c.kind === "frame" && contains(c.bounds, bounds))
      .sort((a, b) => area(a.bounds) - area(b.bounds))[0];
    if (!inner) return { ...node, children: [...node.children, created] };
    return {
      ...node,
      children: node.children.map((c) => (c.id === inner.id ? insert(c) : c)),
    };
  }

  return { root: insert(root), id };
}

/** 노드를 지우고 그 자식은 지운 노드의 자리(부모 밑)로 올린다. 루트는 지울 수 없다. */
export function deleteNode(root: SpecNode, id: string): SpecNode {
  if (root.id === id) return root;

  function remove(node: SpecNode): SpecNode {
    return {
      ...node,
      children: node.children.flatMap((c) =>
        c.id === id ? c.children : [remove(c)]
      ),
    };
  }
  return remove(root);
}

/** 노드와 그 자식을 함께 옮긴다. 화면 밖으로 나가지 않게 제한한다. */
export function moveNode(
  root: SpecNode,
  id: string,
  dx: number,
  dy: number
): SpecNode {
  const target = findNode(root, id);
  if (!target) return root;
  const [x, y, w, h] = target.bounds;
  const clampedDx = Math.min(Math.max(dx, -x), 1 - w - x);
  const clampedDy = Math.min(Math.max(dy, -y), 1 - h - y);
  return mapNode(root, id, (n) => shift(n, clampedDx, clampedDy));
}

export function resizeNode(root: SpecNode, id: string, bounds: Bounds): SpecNode {
  return mapNode(root, id, (n) => ({ ...n, bounds }));
}

export function setNodeValue(
  root: SpecNode,
  id: string,
  key: string,
  value: string
): SpecNode {
  return mapNode(root, id, (n) => ({ ...n, values: { ...n.values, [key]: value } }));
}

export function setNodeText(root: SpecNode, id: string, text: string): SpecNode {
  return mapNode(root, id, (n) => ({ ...n, text }));
}
