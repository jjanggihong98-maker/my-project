import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import type { SpecNode } from "@/features/spec-model";

import { NodePanel } from "./node-panel";

function frame(extra: Partial<SpecNode> = {}): SpecNode {
  return { id: "card", kind: "frame", bounds: [0, 0, 1, 1], values: {}, children: [], ...extra };
}

test("기본 필드 아래의 필드 추가 버튼으로 없는 분류를 골라 추가할 수 있다", () => {
  const dispatch = vi.fn();
  render(<NodePanel node={frame()} number={2} isRoot={false} dispatch={dispatch} />);

  expect(screen.queryByLabelText("타이포 typography")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "필드 추가" }));
  fireEvent.click(screen.getByRole("button", { name: "타이포 typography" }));

  expect(dispatch).toHaveBeenCalledWith({ type: "addField", id: "card", key: "typography" });
});

test("추가한 필드는 기본 필드와 같은 입력 양식으로 보이고 제거할 수 있다", () => {
  const dispatch = vi.fn();
  render(
    <NodePanel
      node={frame({ extraFields: ["typography"] })}
      number={2}
      isRoot={false}
      dispatch={dispatch}
    />
  );

  const input = screen.getByLabelText("타이포 typography");
  fireEvent.change(input, { target: { value: "body-md" } });
  expect(dispatch).toHaveBeenCalledWith({
    type: "setValue",
    id: "card",
    key: "typography",
    value: "body-md",
  });

  fireEvent.click(screen.getByRole("button", { name: "타이포 typography 필드 제거" }));
  expect(dispatch).toHaveBeenCalledWith({ type: "removeField", id: "card", key: "typography" });
});

test("추가할 분류가 없으면 필드 추가 버튼이 보이지 않는다", () => {
  render(
    <NodePanel
      node={frame({ extraFields: ["typography"] })}
      number={2}
      isRoot={false}
      dispatch={vi.fn()}
    />
  );

  expect(screen.queryByRole("button", { name: "필드 추가" })).not.toBeInTheDocument();
});
