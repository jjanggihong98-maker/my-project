import { describe, expect, test } from "vitest";

import fixture from "@/docs/specs/ui-spec-builder-mvp/fixtures/notification-card.json";
import { parseDraft } from "@/features/draft";
import { findNode, progress } from "@/features/spec-model";
import {
  canExport,
  initialWorkspace,
  workspaceReducer,
  type WorkspaceAction,
  type WorkspaceState,
} from "@/features/workspace";

const image = { dataUrl: "data:image/png;base64,AAAA", width: 361, height: 188, name: "card.png" };

function run(...actions: WorkspaceAction[]): WorkspaceState {
  return actions.reduce(workspaceReducer, initialWorkspace);
}

function accepted(): WorkspaceAction {
  const result = parseDraft(JSON.stringify(fixture));
  if (!result.ok) throw new Error("fixture must parse");
  return { type: "draftAccepted", root: result.root };
}

describe("작업 상태", () => {
  test("초안을 받아들이면 루트가 선택된다", () => {
    const state = run({ type: "imageLoaded", image }, accepted());

    expect(state.selection).toEqual({ selectedId: "screen", scopeId: "screen" });
  });

  test("새 스크린샷을 올리면 이전 트리와 입력한 값이 사라진다", () => {
    const before = run(
      { type: "imageLoaded", image },
      accepted(),
      { type: "setValue", id: "screen", key: "colors", value: "bg-base" }
    );
    const after = workspaceReducer(before, {
      type: "imageLoaded",
      image: { ...image, name: "other.png" },
    });

    expect(after.root).toBeUndefined();
    expect(after.image?.name).toBe("other.png");
  });

  test("선택한 노드를 삭제하면 부모가 선택되고 자식은 부모 밑으로 올라간다", () => {
    const state = run(
      { type: "imageLoaded", image },
      accepted(),
      { type: "select", selection: { selectedId: "header_row", scopeId: "notification_card" } },
      { type: "deleteSelected" }
    );

    expect(state.selection?.selectedId).toBe("notification_card");
    const card = findNode(state.root!, "notification_card")!;
    expect(card.children.map((c) => c.id)).toContain("app_icon");
  });

  test("박스를 추가하면 새 노드가 선택된다", () => {
    const state = run(
      { type: "imageLoaded", image },
      accepted(),
      { type: "addBox", kind: "shape", bounds: [0.2, 0.3, 0.05, 0.05] }
    );

    expect(findNode(state.root!, state.selection!.selectedId)?.kind).toBe("shape");
  });
});

describe("내보내기 가능 여부", () => {
  test("초안이 없으면 내보낼 수 없고, 초안이 있으면 값을 하나도 입력하지 않아도 내보낼 수 있다", () => {
    const withoutDraft = run({ type: "imageLoaded", image });
    const withDraft = run({ type: "imageLoaded", image }, accepted());

    expect(canExport(withoutDraft)).toBe(false);
    expect(canExport(withDraft)).toBe(true);
    expect(progress(withDraft.root!).filled).toBe(0);
  });
});
