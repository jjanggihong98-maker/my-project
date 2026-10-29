import { area, containsPoint, findNode, parentOf } from "./tree";
import type { Point, Selection, SpecNode } from "./types";

/** 범위의 자식 중 점을 담은 가장 작은 박스를 고른다. 없으면 범위 자신이다. */
export function pick(root: SpecNode, scopeId: string, point: Point): string {
  const scope = findNode(root, scopeId);
  if (!scope) return root.id;
  const hit = scope.children
    .filter((c) => containsPoint(c.bounds, point))
    .sort((a, b) => area(a.bounds) - area(b.bounds))[0];
  return hit ? hit.id : scope.id;
}

/**
 * 화면의 한 점에서 노드를 고른다. 현재 범위가 그 점을 담지 못하면 담을 때까지 조상으로 올라간 뒤
 * 그 범위의 자식 중에서 고른다. 그래서 다른 가지의 영역을 눌러도 바로 이동한다.
 */
export function locate(root: SpecNode, scopeId: string, point: Point): Selection {
  let scope = findNode(root, scopeId) ?? root;
  while (!containsPoint(scope.bounds, point)) {
    const parent = parentOf(root, scope.id);
    if (!parent) break;
    scope = parent;
  }
  return { selectedId: pick(root, scope.id, point), scopeId: scope.id };
}

/** 선택한 노드의 자식 영역으로 들어간다. 자식이 없으면 그대로다. */
export function enter(root: SpecNode, selection: Selection, point?: Point): Selection {
  const selected = findNode(root, selection.selectedId);
  if (!selected || selected.children.length === 0) return selection;
  const target = point ? pick(root, selected.id, point) : selected.children[0].id;
  return {
    selectedId: target === selected.id ? selected.children[0].id : target,
    scopeId: selected.id,
  };
}

/** 부모로 돌아간다. */
export function exit(root: SpecNode, selection: Selection): Selection {
  const parent = parentOf(root, selection.selectedId);
  if (!parent) return selection;
  return {
    selectedId: parent.id,
    scopeId: parentOf(root, parent.id)?.id ?? parent.id,
  };
}

/** 같은 부모의 다음(또는 이전) 형제로 순환 이동한다. */
export function nextSibling(
  root: SpecNode,
  selection: Selection,
  step: 1 | -1 = 1
): Selection {
  const parent = parentOf(root, selection.selectedId);
  if (!parent) return selection;
  const siblings = parent.children;
  const index = siblings.findIndex((c) => c.id === selection.selectedId);
  const next = siblings[(index + step + siblings.length) % siblings.length];
  return { selectedId: next.id, scopeId: parent.id };
}
