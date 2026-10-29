import { describe, expect, test } from "vitest";

import {
  addNode,
  deleteNode,
  enter,
  exit,
  findNode,
  locate,
  moveNode,
  nextSibling,
  pick,
  progress,
  setNodeValue,
  type SpecNode,
} from "@/features/spec-model";

function node(
  id: string,
  kind: SpecNode["kind"],
  bounds: SpecNode["bounds"],
  children: SpecNode[] = [],
  extra: Partial<SpecNode> = {}
): SpecNode {
  return { id, kind, bounds, children, values: {}, ...extra };
}

// screen ⊃ card ⊃ (header, body), screen ⊃ footer
function sample(): SpecNode {
  return node("screen", "frame", [0, 0, 1, 1], [
    node("card", "frame", [0.1, 0.1, 0.8, 0.6], [
      node("header", "frame", [0.15, 0.15, 0.7, 0.1], [
        node("title", "text", [0.15, 0.15, 0.2, 0.05], [], { text: "Title" }),
      ]),
      node("body", "frame", [0.15, 0.3, 0.7, 0.3]),
    ]),
    node("footer", "frame", [0.1, 0.8, 0.8, 0.1]),
  ]);
}

describe("입력 현황", () => {
  test("노드 종류별로 입력할 수 있는 필드를 합쳐 전체로 센다", () => {
    const root = node("screen", "frame", [0, 0, 1, 1], [
      node("t", "text", [0, 0, 0.5, 0.5], [], { text: "hi" }),
    ]);

    // frame 4(layout, colors, borders, shadows) + text 3(layout, colors, typography)
    expect(progress(root)).toEqual({ filled: 0, total: 7 });
  });

  test("값을 적은 필드만 입력으로 세고 공백만 있는 필드는 세지 않는다", () => {
    let root = node("screen", "frame", [0, 0, 1, 1]);
    root = setNodeValue(root, "screen", "layout", "space-2");
    root = setNodeValue(root, "screen", "colors", "   ");

    expect(progress(root)).toEqual({ filled: 1, total: 4 });
  });
});

describe("박스 추가", () => {
  test("다른 박스 안에 완전히 들어가면 가장 안쪽 박스의 자식이 된다", () => {
    const { root, id } = addNode(sample(), "shape", [0.2, 0.32, 0.1, 0.1]);

    expect(findNode(root, id)).toBeDefined();
    const body = findNode(root, "body")!;
    expect(body.children.map((c) => c.id)).toContain(id);
  });

  test("어느 박스에도 들어가지 않으면 루트의 자식이 된다", () => {
    const { root, id } = addNode(sample(), "icon", [0.05, 0.05, 0.9, 0.9]);

    expect(root.children.map((c) => c.id)).toContain(id);
  });

  test("새 id는 기존 id와 겹치지 않는다", () => {
    const first = addNode(sample(), "frame", [0.12, 0.82, 0.1, 0.05]);
    const second = addNode(first.root, "frame", [0.3, 0.82, 0.1, 0.05]);

    expect(second.id).not.toBe(first.id);
  });
});

describe("박스 삭제", () => {
  test("삭제한 노드의 자식은 삭제한 노드의 부모 밑으로 올라간다", () => {
    const root = deleteNode(sample(), "header");

    const card = findNode(root, "card")!;
    expect(card.children.map((c) => c.id)).toEqual(["title", "body"]);
  });

  test("루트는 삭제되지 않는다", () => {
    const root = sample();

    expect(deleteNode(root, "screen")).toBe(root);
  });
});

describe("박스 이동", () => {
  test("노드를 옮기면 자식도 같은 거리만큼 함께 움직이고 입력한 값은 유지된다", () => {
    let root = setNodeValue(sample(), "header", "spacing", "space-2");
    root = moveNode(root, "header", 0.05, 0.1);

    const header = findNode(root, "header")!;
    const title = findNode(root, "title")!;
    expect(header.bounds[0]).toBeCloseTo(0.2);
    expect(header.bounds[1]).toBeCloseTo(0.25);
    expect(title.bounds[0]).toBeCloseTo(0.2);
    expect(title.bounds[1]).toBeCloseTo(0.25);
    expect(header.values.spacing).toBe("space-2");
  });
});

describe("영역 선택", () => {
  test("현재 범위의 자식 중 점을 담은 가장 작은 박스를 고른다", () => {
    expect(pick(sample(), "screen", [0.5, 0.5])).toBe("card");
    expect(pick(sample(), "card", [0.5, 0.5])).toBe("body");
  });

  test("점을 담은 자식이 없으면 범위 자신을 고른다", () => {
    expect(pick(sample(), "screen", [0.01, 0.01])).toBe("screen");
  });

  test("범위 밖의 영역을 누르면 점을 담는 조상까지 올라가 그 영역을 고른다", () => {
    const root = sample();

    // body 안쪽(scope=body 형제들)에서 다른 가지인 footer를 누른다.
    expect(locate(root, "card", [0.5, 0.85])).toEqual({
      selectedId: "footer",
      scopeId: "screen",
    });
    // header 안쪽 범위에서 같은 카드 안의 body를 누른다.
    expect(locate(root, "header", [0.5, 0.45])).toEqual({
      selectedId: "body",
      scopeId: "card",
    });
    // 아무 박스에도 들어가지 않는 곳은 루트다.
    expect(locate(root, "header", [0.01, 0.01])).toEqual({
      selectedId: "screen",
      scopeId: "screen",
    });
  });

  test("범위 안을 누르면 범위를 유지한 채 그 안의 자식을 고른다", () => {
    expect(locate(sample(), "header", [0.2, 0.17])).toEqual({
      selectedId: "title",
      scopeId: "header",
    });
  });

  test("Enter는 자식으로, Shift+Enter는 부모로 이동한다", () => {
    const root = sample();
    const inside = enter(root, { selectedId: "card", scopeId: "screen" });

    expect(inside).toEqual({ selectedId: "header", scopeId: "card" });
    expect(exit(root, inside)).toEqual({ selectedId: "card", scopeId: "screen" });
  });

  test("자식이 없는 노드에서 Enter를 눌러도 선택은 그대로다", () => {
    const sel = { selectedId: "body", scopeId: "card" };

    expect(enter(sample(), sel)).toEqual(sel);
  });

  test("Tab은 형제 노드로 순환 이동한다", () => {
    const root = sample();

    expect(nextSibling(root, { selectedId: "card", scopeId: "screen" })).toEqual({
      selectedId: "footer",
      scopeId: "screen",
    });
    expect(nextSibling(root, { selectedId: "footer", scopeId: "screen" })).toEqual({
      selectedId: "card",
      scopeId: "screen",
    });
  });
});
