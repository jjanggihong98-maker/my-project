import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import fixture from "@/docs/specs/ui-spec-builder-mvp/fixtures/notification-card.json";
import { parseDraft } from "@/features/draft";

import { StructurePanel } from "./structure-panel";

function rootOf() {
  const result = parseDraft(JSON.stringify(fixture));
  if (!result.ok) throw new Error("fixture must parse");
  return result.root;
}

test("트리의 모든 노드가 목록에 보이고, 안쪽 노드도 바로 고를 수 있다", () => {
  const dispatch = vi.fn();
  render(
    <StructurePanel
      root={rootOf()}
      selectedId="screen"
      dispatch={dispatch}
    />
  );

  expect(screen.getAllByRole("button")).toHaveLength(24);

  fireEvent.click(screen.getByRole("button", { name: /title_text/ }));

  expect(dispatch).toHaveBeenCalledWith({
    type: "select",
    selection: { selectedId: "title_text", scopeId: "content_text_group" },
  });
});

test("선택된 노드는 선택 표시가 된다", () => {
  render(
    <StructurePanel root={rootOf()} selectedId="left_button" dispatch={vi.fn()} />
  );

  expect(screen.getByRole("button", { name: /^left_button \(Frame\)/ })).toHaveAttribute(
    "aria-current",
    "true"
  );
  expect(screen.getByRole("button", { name: /^left_button_label \(Text\)/ })).toHaveAttribute(
    "aria-current",
    "false"
  );
});
